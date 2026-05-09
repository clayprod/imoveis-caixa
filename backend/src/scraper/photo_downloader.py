"""Download idempotente das fotos da galeria dos imóveis."""
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
DEST_DIR = Path(os.environ.get("PHOTO_DIR", "/data/photos"))


def _conn() -> psycopg.Connection:
    url = os.environ["DATABASE_URL"]
    if url.startswith("postgresql+psycopg://"):
        url = url.replace("postgresql+psycopg://", "postgresql://", 1)
    return psycopg.connect(url)


def _photo_url(path: str) -> str:
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return PROXY_URL + (path if path.startswith("/") else "/" + path)


def _ext(path: str) -> str:
    suffix = Path(path.split("?", 1)[0]).suffix.lower()
    return suffix if suffix in {".jpg", ".jpeg", ".png"} else ".jpg"


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=20), reraise=True)
async def _download(client: httpx.AsyncClient, url: str, dest: Path) -> int:
    resp = await client.get(url, timeout=120)
    resp.raise_for_status()
    dest.write_bytes(resp.content)
    return len(resp.content)


async def run_download_photos(limit: int = 100, concurrency: int = 8) -> dict:
    DEST_DIR.mkdir(parents=True, exist_ok=True)
    headers = {"User-Agent": os.environ.get("CRAWLER_USER_AGENT", "imoveis-caixa-pro/0.1")}
    if PROXY_TOKEN:
        headers["X-Proxy-Token"] = PROXY_TOKEN

    with _conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT ph.id, ph.property_id, ph.ordinal, ph.source_url, p.numero_imovel
                FROM property_photos ph
                JOIN properties p ON p.id = ph.property_id
                WHERE ph.local_path IS NULL
                  AND ph.failure_count < 3
                ORDER BY ph.property_id, ph.ordinal
                LIMIT %s
                """,
                (limit,),
            )
            rows = cur.fetchall()

        if not rows:
            return {"total": 0, "ok": 0, "missing": 0, "failed": 0, "bytes": 0}

        sem = asyncio.Semaphore(concurrency)
        lock = asyncio.Lock()
        ok = failed = missing = total_bytes = 0

        async with httpx.AsyncClient(headers=headers, follow_redirects=True) as client:
            async def _work(row: dict) -> None:
                nonlocal ok, failed, missing, total_bytes
                url = _photo_url(row["source_url"])
                dest = DEST_DIR / f"{row['numero_imovel']}_{row['ordinal']:02d}{_ext(row['source_url'])}"
                async with sem:
                    try:
                        size = await _download(client, url, dest)
                    except Exception as exc:
                        is_missing = (
                            isinstance(exc, httpx.HTTPStatusError)
                            and exc.response.status_code == 404
                        )
                        async with lock:
                            with conn.cursor() as cur:
                                cur.execute(
                                    """
                                    UPDATE property_photos
                                    SET download_failed_at=now(),
                                        download_error=%s,
                                        failure_count=failure_count + 1
                                    WHERE id=%s
                                    """,
                                    (str(exc)[:500], row["id"]),
                                )
                            conn.commit()
                            if is_missing:
                                missing += 1
                            else:
                                failed += 1
                        return
                async with lock:
                    with conn.cursor() as cur:
                        cur.execute(
                            """
                            UPDATE property_photos
                            SET local_path=%s, downloaded_at=now()
                            WHERE id=%s
                            """,
                            (str(dest), row["id"]),
                        )
                    conn.commit()
                    ok += 1
                    total_bytes += size

            await asyncio.gather(*(_work(r) for r in rows))

        return {
            "total": len(rows),
            "ok": ok,
            "missing": missing,
            "failed": failed,
            "bytes": total_bytes,
        }
