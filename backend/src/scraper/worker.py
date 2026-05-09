"""Worker assíncrono que itera sobre `properties` e popula `property_details`.

Estratégia:
  - Seleciona em batch propriedades active sem detail (ou com detail >7 dias antigo).
  - Para cada uma: GET no proxy CF -> parse -> upsert em property_details.
  - Concorrência limitada (default 10).
  - Auditoria em scrape_runs e scrape_attempts.
  - Idempotente: re-rodar não duplica linhas (UPSERT por property_id).

PDF da matrícula é baixado em outra etapa (ver matricula_downloader.py).
"""
from __future__ import annotations

import asyncio
import json
import os
from dataclasses import asdict
from typing import Optional

import httpx
import psycopg
from psycopg.rows import dict_row
from tenacity import retry, stop_after_attempt, wait_exponential, RetryError

from .parser import DetailExtract, parse_detail
from .urls import normalize_base_url


PROXY_URL = normalize_base_url(os.environ.get("CAIXA_PROXY_URL", "https://venda-imoveis.caixa.gov.br"))
PROXY_TOKEN = os.environ.get("CAIXA_PROXY_TOKEN", "")
DETAIL_PATH = "/sistema/detalhe-imovel.asp?hdnimovel={numero}"
DEFAULT_CONCURRENCY = int(os.environ.get("SCRAPE_CONCURRENCY", "10"))
STALE_DAYS = int(os.environ.get("SCRAPE_STALE_DAYS", "7"))


def _conn() -> psycopg.Connection:
    url = os.environ["DATABASE_URL"]
    if url.startswith("postgresql+psycopg://"):
        url = url.replace("postgresql+psycopg://", "postgresql://", 1)
    return psycopg.connect(url)


def _select_pending(conn: psycopg.Connection, limit: int, scope: str) -> list[dict]:
    if scope == "all":
        sql = """
            SELECT id, numero_imovel
            FROM properties
            WHERE status='active'
            ORDER BY id
            LIMIT %s
        """
        params: tuple = (limit,)
    elif scope == "stale":
        sql = """
            SELECT p.id, p.numero_imovel
            FROM properties p
            LEFT JOIN property_details d ON d.property_id = p.id
            WHERE p.status='active'
              AND (d.last_scraped_at IS NULL
                   OR d.last_scraped_at < now() - INTERVAL '%s days')
            ORDER BY p.id
            LIMIT %s
        """ % (STALE_DAYS, "%s")
        params = (limit,)
    else:  # 'pending' (default): só sem detail
        sql = """
            SELECT p.id, p.numero_imovel
            FROM properties p
            LEFT JOIN property_details d ON d.property_id = p.id
            WHERE p.status='active' AND d.property_id IS NULL
            ORDER BY p.id
            LIMIT %s
        """
        params = (limit,)
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(sql, params)
        return cur.fetchall()


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=20), reraise=True)
async def _fetch(client: httpx.AsyncClient, numero: str) -> str:
    url = PROXY_URL + DETAIL_PATH.format(numero=numero)
    resp = await client.get(url, timeout=60)
    resp.raise_for_status()
    return resp.text


_UPSERT_DETAIL = """
INSERT INTO property_details (
    property_id, formas_pagamento, regras_despesas, link_matricula_pdf,
    link_corretores, link_pregoeiro, raw_html, last_scraped_at,
    nome_empreendimento, situacao, descricao_full, endereco_full,
    corretores_cidade_id, nome_leiloeiro, edital, numero_item,
    data_leilao_1, data_leilao_2, valor_leilao_1, valor_leilao_2, link_edital_pdf
) VALUES (
    %(property_id)s, %(formas_pagamento)s, %(regras_despesas)s, %(link_matricula_pdf)s,
    NULL, %(link_pregoeiro)s, NULL, now(),
    %(nome_empreendimento)s, %(situacao)s, %(descricao_full)s, %(endereco_full)s,
    %(corretores_cidade_id)s, %(nome_leiloeiro)s, %(edital)s, %(numero_item)s,
    %(data_leilao_1)s, %(data_leilao_2)s, %(valor_leilao_1)s, %(valor_leilao_2)s, %(link_edital_pdf)s
)
ON CONFLICT (property_id) DO UPDATE SET
    formas_pagamento = EXCLUDED.formas_pagamento,
    regras_despesas = EXCLUDED.regras_despesas,
    link_matricula_pdf = EXCLUDED.link_matricula_pdf,
    link_pregoeiro = EXCLUDED.link_pregoeiro,
    last_scraped_at = now(),
    nome_empreendimento = EXCLUDED.nome_empreendimento,
    situacao = EXCLUDED.situacao,
    descricao_full = EXCLUDED.descricao_full,
    endereco_full = EXCLUDED.endereco_full,
    corretores_cidade_id = EXCLUDED.corretores_cidade_id,
    nome_leiloeiro = EXCLUDED.nome_leiloeiro,
    edital = EXCLUDED.edital,
    numero_item = EXCLUDED.numero_item,
    data_leilao_1 = EXCLUDED.data_leilao_1,
    data_leilao_2 = EXCLUDED.data_leilao_2,
    valor_leilao_1 = EXCLUDED.valor_leilao_1,
    valor_leilao_2 = EXCLUDED.valor_leilao_2,
    link_edital_pdf = EXCLUDED.link_edital_pdf;
"""

