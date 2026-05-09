"""Avaliação de qualidade de bairro (1 entrada por (uf, cidade, bairro) único).

V1 (sem Google Places): só LLM com base em conhecimento prévio + estatísticas próprias.
V2 (futura, quando GOOGLE_MAPS_API_KEY estiver setada): adiciona POIs do Google Places.

Idempotente: ON CONFLICT em (uf, cidade, bairro) atualiza score/justificativa.
"""
from __future__ import annotations

import json
import os
from typing import Optional

from psycopg.rows import dict_row

from ._db import conn

GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
GOOGLE_MAPS_KEY = os.environ.get("GOOGLE_MAPS_API_KEY", "")


_PROMPT_SYSTEM = (
    "Você avalia bairros brasileiros para investimento imobiliário. "
    "Use seu conhecimento sobre o bairro/cidade. "
    "Responda apenas JSON válido."
)

_PROMPT_USER = """Avalie o bairro abaixo para investimento em imóvel da Caixa.

Bairro: {bairro}
Cidade: {cidade}
UF: {uf}

Estatísticas da nossa base ({n} imóveis nesse bairro):
- Preço médio por m² nos imóveis com área conhecida: R$ {preco_m2:.0f}

Devolva JSON:
{{
  "score": int 0-100 (0=muito ruim para morar/investir, 100=excelente),
  "justificativa": "string em 2-3 frases, citando aspectos concretos: segurança, infraestrutura, valorização, transporte público, comércio, escolas, hospitais. Se desconhece o bairro, diga claramente.",
  "pontos_fortes": ["string"],
  "pontos_fracos": ["string"],
  "perfil_recomendado": "string curta (ex: 'famílias jovens', 'investidores de aluguel', 'estudantes')"
}}
"""


async def _llm_evaluate(bairro: str, cidade: str, uf: str, n: int, preco_m2: Optional[float]) -> dict:
    from groq import AsyncGroq
    client = AsyncGroq(api_key=os.environ["GROQ_API_KEY"])
    prompt = _PROMPT_USER.format(
        bairro=bairro, cidade=cidade, uf=uf, n=n,
        preco_m2=(preco_m2 or 0),
    )
    resp = await client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": _PROMPT_SYSTEM},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0,
    )
    raw = resp.choices[0].message.content or "{}"
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


async def run_evaluate_neighborhoods(limit: int = 20) -> dict:
    ok = failed = 0

    with conn() as c:
        with c.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT p.uf, p.cidade, p.bairro,
                       COUNT(*)::int AS n,
                       AVG(p.preco_venda / NULLIF(p.area_total_m2, 0))
                           FILTER (WHERE p.area_total_m2 > 0) AS preco_m2_medio
                FROM properties p
                LEFT JOIN neighborhoods nb
                  ON nb.uf = p.uf AND nb.cidade = p.cidade AND nb.bairro = p.bairro
                WHERE p.status = 'active'
                  AND p.bairro IS NOT NULL AND p.bairro <> ''
                  AND nb.id IS NULL
                GROUP BY p.uf, p.cidade, p.bairro
                HAVING COUNT(*) >= 1
                ORDER BY COUNT(*) DESC
                LIMIT %s
                """,
                (limit,),
            )
            rows = cur.fetchall()

        if not rows:
            return {"total": 0, "ok": 0, "failed": 0}

        for row in rows:
            try:
                data = await _llm_evaluate(
                    row["bairro"], row["cidade"], row["uf"],
                    row["n"], float(row["preco_m2_medio"]) if row["preco_m2_medio"] else None,
                )
            except Exception:
                failed += 1
                continue

            score = data.get("score")
            if not isinstance(score, int):
                score = None

            pois_summary = {
                "pontos_fortes": data.get("pontos_fortes", []),
                "pontos_fracos": data.get("pontos_fracos", []),
                "perfil_recomendado": data.get("perfil_recomendado"),
            }

            with c.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO neighborhoods (
                        uf, cidade, bairro, score, justificativa, pois_summary,
                        preco_m2_medio, amostra_n
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (uf, cidade, bairro) DO UPDATE SET
                        score = EXCLUDED.score,
                        justificativa = EXCLUDED.justificativa,
                        pois_summary = EXCLUDED.pois_summary,
                        preco_m2_medio = EXCLUDED.preco_m2_medio,
                        amostra_n = EXCLUDED.amostra_n,
                        evaluated_at = now()
                    """,
                    (
                        row["uf"], row["cidade"], row["bairro"],
                        score, data.get("justificativa"),
                        json.dumps(pois_summary, ensure_ascii=False),
                        row["preco_m2_medio"], row["n"],
                    ),
                )
            c.commit()
            ok += 1

    return {"total": len(rows), "ok": ok, "failed": failed}
