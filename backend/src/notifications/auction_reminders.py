"""Worker que dispara lembretes de leilão (1º e 2º).

Para cada watchlist ativa que casa com um imóvel cujo leilão acontece em
{7d, 1d, 1h} a partir de agora, emite 1 evento de alerta. Idempotente
via tabela `alerts` (UNIQUE em watchlist+property+reason).

Próxima etapa do n8n é entregar via Evolution API no número configurado
do usuário dono da watchlist.

CLI: `python -m src.cli auction-reminders [--horizons 7d,1d,1h]`
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Iterable

from psycopg.rows import dict_row

# Reusa o conn() do enrichment.
from src.enrichment._db import conn

# Re-exporta pra o CLI poder importar
__all__ = ["run_auction_reminders", "mark_delivered"]


# Horizontes (em minutos) com tolerância +/- META_MIN.
DEFAULT_HORIZONS_MIN = [7 * 24 * 60, 24 * 60, 60]  # 7d, 1d, 1h
META_MIN = 30  # janela em minutos


@dataclass
class ReminderHit:
    watchlist_id: int
    property_id: int
    user_id: int
    leilao_n: int  # 1 ou 2
    leilao_dt: datetime
    horizon_min: int
    channels: dict
    reason: str  # ex: "leilao_1_h7d" — único por (watchlist,property)


def _select_pending(conn_obj, horizons: list[int]) -> list[ReminderHit]:
    """Busca matches: para cada watchlist + property cujo leilão (1 ou 2)
    cai numa janela ±META_MIN em torno de cada horizonte."""
    now = datetime.now(timezone.utc)

    # construir cláusulas OR para horizontes
    horizon_clauses = []
    params = []
    for h in horizons:
        target = now + timedelta(minutes=h)
        lo = target - timedelta(minutes=META_MIN)
        hi = target + timedelta(minutes=META_MIN)
        horizon_clauses.append("(d.data_leilao_1 BETWEEN %s AND %s)")
        params += [lo, hi]
        horizon_clauses.append("(d.data_leilao_2 BETWEEN %s AND %s)")
        params += [lo, hi]

    horizons_sql = " OR ".join(horizon_clauses)

    sql = f"""
        SELECT
            w.id    AS watchlist_id,
            w.user_id,
            w.channels,
            p.id    AS property_id,
            d.data_leilao_1, d.data_leilao_2
        FROM watchlists w
        JOIN properties p ON p.status = 'active'
        LEFT JOIN property_details d ON d.property_id = p.id
        WHERE w.active
          AND ({horizons_sql})
          /* filtros simples herdados da Fase 5 */
          AND (w.filters->>'uf'      IS NULL OR p.uf = upper(w.filters->>'uf'))
          AND (w.filters->>'cidade'  IS NULL OR p.cidade ILIKE w.filters->>'cidade')
          AND (w.filters->>'bairro'  IS NULL OR p.bairro ILIKE w.filters->>'bairro')
          AND (
              w.filters->>'preco_max' IS NULL
              OR (
                  w.filters->>'preco_max' ~ '^[0-9]+(\\.[0-9]+)?$'
                  AND p.preco_venda <= (w.filters->>'preco_max')::numeric
              )
          )
    """

    hits: list[ReminderHit] = []
    with conn_obj.cursor(row_factory=dict_row) as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()

    for r in rows:
        for n, dt in [(1, r.get("data_leilao_1")), (2, r.get("data_leilao_2"))]:
            if not dt:
                continue
            delta_min = (dt - datetime.now(timezone.utc)).total_seconds() / 60
            for h in horizons:
                if abs(delta_min - h) <= META_MIN:
                    label = _horizon_label(h)
                    hits.append(ReminderHit(
                        watchlist_id=r["watchlist_id"],
                        property_id=r["property_id"],
                        user_id=r["user_id"],
                        leilao_n=n, leilao_dt=dt,
                        horizon_min=h,
                        channels=r["channels"] or {},
                        reason=f"leilao_{n}_h{label}",
                    ))
                    break
    return hits


def _horizon_label(minutes: int) -> str:
    if minutes >= 1440:
        return f"{minutes // 1440}d"
    if minutes >= 60:
        return f"{minutes // 60}h"
    return f"{minutes}m"


_INSERT_ALERT = """
INSERT INTO alerts (watchlist_id, property_id, reason, matched_at)
VALUES (%s, %s, %s, now())
ON CONFLICT (watchlist_id, property_id, reason) DO NOTHING
RETURNING id;
"""


def _persist(conn_obj, hits: Iterable[ReminderHit]) -> list[dict]:
    """Cria rows em alerts (idempotência via UNIQUE) e enriquece com
    dispatch_targets já resolvidos via view (label, number, instance)
    pra o n8n consumir direto."""
    inserted_ids: list[int] = []
    minimal: list[dict] = []
    with conn_obj.cursor() as cur:
        for h in hits:
            cur.execute(_INSERT_ALERT, (h.watchlist_id, h.property_id, h.reason))
            row = cur.fetchone()
            if row:
                inserted_ids.append(row[0])
                minimal.append({
                    "alert_id": row[0],
                    "leilao_n": h.leilao_n,
                    "leilao_dt": h.leilao_dt.isoformat(),
                    "horizon_min": h.horizon_min,
                    "reason": h.reason,
                })
    conn_obj.commit()

    if not inserted_ids:
        return []

    # Enriquecer via view
    with conn_obj.cursor(row_factory=dict_row) as cur:
        cur.execute(
            "SELECT * FROM v_alerts_pending_dispatch WHERE alert_id = ANY(%s)",
            (inserted_ids,),
        )
        rows = cur.fetchall()

    by_id = {r["alert_id"]: r for r in rows}
    out: list[dict] = []
    for m in minimal:
        r = by_id.get(m["alert_id"], {})
        out.append({
            **m,
            "watchlist_id": r.get("watchlist_id"),
            "watchlist_name": r.get("watchlist_name"),
            "user_id": r.get("user_id"),
            "property_id": r.get("property_id"),
            "numero_imovel": r.get("numero_imovel"),
            "cidade": r.get("cidade"),
            "uf": r.get("uf"),
            "endereco": r.get("endereco"),
            "preco_venda": float(r["preco_venda"]) if r.get("preco_venda") is not None else None,
            "desconto_percentual": float(r["desconto_percentual"]) if r.get("desconto_percentual") is not None else None,
            "link_caixa": r.get("link_caixa"),
            "dispatch_targets": r.get("dispatch_targets") or [],
        })
    return out


# Endpoint helper — chamado pelo n8n após despachar com sucesso.
def mark_delivered(alert_ids: list[int]) -> dict:
    if not alert_ids:
        return {"updated": 0}
    with conn() as c:
        with c.cursor() as cur:
            cur.execute(
                "UPDATE alerts SET delivered_at = now() WHERE id = ANY(%s) AND delivered_at IS NULL",
                (alert_ids,),
            )
            updated = cur.rowcount
        c.commit()
    return {"updated": updated}


def run_auction_reminders(horizons_min: list[int] | None = None) -> dict:
    """Detecta leilões iminentes que casam com watchlists e cria rows em
    `alerts`. Devolve a lista de novos alerts pra n8n entregar."""
    horizons = horizons_min or DEFAULT_HORIZONS_MIN

    with conn() as c:
        hits = _select_pending(c, horizons)
        new_alerts = _persist(c, hits)

    return {
        "horizons_min": horizons,
        "matches": len(hits),
        "new_alerts": new_alerts,
        "new_count": len(new_alerts),
    }