# Atualiza properties com campos de qualidade melhor que vieram do detalhe.
_PATCH_PROPERTIES = """
UPDATE properties SET
    quartos = COALESCE(%(quartos)s, quartos),
    banheiros = COALESCE(%(banheiros)s, banheiros),
    vagas = COALESCE(%(vagas)s, vagas),
    area_total_m2 = COALESCE(%(area_total_m2)s, area_total_m2),
    area_privativa_m2 = COALESCE(%(area_privativa_m2)s, area_privativa_m2),
    area_terreno_m2 = COALESCE(%(area_terreno_m2)s, area_terreno_m2),
    matricula_numero = COALESCE(%(matricula_numero)s, matricula_numero),
    comarca = COALESCE(%(comarca)s, comarca),
    oficio = COALESCE(%(oficio)s, oficio),
    inscricao_imobiliaria = COALESCE(%(inscricao_imobiliaria)s, inscricao_imobiliaria),
    averbacao_leiloes_negativos = COALESCE(%(averbacao_leiloes_negativos)s, averbacao_leiloes_negativos),
    updated_at = now()
WHERE id = %(property_id)s;
"""

_INSERT_PHOTO = """
INSERT INTO property_photos (property_id, ordinal, source_url)
VALUES (%s, %s, %s)
ON CONFLICT (property_id, source_url) DO UPDATE SET
    ordinal = EXCLUDED.ordinal;
"""

_UPSERT_ATTEMPT = """
INSERT INTO scrape_attempts (property_id, last_attempt_at, last_status, last_http_code, last_error, attempts)
VALUES (%(property_id)s, now(), %(status)s, %(http_code)s, %(error)s, 1)
ON CONFLICT (property_id) DO UPDATE SET
    last_attempt_at = now(),
    last_status = EXCLUDED.last_status,
    last_http_code = EXCLUDED.last_http_code,
    last_error = EXCLUDED.last_error,
    attempts = scrape_attempts.attempts + 1;
"""


def _to_params(property_id: int, ext: DetailExtract) -> dict:
    return {
        "property_id": property_id,
        "formas_pagamento": json.dumps(ext.formas_pagamento, ensure_ascii=False),
        "regras_despesas": json.dumps(ext.regras_despesas, ensure_ascii=False),
        "link_matricula_pdf": ext.link_matricula_pdf,
        "link_pregoeiro": ext.link_pregoeiro,
        "nome_empreendimento": ext.nome_empreendimento,
        "situacao": ext.situacao,
        "descricao_full": ext.descricao_full,
        "endereco_full": ext.endereco_full,
        "corretores_cidade_id": ext.corretores_cidade_id,
        "nome_leiloeiro": ext.nome_leiloeiro,
        "edital": ext.edital,
        "numero_item": ext.numero_item,
        "data_leilao_1": ext.data_leilao_1,
        "data_leilao_2": ext.data_leilao_2,
        "valor_leilao_1": ext.valor_leilao_1,
        "valor_leilao_2": ext.valor_leilao_2,
        "link_edital_pdf": ext.link_edital_pdf,
        # campos de patch
        "quartos": ext.quartos,
        "banheiros": ext.banheiros,
        "vagas": ext.vagas,
        "area_total_m2": ext.area_total_m2,
        "area_privativa_m2": ext.area_privativa_m2,
        "area_terreno_m2": ext.area_terreno_m2,
        "matricula_numero": ext.matricula_numero,
        "comarca": ext.comarca,
        "oficio": ext.oficio,
        "inscricao_imobiliaria": ext.inscricao_imobiliaria,
        "averbacao_leiloes_negativos": ext.averbacao_leiloes_negativos,
    }


