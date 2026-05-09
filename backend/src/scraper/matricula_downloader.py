"""Download dos PDFs de matrícula via proxy CF.

Pega property_details com link_matricula_pdf preenchido e SEM linha em matricula_extracts.
Salva em /data/matriculas/<numero>.pdf e cria a row em matricula_extracts (sem OCR ainda — Fase 3).
"""
from __future__ import annotations

import asyncio
import os
from pathlib import Path

import httpx
import psycopg
from psycopg.rows import dict_row
from tenacity import retry, stop_after_attempt, wait_exponential

from .urls import normalize_base_url


PROXY_URL = normalize_base_url(os.environ.get("CAIXA_PROXY_URL", "https://venda-imoveis.caixa.gov.br"))
PROXY_TOKEN = os.environ.get("CAIXA_PROXY_TOKEN", "")
DEST_DIR = Path(os.environ.get("MATRICULA_DIR", "/data/matriculas"))


def _conn() -> psycopg.Connection:
    url = os.environ["DATABASE_URL"]
    if url.startswith("postgresql+psycopg://"):
        url = url.replace("postgresql+psycopg://", "postgresql://", 1)
    return psycopg.connect(url)


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=20), reraise=True)
async def _download(client: httpx.AsyncClient, url: str, dest: Path) -> int:
    resp = await client.get(url, timeout=120)
    resp.raise_for_status()
    dest.write_bytes(resp.content)
    return len(resp.content)


async def run_download(limit: int = 100, concurrency: int = 5) -> dict:
    DEST_DIR.mkdir(parents=True, exist_ok=True)

    headers = {"User-Agent": os.environ.get("CRAWLER_USER_AGENT", "imoveis-caixa-pro/0.1")}
    if PROXY_TOKEN:
        headers["X-Proxy-Token"] = PROXY_TOKEN

    with _conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT p.id, p.numero_imovel, d.link_matricula_pdf
                FROM properties p
                JOIN property_details d ON d.property_id = p.id
                LEFT JOIN matricula_extracts m ON m.property_id = p.id
                WHERE p.status = 'active'
                  AND d.link_matricula_pdf IS NOT NULL
                  AND m.property_id IS NULL
                ORDER BY p.id
                LIMIT %s
                """,
                (limit,),
            )
            rows = cur.fetchall()

        if not rows:
            return {"total": 0, "ok": 0, "failed": 0, "bytes": 0}

        sem = asyncio.Semaphore(concurrency)
        lock = asyncio.Lock()
        ok = failed = 0
        total_bytes = 0

        async with httpx.AsyncClient(headers=headers, follow_redirects=True) as client:
            async def _work(row: dict) -> None:
                nonlocal ok, failed, total_bytes
                pid = row["id"]
                numero = row["numero_imovel"]
                link = row["link_matricula_pdf"]
                url = PROXY_URL + link
                dest = DEST_DIR / f"{numero}.pdf"
                async with sem:
                    try:
                        size = await _download(client, url, dest)
                    except Exception:
                        failed += 1
                        return
                async with lock:
                    with conn.cursor() as cur:
                        cur.execute(
                            """
                            INSERT INTO matricula_extracts (property_id, pdf_path)
                            VALUES (%s, %s)
                            ON CONFLICT (property_id) DO UPDATE
                            SET pdf_path = EXCLUDED.pdf_path
                            """,
                            (pid, str(dest)),
                        )
                    conn.commit()
                    ok += 1
                    total_bytes += size

            await asyncio.gather(*(_work(r) for r in rows))

        return {
            "total": len(rows),
            "ok": ok,
            "failed": failed,
            "bytes": total_bytes,
        }
