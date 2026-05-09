"""Embeddings em pgvector via OpenAI text-embedding-3-small.

Idempotente: WHERE NOT EXISTS em property_embeddings.
Custo: ~$0.020 / 1M tokens. 31k imóveis * ~200 tokens = ~$0.12 pra base toda.
"""
from __future__ import annotations

import os
from typing import Iterable

from psycopg.rows import dict_row
from pgvector.psycopg import register_vector

from ._db import conn


MODEL = os.environ.get("OPENAI_EMBED_MODEL", "text-embedding-3-small")
DIM = 1536  # bate com schema property_embeddings.embedding VECTOR(1536)
DEFAULT_BATCH = int(os.environ.get("EMBED_BATCH", "50"))


# Stopwords PT-BR: verbos de ligação + conectores que perdem sentido fora de contexto.
# Conforme requisito do user — ajuda o embedding a focar em substantivos/adjetivos relevantes.
_STOPWORDS = {
    "de","da","do","das","dos","a","o","as","os","e","ou","se","nem","mas",
    "em","na","no","nas","nos","por","para","com","sem","sob","sobre","entre","até","desde",
    "que","qual","quais","cuja","cujas","cujos","onde","quando",
    "ser","estar","ter","haver","ir","vir","poder","dever","fazer","ficar",
    "me","te","nos","vos","lhe","lhes","seu","sua","seus","suas","meu","minha",
    "este","esta","esse","essa","aquele","aquela","isto","isso","aquilo",
    "um","uma","uns","umas","ao","aos","à","às","pelo","pela","pelos","pelas",
}


def _normalize_token(t: str) -> str:
    return t.lower().strip(".,;:!?()[]\"'").rstrip("s")


def _build_text(row: dict) -> str:
    bits = []
    if row.get("tipo_imovel"):
        bits.append(row["tipo_imovel"])
    if row.get("cidade"):
        bits.append(row["cidade"])
    if row.get("bairro"):
        bits.append(row["bairro"])
    if row.get("uf"):
        bits.append(row["uf"])
    if row.get("descricao_full"):
        bits.append(row["descricao_full"])
    elif row.get("descricao_raw"):
        bits.append(row["descricao_raw"])
    if row.get("preco_venda"):
        bits.append(f"R$ {row['preco_venda']}")
    if row.get("desconto_percentual"):
        bits.append(f"desconto {row['desconto_percentual']}%")
    if row.get("quartos"):
        bits.append(f"{row['quartos']} quartos")
    if row.get("vagas"):
        bits.append(f"{row['vagas']} vagas")
    if row.get("area_total_m2"):
        bits.append(f"{row['area_total_m2']}m2 area total")
    raw = " ".join(str(b) for b in bits if b)
    words = [
        w for w in raw.split()
        if _normalize_token(w) not in _STOPWORDS and len(w) > 1
    ]
    return " ".join(words)


async def _embed_batch(texts: list[str]) -> list[list[float]]:
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
    resp = await client.embeddings.create(model=MODEL, input=texts)
    return [e.embedding for e in resp.data]


async def run_embed(limit: int = 500, batch_size: int = DEFAULT_BATCH) -> dict:
    with conn() as c:
        register_vector(c)
        with c.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT p.id, p.tipo_imovel, p.cidade, p.bairro, p.uf,
                       p.preco_venda, p.desconto_percentual, p.quartos, p.vagas,
                       p.area_total_m2, p.descricao_raw, d.descricao_full
                FROM properties p
                LEFT JOIN property_details d ON d.property_id = p.id
                LEFT JOIN property_embeddings e ON e.property_id = p.id
                WHERE p.status = 'active' AND e.property_id IS NULL
                ORDER BY p.id
                LIMIT %s
                """,
                (limit,),
            )
            rows = cur.fetchall()

        if not rows:
            return {"total": 0, "ok": 0, "failed": 0}

        ok = failed = 0
        for i in range(0, len(rows), batch_size):
            batch = rows[i:i + batch_size]
            texts = [_build_text(r) for r in batch]
            try:
                vectors = await _embed_batch(texts)
            except Exception:
                failed += len(batch)
                continue
            with c.cursor() as cur:
                for row, vec, txt in zip(batch, vectors, texts):
                    cur.execute(
                        """
                        INSERT INTO property_embeddings (property_id, embedding, text_used, model)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (property_id) DO UPDATE SET
                            embedding = EXCLUDED.embedding,
                            text_used = EXCLUDED.text_used,
                            model = EXCLUDED.model,
                            created_at = now()
                        """,
                        (row["id"], vec, txt, MODEL),
                    )
            c.commit()
            ok += len(batch)

        return {"total": len(rows), "ok": ok, "failed": failed}
