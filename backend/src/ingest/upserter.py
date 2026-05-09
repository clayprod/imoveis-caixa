from __future__ import annotations

from typing import Iterable

import psycopg
from psycopg.rows import dict_row

from .description_extractor import extract
from .parser import RawRow

# Upsert que reativa imóveis previamente marcados como removed (caso reapareçam na lista).
_UPSERT_SQL = """
INSERT INTO properties (
    numero_imovel, uf, cidade, bairro, endereco,
    preco_venda, valor_avaliacao, desconto_percentual,
    aceita_financiamento, modalidade_venda, link_caixa,
    descricao_raw, tipo_imovel, quartos, banheiros, vagas,
    area_total_m2, area_privativa_m2, area_terreno_m2,
    status, removed_at, last_seen_at
) VALUES (
    %(numero_imovel)s, %(uf)s, %(cidade)s, %(bairro)s, %(endereco)s,
    %(preco_venda)s, %(valor_avaliacao)s, %(desconto_percentual)s,
    %(aceita_financiamento)s, %(modalidade_venda)s, %(link_caixa)s,
    %(descricao_raw)s, %(tipo_imovel)s, %(quartos)s, %(banheiros)s, %(vagas)s,
    %(area_total_m2)s, %(area_privativa_m2)s, %(area_terreno_m2)s,
    'active', NULL, now()
)
ON CONFLICT (numero_imovel) DO UPDATE SET
    uf = EXCLUDED.uf,
    cidade = EXCLUDED.cidade,
    bairro = EXCLUDED.bairro,
    endereco = EXCLUDED.endereco,
    preco_venda = EXCLUDED.preco_venda,
    valor_avaliacao = EXCLUDED.valor_avaliacao,
    desconto_percentual = EXCLUDED.desconto_percentual,
    aceita_financiamento = EXCLUDED.aceita_financiamento,
    modalidade_venda = EXCLUDED.modalidade_venda,
    link_caixa = EXCLUDED.link_caixa,
    descricao_raw = EXCLUDED.descricao_raw,
    tipo_imovel = EXCLUDED.tipo_imovel,
    quartos = EXCLUDED.quartos,
    banheiros = EXCLUDED.banheiros,
    vagas = EXCLUDED.vagas,
    area_total_m2 = EXCLUDED.area_total_m2,
    area_privativa_m2 = EXCLUDED.area_privativa_m2,
    area_terreno_m2 = EXCLUDED.area_terreno_m2,
    status = 'active',
    removed_at = NULL,
    last_seen_at = now(),
    updated_at = now()
RETURNING id, (xmax = 0) AS inserted;
"""

_PRICE_HISTORY_SQL = """
INSERT INTO property_price_history (property_id, preco_venda, valor_avaliacao, desconto_percentual)
VALUES (%s, %s, %s, %s);
"""

_FETCH_LAST_PRICE_SQL = """
SELECT preco_venda, valor_avaliacao, desconto_percentual
FROM property_price_history
WHERE property_id = %s
ORDER BY captured_at DESC
LIMIT 1;
"""

_SOFT_DELETE_SQL_UF = """
UPDATE properties
SET status = 'removed', removed_at = now(), updated_at = now()
WHERE status = 'active'
  AND uf = %s
  AND NOT (numero_imovel = ANY(%s));
"""

_SOFT_DELETE_SQL_GERAL = """
UPDATE properties
SET status = 'removed', removed_at = now(), updated_at = now()
WHERE status = 'active'
  AND NOT (numero_imovel = ANY(%s));
"""


def _row_params(raw: RawRow) -> dict:
    feats = extract(raw.descricao)
    return {
        "numero_imovel": raw.numero_imovel,
        "uf": raw.uf,
        "cidade": raw.cidade,
        "bairro": raw.bairro,
        "endereco": raw.endereco,
        "preco_venda": raw.preco_venda,
        "valor_avaliacao": raw.valor_avaliacao,
        "desconto_percentual": raw.desconto_percentual,
        "aceita_financiamento": raw.aceita_financiamento,
        "modalidade_venda": raw.modalidade_venda,
        "link_caixa": raw.link_caixa,
        "descricao_raw": raw.descricao,
        "tipo_imovel": feats.tipo_imovel,
        "quartos": feats.quartos,
        "banheiros": feats.banheiros,
        "vagas": feats.vagas,
        "area_total_m2": feats.area_total_m2,
        "area_privativa_m2": feats.area_privativa_m2,
        "area_terreno_m2": feats.area_terreno_m2,
    }


def upsert_rows(
    conn: psycopg.Connection,
    rows: Iterable[RawRow],
    *,
    scope_uf: str,
    source_file: str,
) -> dict:
    """
    Faz upsert das linhas, registra history quando preço/desconto muda
    e aplica soft-delete escopado.

    scope_uf:
      - 'geral'  -> soft-delete em todos os imóveis active não vistos
      - 'SP', 'MG', etc -> soft-delete apenas naquela UF
    """
    seen: list[str] = []
    inserted = updated = price_changes = 0

    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            "INSERT INTO ingest_runs (uf, source_file) VALUES (%s, %s) RETURNING id",
            (scope_uf, source_file),
        )
        run_id = cur.fetchone()["id"]

        for raw in rows:
            seen.append(raw.numero_imovel)
            cur.execute(_UPSERT_SQL, _row_params(raw))
            res = cur.fetchone()
            property_id = res["id"]
            if res["inserted"]:
                inserted += 1
                cur.execute(
                    _PRICE_HISTORY_SQL,
                    (property_id, raw.preco_venda, raw.valor_avaliacao, raw.desconto_percentual),
                )
                price_changes += 1
            else:
                updated += 1
                cur.execute(_FETCH_LAST_PRICE_SQL, (property_id,))
                last = cur.fetchone()
                changed = (
                    last is None
                    or last["preco_venda"] != raw.preco_venda
                    or last["valor_avaliacao"] != raw.valor_avaliacao
                    or last["desconto_percentual"] != raw.desconto_percentual
                )
                if changed:
                    cur.execute(
                        _PRICE_HISTORY_SQL,
                        (property_id, raw.preco_venda, raw.valor_avaliacao, raw.desconto_percentual),
                    )
                    price_changes += 1

        if scope_uf.lower() == "geral":
            cur.execute(_SOFT_DELETE_SQL_GERAL, (seen,))
        else:
            cur.execute(_SOFT_DELETE_SQL_UF, (scope_uf.upper(), seen))
        removed = cur.rowcount

        cur.execute(
            """
            UPDATE ingest_runs
            SET rows_seen = %s, rows_inserted = %s, rows_updated = %s,
                rows_removed = %s, price_changes = %s, finished_at = now()
            WHERE id = %s
            """,
            (len(seen), inserted, updated, removed, price_changes, run_id),
        )

    conn.commit()
    return {
        "run_id": run_id,
        "seen": len(seen),
        "inserted": inserted,
        "updated": updated,
        "removed": removed,
        "price_changes": price_changes,
    }
