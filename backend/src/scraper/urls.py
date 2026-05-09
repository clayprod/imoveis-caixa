from __future__ import annotations


def normalize_base_url(url: str) -> str:
    value = (url or "").strip().rstrip("/")
    if value and "://" not in value:
        value = "https://" + value
    return value
