from __future__ import annotations

import asyncio
import os
from datetime import date
from pathlib import Path

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from src.scraper.urls import normalize_base_url

UFS = [
    "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO",
    "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR",
    "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
]

# Origem direta (funciona quando o IP do cliente NÃO está bloqueado pelo WAF Azion).
ORIGIN_BASE = "https://venda-imoveis.caixa.gov.br"
PATH_TEMPLATE = "/listaweb/Lista_imoveis_{key}.csv"


def _resolve_base() -> tuple[str, dict[str, str]]:
    """Decide se baixa direto da Caixa ou via Cloudflare Worker proxy.

    Se CAIXA_PROXY_URL estiver setado, usa o proxy + envia X-Proxy-Token.
    Caso contrário, vai direto na origem (funciona local; em VPS de cloud, normalmente 403).
    """
    proxy = normalize_base_url(os.environ.get("CAIXA_PROXY_URL", ""))
    token = os.environ.get("CAIXA_PROXY_TOKEN", "")
    if proxy:
        headers = {}
        if token:
            headers["X-Proxy-Token"] = token
        return proxy, headers
    return ORIGIN_BASE, {}


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=30))
async def _download_one(client: httpx.AsyncClient, key: str, dest_dir: Path) -> Path:
    base, _ = _resolve_base()
    url = base + PATH_TEMPLATE.format(key=key)
    resp = await client.get(url, timeout=120)
    resp.raise_for_status()
    out = dest_dir / f"Lista_imoveis_{key}_{date.today():%Y%m%d}.csv"
    out.write_bytes(resp.content)
    return out


async def download_all(
    dest_dir: Path,
    ufs: list[str] | None = None,
    concurrency: int = 4,
) -> list[Path]:
    """Baixa CSVs da Caixa para cada UF (default: 'geral' apenas)."""
    dest_dir.mkdir(parents=True, exist_ok=True)
    keys = ufs if ufs is not None else ["geral"]

    _, proxy_headers = _resolve_base()
    headers = {
        "User-Agent": os.environ.get(
            "CRAWLER_USER_AGENT", "imoveis-caixa-pro/0.1"
        ),
        "Accept": "*/*",
        **proxy_headers,
    }
    sem = asyncio.Semaphore(concurrency)

    async with httpx.AsyncClient(headers=headers, follow_redirects=True) as client:
        async def _runner(k: str) -> Path:
            async with sem:
                return await _download_one(client, k, dest_dir)

        return list(await asyncio.gather(*(_runner(k) for k in keys)))
