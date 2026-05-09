"""OCR + extração estruturada de matrículas.

Estratégia anti-desperdício:
  - SÓ processa amostra inicial (primeiros N com PDF baixado) + matches em watchlists ativas.
  - Idempotente: ocr_text IS NULL (não processado) vs '' (processado, sem texto) vs '...' (ok).

Fluxo:
  1. pdfplumber lê texto do PDF (a maioria das matrículas tem texto embutido).
  2. Se vazio, marca '' e segue (sem chamar LLM).
  3. Texto -> Groq LLM -> JSON com donos atual/anteriores, ano construção, vendas anteriores.
"""
from __future__ import annotations

import json
import os
from typing import Optional

import pdfplumber
from psycopg.rows import dict_row

from ._db import conn

INITIAL_SAMPLE_SIZE = int(os.environ.get("OCR_INITIAL_SAMPLE_SIZE", "50"))
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
MAX_INPUT_CHARS = int(os.environ.get("OCR_MAX_INPUT_CHARS", "20000"))


_PROMPT_SYSTEM = (
    "Você é um extrator de dados estruturados de matrículas imobiliárias brasileiras. "
    "Sempre responda JSON válido conforme o schema solicitado. "
    "Use null para campos ausentes."
)

_PROMPT_USER_TEMPLATE = """Da matrícula abaixo, extraia em JSON:

{{
  "donos_atuais": [{{"nome": "string", "cpf_cnpj": "string|null"}}],
  "donos_anteriores": [{{"nome": "string", "cpf_cnpj": "string|null", "data_aquisicao": "YYYY-MM-DD|null", "data_alienacao": "YYYY-MM-DD|null"}}],
  "ano_construcao_estimado": int|null,
  "vendas_anteriores": [{{"data": "YYYY-MM-DD|null", "valor": float|null, "vendedor": "string|null", "comprador": "string|null"}}]
}}

Regras:
- "donos_atuais" = quem é proprietário hoje (último registro de transferência).
- "donos_anteriores" = quem JÁ FOI proprietário (excluindo os atuais).
- "ano_construcao_estimado" = ano da averbação de construção (ou habite-se), se houver.
- "vendas_anteriores" = transferências por compra/venda registradas (R-X), em ordem cronológica.
- Apenas o que estiver explícito no texto. Não invente.

TEXTO DA MATRÍCULA:
{texto}
"""


def _extract_text(pdf_path: str) -> str:
    try:
        with pdfplumber.open(pdf_path) as pdf:
            chunks = []
            for page in pdf.pages:
                txt = page.extract_text() or ""
                if txt.strip():
                    chunks.append(txt)
            return "\n\n".join(chunks).strip()
    except Exception:
        return ""


async def _llm_extract(text: str) -> dict:
    from groq import AsyncGroq
    client = AsyncGroq(api_key=os.environ["GROQ_API_KEY"])
    user_prompt = _PROMPT_USER_TEMPLATE.format(texto=text[:MAX_INPUT_CHARS])
    resp = await client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": _PROMPT_SYSTEM},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0,
    )
    raw = resp.choices[0].message.content or "{}"
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


async def run_ocr(limit: int = 10) -> dict:
    ok = no_text = failed = 0

    with conn() as c:
        with c.cursor(row_factory=dict_row) as cur:
            # Selecionados: amostra inicial (primeiros N com PDF baixado) OU watchlist ativa.
            # Watchlist match completo é Fase 5; aqui só EXISTS na tabela serve como gate.
            cur.execute(
                """
                WITH initial_sample AS (
                    SELECT property_id
                    FROM matricula_extracts
                    WHERE pdf_path IS NOT NULL
                    ORDER BY created_at
                    LIMIT %s
                )
                SELECT m.property_id, m.pdf_path
                FROM matricula_extracts m
                WHERE m.ocr_text IS NULL
                  AND m.pdf_path IS NOT NULL
                  AND (
                    m.property_id IN (SELECT property_id FROM initial_sample)
                    OR EXISTS (
                        SELECT 1
                        FROM watchlists w
                        JOIN properties p ON p.id = m.property_id
                        LEFT JOIN neighborhoods nb
                          ON nb.uf = p.uf
                         AND nb.cidade = p.cidade
                         AND nb.bairro = p.bairro
                        WHERE w.active
                          AND (w.filters->>'uf' IS NULL OR p.uf = upper(w.filters->>'uf'))
                          AND (w.filters->>'cidade' IS NULL OR p.cidade ILIKE w.filters->>'cidade')
                          AND (w.filters->>'bairro' IS NULL OR p.bairro ILIKE w.filters->>'bairro')
                          AND (
                              COALESCE(w.filters->>'tipo', w.filters->>'tipo_imovel') IS NULL
                              OR p.tipo_imovel ILIKE COALESCE(w.filters->>'tipo', w.filters->>'tipo_imovel')
                          )
                          AND (
                              w.filters->>'preco_max' IS NULL
                              OR (
                                  w.filters->>'preco_max' ~ '^[0-9]+(\\.[0-9]+)?$'
                                  AND p.preco_venda <= (w.filters->>'preco_max')::numeric
                              )
                          )
                          AND (
                              w.filters->>'desconto_min' IS NULL
                              OR (
                                  w.filters->>'desconto_min' ~ '^[0-9]+(\\.[0-9]+)?$'
                                  AND p.desconto_percentual >= (w.filters->>'desconto_min')::numeric
                              )
                          )
                          AND (
                              w.filters->>'score_bairro_min' IS NULL
                              OR (
                                  w.filters->>'score_bairro_min' ~ '^[0-9]+$'
                                  AND nb.score >= (w.filters->>'score_bairro_min')::int
                              )
                          )
                    )
                  )
                ORDER BY m.created_at
                LIMIT %s
                """,
                (INITIAL_SAMPLE_SIZE, limit),
            )
            rows = cur.fetchall()

        if not rows:
            return {"total": 0, "ok": 0, "no_text": 0, "failed": 0}

        for row in rows:
            text = _extract_text(row["pdf_path"])

            if not text:
                with c.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE matricula_extracts
                        SET ocr_text = '', ocr_confidence = 0
                        WHERE property_id = %s
                        """,
                        (row["property_id"],),
                    )
                c.commit()
                no_text += 1
                continue

            try:
                data = await _llm_extract(text)
            except Exception:
                failed += 1
                continue

            with c.cursor() as cur:
                cur.execute(
                    """
                    UPDATE matricula_extracts
                    SET ocr_text = %s,
                        ocr_confidence = 0.85,
                        donos_atuais = %s,
                        donos_anteriores = %s,
                        ano_construcao_estimado = %s,
                        vendas_anteriores = %s
                    WHERE property_id = %s
                    """,
                    (
                        text[:MAX_INPUT_CHARS],
                        json.dumps(data.get("donos_atuais", []), ensure_ascii=False),
                        json.dumps(data.get("donos_anteriores", []), ensure_ascii=False),
                        data.get("ano_construcao_estimado"),
                        json.dumps(data.get("vendas_anteriores", []), ensure_ascii=False),
                        row["property_id"],
                    ),
                )
            c.commit()
            ok += 1

    return {"total": len(rows), "ok": ok, "no_text": no_text, "failed": failed}
