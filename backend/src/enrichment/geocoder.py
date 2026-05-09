"""Geocoder via Nominatim public.

Idempotente: WHERE geocoded_at IS NULL (lat/lon NULL fica permanente quando o
endereço não bate, mas geocoded_at não-nulo evita re-tentativa).
Rate-limit: 1 req/s (limite de uso aceitável do Nominatim public).
"""
from __future__ import annotations

import asyncio
import os
from typing import Optional

import httpx
from psycopg.rows import dict_row
from tenacity import retry, stop_after_attempt, wait_exponential

from ._db import conn


NOMINATIM = os.environ.get("NOMINATIM_URL", "https://nominatim.openstreetmap.org").rstrip("/")
USER_AGENT = os.environ.get("CRAWLER_USER_AGENT", "imoveis-caixa-pro/0.1 (+contato@exemplo.com)")


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=20), reraise=True)
async def _geocode(client: httpx.AsyncClient, query: str) -> tuple[Optional[float], Optional[float]]:
    resp = await client.get(
        f"{NOMINATIM}/search",
        params={"q": query, "format": "json", "limit": 1, "countrycodes": "br"},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    if not data:
        return None, None
    return float(data[0]["lat"]), float(data[0]["lon"])


def _build_query(row: dict) -> str:
    parts: list[str] = []
    if row.get("endereco"):
        parts.append(row["endereco"].split(" - CEP:")[0])  # corta CEP pra ajudar matching
    if row.get("bairro"):
        parts.append(row["bairro"])
    if row.get("cidade"):
        parts.append(row["cidade"])
    if row.get("uf"):
        parts.append(row["uf"])
    parts.append("Brasil")
    return ", ".join(parts)


async def run_geocode(limit: int = 50) -> dict:
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    ok = no_match = failed = 0

    with conn() as c:
        with c.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT id, endereco, bairro, cidade, uf
                FROM properties
                WHERE status = 'active' AND geocoded_at IS NULL
                ORDER BY id
                LIMIT %s
                """,
                (limit,),
            )
            rows = cur.fetchall()

        if not rows:
            return {"total": 0, "ok": 0, "no_match": 0, "failed": 0}

        async with httpx.AsyncClient(headers=headers) as client:
            for row in rows:
                query = _build_query(row)
                try:
                    lat, lon = await _geocode(client, query)
                except Exception:
                    failed += 1
                    await asyncio.sleep(1.05)
                    continue

                with c.cursor() as cur:
                    if lat is None:
                        cur.execute(
                            "UPDATE properties SET geocoded_at=now() WHERE id=%s",
                            (row["id"],),
                        )
                        no_match += 1
                    else:
                        cur.execute(
                            "UPDATE properties SET lat=%s, lon=%s, geocoded_at=now() WHERE id=%s",
                            (lat, lon, row["id"]),
                        )
                        ok += 1
                c.commit()
                await asyncio.sleep(1.05)  # respeita 1 req/s

    return {"total": len(rows), "ok": ok, "no_match": no_match, "failed": failed}
