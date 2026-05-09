"""Helpers compartilhados pelos workers de enrichment."""
from __future__ import annotations

import os

import psycopg


def conn() -> psycopg.Connection:
    url = os.environ["DATABASE_URL"]
    if url.startswith("postgresql+psycopg://"):
        url = url.replace("postgresql+psycopg://", "postgresql://", 1)
    return psycopg.connect(url)