async def _scrape_one(
    client: httpx.AsyncClient,
    sem: asyncio.Semaphore,
    conn: psycopg.Connection,
    lock: asyncio.Lock,
    row: dict,
) -> tuple[int, str]:
    pid, numero = row["id"], row["numero_imovel"]
    async with sem:
        try:
            html = await _fetch(client, numero)
        except RetryError as e:
            inner = e.last_attempt.exception() if e.last_attempt else e
            code = getattr(getattr(inner, "response", None), "status_code", None)
            msg = str(inner)[:500]
            async with lock:
                with conn.cursor() as cur:
                    cur.execute(_UPSERT_ATTEMPT, {
                        "property_id": pid, "status": "http_error",
                        "http_code": code, "error": msg,
                    })
                conn.commit()
            return pid, "http_error"
        except httpx.HTTPStatusError as e:
            async with lock:
                with conn.cursor() as cur:
                    cur.execute(_UPSERT_ATTEMPT, {
                        "property_id": pid, "status": "http_error",
                        "http_code": e.response.status_code, "error": str(e)[:500],
                    })
                conn.commit()
            return pid, "http_error"
        except Exception as e:
            async with lock:
                with conn.cursor() as cur:
                    cur.execute(_UPSERT_ATTEMPT, {
                        "property_id": pid, "status": "http_error",
                        "http_code": None, "error": str(e)[:500],
                    })
                conn.commit()
            return pid, "http_error"

        try:
            ext = parse_detail(html)
        except Exception as e:
            async with lock:
                with conn.cursor() as cur:
                    cur.execute(_UPSERT_ATTEMPT, {
                        "property_id": pid, "status": "parse_error",
                        "http_code": 200, "error": str(e)[:500],
                    })
                conn.commit()
            return pid, "parse_error"

        params = _to_params(pid, ext)
        async with lock:
            with conn.cursor() as cur:
                cur.execute(_UPSERT_DETAIL, params)
                cur.execute(_PATCH_PROPERTIES, params)
                for idx, url in enumerate(ext.photo_urls, start=1):
                    cur.execute(_INSERT_PHOTO, (pid, idx, url))
                cur.execute(_UPSERT_ATTEMPT, {
                    "property_id": pid, "status": "ok",
                    "http_code": 200, "error": None,
                })
            conn.commit()
        return pid, "ok"


async def run_scrape(scope: str = "pending", limit: int = 100, concurrency: int = DEFAULT_CONCURRENCY) -> dict:
    headers = {
        "User-Agent": os.environ.get("CRAWLER_USER_AGENT", "imoveis-caixa-pro/0.1"),
        "Accept": "text/html",
    }
    if PROXY_TOKEN:
        headers["X-Proxy-Token"] = PROXY_TOKEN

    with _conn() as conn:
        rows = _select_pending(conn, limit=limit, scope=scope)
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO scrape_runs (scope, properties_total) VALUES (%s, %s) RETURNING id",
                (scope, len(rows)),
            )
            run_id = cur.fetchone()[0]
        conn.commit()

        if not rows:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE scrape_runs SET finished_at=now() WHERE id=%s", (run_id,)
                )
            conn.commit()
            return {"run_id": run_id, "scope": scope, "total": 0, "ok": 0, "failed": 0}

        sem = asyncio.Semaphore(concurrency)
        lock = asyncio.Lock()
        ok = failed = 0
        async with httpx.AsyncClient(headers=headers, follow_redirects=True) as client:
            tasks = [_scrape_one(client, sem, conn, lock, r) for r in rows]
            for fut in asyncio.as_completed(tasks):
                _, status = await fut
                if status == "ok":
                    ok += 1
                else:
                    failed += 1

        with conn.cursor() as cur:
            cur.execute(
                "UPDATE scrape_runs SET properties_ok=%s, properties_failed=%s, finished_at=now() WHERE id=%s",
                (ok, failed, run_id),
            )
        conn.commit()
        return {"run_id": run_id, "scope": scope, "total": len(rows), "ok": ok, "failed": failed}
