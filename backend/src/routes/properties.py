import os
from urllib.parse import urljoin

import psycopg
from flask import Blueprint, jsonify, request
from psycopg.rows import dict_row


properties_bp = Blueprint("properties", __name__)

CAIXA_BASE_URL = "https://venda-imoveis.caixa.gov.br"


def _database_url() -> str:
    url = os.environ["DATABASE_URL"]
    if url.startswith("postgresql+psycopg://"):
        url = url.replace("postgresql+psycopg://", "postgresql://", 1)
    return url


def _conn():
    return psycopg.connect(_database_url(), row_factory=dict_row)


def _external_url(value: str | None) -> str | None:
    if not value:
        return None
    if value.startswith(("http://", "https://")):
        return value
    if value.startswith("/"):
        return urljoin(CAIXA_BASE_URL, value)
    return value


def _property_payload(row: dict) -> dict:
    bairro_score = row.get("bairro_score")
    desconto = float(row["desconto_percentual"]) if row.get("desconto_percentual") is not None else None
    situacao = (row.get("situacao") or "").lower() or None
    riscos = row.get("riscos_juridicos") or []

    score = 45
    if desconto is not None:
        score += min(max(desconto, 0), 60) * 0.55
    if row.get("aceita_financiamento"):
        score += 7
    if situacao == "desocupado":
        score += 8
    if bairro_score is not None:
        score += (int(bairro_score) - 50) * 0.25
    if riscos:
        score -= 10
    if situacao == "ocupado":
        score -= 8
    score = int(max(0, min(100, round(score))))

    if score >= 75:
        recomendacao = "comprar"
    elif score >= 55:
        recomendacao = "analisar"
    else:
        recomendacao = "evitar"

    endereco = row.get("endereco_full") or row.get("endereco")
    bairro_eval = None
    if row.get("bairro_score") is not None:
        bairro_eval = {
            "score": row.get("bairro_score"),
            "justificativa": row.get("bairro_justificativa"),
            "pois_summary": row.get("pois_summary"),
            "preco_m2_medio": float(row["preco_m2_medio"]) if row.get("preco_m2_medio") is not None else None,
            "amostra_n": row.get("bairro_amostra_n"),
        }

    matricula = None
    if row.get("matricula_pdf_path") or row.get("ocr_text"):
        matricula = {
            "pdf_path": row.get("matricula_pdf_path"),
            "donos_atuais": row.get("donos_atuais") or [],
            "donos_anteriores": row.get("donos_anteriores") or [],
            "ano_construcao_estimado": row.get("ano_construcao_estimado"),
            "vendas_anteriores": row.get("vendas_anteriores") or [],
            "ocr_confidence": float(row["ocr_confidence"]) if row.get("ocr_confidence") is not None else None,
            "ocr_text": row.get("ocr_text"),
        }

    return {
        "id": row["id"],
        "numero_imovel": row.get("numero_imovel"),
        "uf": row.get("uf"),
        "cidade": row.get("cidade"),
        "bairro": row.get("bairro"),
        "cep": row.get("cep"),
        "endereco_short": endereco or row.get("endereco") or "Endereco nao informado",
        "endereco_full": endereco or row.get("endereco") or "",
        "tipo_imovel": row.get("tipo_imovel"),
        "nome_empreendimento": row.get("nome_empreendimento"),
        "modalidade_short": row.get("modalidade_venda"),
        "situacao": situacao,
        "quartos": row.get("quartos"),
        "banheiros": row.get("banheiros"),
        "vagas": row.get("vagas"),
        "area_total_m2": float(row["area_total_m2"]) if row.get("area_total_m2") is not None else None,
        "area_privativa_m2": float(row["area_privativa_m2"]) if row.get("area_privativa_m2") is not None else None,
        "area_terreno_m2": float(row["area_terreno_m2"]) if row.get("area_terreno_m2") is not None else None,
        "preco_venda": float(row["preco_venda"]) if row.get("preco_venda") is not None else None,
        "valor_avaliacao": float(row["valor_avaliacao"]) if row.get("valor_avaliacao") is not None else None,
        "desconto_percentual": desconto,
        "aceita_financiamento": row.get("aceita_financiamento"),
        "aceita_fgts": bool(row.get("formas_pagamento") and "FGTS" in str(row.get("formas_pagamento")).upper()),
        "lat": float(row["lat"]) if row.get("lat") is not None else None,
        "lon": float(row["lon"]) if row.get("lon") is not None else None,
        "comarca": row.get("comarca"),
        "oficio": row.get("oficio"),
        "matricula_numero": row.get("matricula_numero"),
        "link_caixa": _external_url(row.get("link_caixa")),
        "link_matricula_pdf": _external_url(row.get("link_matricula_pdf")),
        "link_edital_pdf": _external_url(row.get("link_edital_pdf")),
        "link_pregoeiro": _external_url(row.get("link_pregoeiro")),
        "nome_leiloeiro": row.get("nome_leiloeiro"),
        "edital": row.get("edital"),
        "numero_item": row.get("numero_item"),
        "data_leilao_1": row.get("data_leilao_1").isoformat() if row.get("data_leilao_1") else None,
        "data_leilao_2": row.get("data_leilao_2").isoformat() if row.get("data_leilao_2") else None,
        "valor_leilao_1": float(row["valor_leilao_1"]) if row.get("valor_leilao_1") is not None else None,
        "valor_leilao_2": float(row["valor_leilao_2"]) if row.get("valor_leilao_2") is not None else None,
        "formas_pagamento": row.get("formas_pagamento") or [],
        "regras_despesas": row.get("regras_despesas") or {},
        "riscos_juridicos": riscos,
        "riscos_juridicos_raw": row.get("riscos_juridicos_raw"),
        "image": _external_url(row.get("image")),
        "photos": [_external_url(p) for p in (row.get("photos") or []) if p],
        "bairro_score": bairro_score,
        "bairro_eval": bairro_eval,
        "matricula": matricula,
        "ai_score": score,
        "ai_recomendacao": recomendacao,
        "ai_estrategia": "Score calculado com dados reais da Caixa, riscos juridicos, situacao, financiamento e avaliacao do bairro.",
        "ai_pros": [
            item for item in [
                f"Desconto de {desconto:.1f}% sobre avaliacao" if desconto is not None else None,
                "Aceita financiamento" if row.get("aceita_financiamento") else None,
                "Imovel desocupado" if situacao == "desocupado" else None,
                f"Bairro com score {bairro_score}/100" if bairro_score is not None else None,
            ] if item
        ],
        "ai_riscos": [
            item for item in [
                "Imovel ocupado" if situacao == "ocupado" else None,
                "Riscos juridicos detectados na pagina/matricula" if riscos else None,
                "Sem geocodificacao validada" if not row.get("lat") or not row.get("lon") else None,
            ] if item
        ],
    }


BASE_SELECT = """
    SELECT
      p.*,
      d.formas_pagamento,
      d.regras_despesas,
      d.link_matricula_pdf,
      d.link_pregoeiro,
      d.link_edital_pdf,
      d.nome_empreendimento,
      d.situacao,
      d.endereco_full,
      d.nome_leiloeiro,
      d.edital,
      d.numero_item,
      d.data_leilao_1,
      d.data_leilao_2,
      d.valor_leilao_1,
      d.valor_leilao_2,
      d.riscos_juridicos,
      d.riscos_juridicos_raw,
      nb.score AS bairro_score,
      nb.justificativa AS bairro_justificativa,
      nb.pois_summary,
      nb.preco_m2_medio,
      nb.amostra_n AS bairro_amostra_n,
      m.pdf_path AS matricula_pdf_path,
      m.ocr_text,
      m.donos_atuais,
      m.donos_anteriores,
      m.ano_construcao_estimado,
      m.vendas_anteriores,
      m.ocr_confidence,
      (
        SELECT ph.source_url
        FROM property_photos ph
        WHERE ph.property_id = p.id AND ph.source_url IS NOT NULL
        ORDER BY ph.ordinal NULLS LAST, ph.id
        LIMIT 1
      ) AS image,
      (
        SELECT COALESCE(array_agg(ph.source_url ORDER BY ph.ordinal NULLS LAST, ph.id), ARRAY[]::text[])
        FROM property_photos ph
        WHERE ph.property_id = p.id AND ph.source_url IS NOT NULL
      ) AS photos
    FROM properties p
    LEFT JOIN property_details d ON d.property_id = p.id
    LEFT JOIN neighborhoods nb ON nb.uf = p.uf AND nb.cidade = p.cidade AND nb.bairro = p.bairro
    LEFT JOIN matricula_extracts m ON m.property_id = p.id
"""


@properties_bp.get("/properties")
def list_properties():
    limit = min(max(int(request.args.get("limit", 100)), 1), 500)
    offset = max(int(request.args.get("offset", 0)), 0)
    sort = request.args.get("sort", "desconto_desc")

    where = ["p.status = 'active'"]
    params: list[object] = []

    q = request.args.get("q")
    if q:
        where.append("(p.numero_imovel ILIKE %s OR p.endereco ILIKE %s OR p.bairro ILIKE %s OR p.cidade ILIKE %s)")
        like = f"%{q}%"
        params.extend([like, like, like, like])

    for key, col in [("uf", "p.uf"), ("cidade", "p.cidade"), ("bairro", "p.bairro")]:
        value = request.args.get(key)
        if value:
            where.append(f"{col} = %s")
            params.append(value)

    tipo = request.args.get("tipo_imovel")
    if tipo:
        where.append("lower(p.tipo_imovel) = lower(%s)")
        params.append(tipo)

    modalidade = request.args.get("modalidade")
    if modalidade:
        where.append("p.modalidade_venda ILIKE %s")
        params.append(f"%{modalidade}%")

    if request.args.get("preco_max"):
        where.append("p.preco_venda <= %s")
        params.append(request.args["preco_max"])
    if request.args.get("desconto_min"):
        where.append("p.desconto_percentual >= %s")
        params.append(request.args["desconto_min"])
    if request.args.get("quartos_min"):
        where.append("COALESCE(p.quartos, 0) >= %s")
        params.append(request.args["quartos_min"])
    if request.args.get("area_min"):
        where.append("COALESCE(p.area_total_m2, p.area_terreno_m2, 0) >= %s")
        params.append(request.args["area_min"])
    if request.args.get("aceita_financiamento") == "true":
        where.append("p.aceita_financiamento IS TRUE")
    if request.args.get("aceita_fgts") == "true":
        where.append("d.formas_pagamento::text ILIKE %s")
        params.append("%FGTS%")
    if request.args.get("somente_desocupados") == "true":
        where.append("lower(COALESCE(d.situacao, '')) = 'desocupado'")
    if request.args.get("leilao_iminente") == "true":
        where.append("(d.data_leilao_1 BETWEEN now() AND now() + interval '30 days' OR d.data_leilao_2 BETWEEN now() AND now() + interval '30 days')")
    if request.args.get("com_matricula") == "true":
        where.append("d.link_matricula_pdf IS NOT NULL")
    if request.args.get("com_foto") == "true":
        where.append("EXISTS (SELECT 1 FROM property_photos ph WHERE ph.property_id = p.id AND ph.source_url IS NOT NULL)")
    if request.args.get("geocoded_only") == "true":
        where.append("p.lat IS NOT NULL AND p.lon IS NOT NULL")

    score_expr = """
      (
        45
        + LEAST(GREATEST(COALESCE(p.desconto_percentual, 0), 0), 60) * 0.55
        + CASE WHEN p.aceita_financiamento IS TRUE THEN 7 ELSE 0 END
        + CASE WHEN lower(COALESCE(d.situacao, '')) = 'desocupado' THEN 8 ELSE 0 END
        + CASE WHEN lower(COALESCE(d.situacao, '')) = 'ocupado' THEN -8 ELSE 0 END
        + CASE WHEN d.riscos_juridicos IS NOT NULL AND jsonb_array_length(d.riscos_juridicos) > 0 THEN -10 ELSE 0 END
        + (COALESCE(nb.score, 50) - 50) * 0.25
      )
    """
    order_by = {
        "preco_asc": "p.preco_venda ASC NULLS LAST",
        "preco_desc": "p.preco_venda DESC NULLS LAST",
        "bairro_score_desc": "nb.score DESC NULLS LAST",
        "ai_score_desc": f"{score_expr} DESC NULLS LAST",
        "recente": "p.updated_at DESC NULLS LAST",
        "leilao_proximo": "d.data_leilao_1 ASC NULLS LAST",
        "desconto_desc": "p.desconto_percentual DESC NULLS LAST",
    }.get(sort, "p.desconto_percentual DESC NULLS LAST")

    sql = f"""
      {BASE_SELECT}
      WHERE {" AND ".join(where)}
      ORDER BY {order_by}, p.id DESC
      LIMIT %s OFFSET %s
    """

    with _conn() as conn:
        rows = conn.execute(sql, [*params, limit, offset]).fetchall()
        total = conn.execute(
            f"""
              SELECT count(*)
              FROM properties p
              LEFT JOIN property_details d ON d.property_id = p.id
              LEFT JOIN neighborhoods nb ON nb.uf = p.uf AND nb.cidade = p.cidade AND nb.bairro = p.bairro
              WHERE {" AND ".join(where)}
            """,
            params,
        ).fetchone()["count"]

    return jsonify({"items": [_property_payload(r) for r in rows], "total": total, "limit": limit, "offset": offset})


@properties_bp.get("/properties/<int:property_id>")
def get_property(property_id: int):
    with _conn() as conn:
        row = conn.execute(f"{BASE_SELECT} WHERE p.id = %s", [property_id]).fetchone()
    if not row:
        return jsonify({"error": "Imovel nao encontrado"}), 404
    return jsonify(_property_payload(row))


@properties_bp.get("/properties/filters")
def property_filters():
    with _conn() as conn:
        ufs = conn.execute("SELECT DISTINCT uf FROM properties WHERE uf IS NOT NULL ORDER BY uf").fetchall()
        cidades = conn.execute("SELECT DISTINCT cidade FROM properties WHERE cidade IS NOT NULL ORDER BY cidade LIMIT 500").fetchall()
        bairros = conn.execute("SELECT DISTINCT bairro FROM properties WHERE bairro IS NOT NULL AND bairro <> '' ORDER BY bairro LIMIT 500").fetchall()
    return jsonify({
        "ufs": [{"value": r["uf"], "label": r["uf"]} for r in ufs],
        "cidades": [{"value": r["cidade"], "label": r["cidade"]} for r in cidades],
        "bairros": [{"value": r["bairro"], "label": r["bairro"]} for r in bairros],
    })


@properties_bp.get("/properties/stats")
def property_stats():
    with _conn() as conn:
        totals = conn.execute(
            """
            SELECT
              count(*) FILTER (WHERE p.status = 'active') AS total_active,
              count(*) FILTER (WHERE p.status = 'active' AND p.desconto_percentual >= 30) AS opportunities,
              avg(p.preco_venda) FILTER (WHERE p.status = 'active') AS avg_price,
              avg(p.desconto_percentual) FILTER (WHERE p.status = 'active') AS avg_discount,
              count(DISTINCT p.cidade) FILTER (WHERE p.status = 'active') AS cities,
              count(DISTINCT p.bairro) FILTER (WHERE p.status = 'active' AND p.bairro IS NOT NULL) AS bairros
            FROM properties p
            """
        ).fetchone()
        coverage = conn.execute(
            """
            SELECT
              (SELECT count(*) FROM property_details) AS details,
              (SELECT count(DISTINCT property_id) FROM property_photos WHERE source_url IS NOT NULL) AS photos,
              (SELECT count(*) FROM matricula_extracts) AS matriculas,
              (SELECT count(*) FROM neighborhoods) AS neighborhoods,
              (SELECT count(*) FROM property_embeddings) AS embeddings
            """
        ).fetchone()
        city_rows = conn.execute(
            """
            SELECT cidade, uf, count(*) AS total
            FROM properties
            WHERE status = 'active' AND cidade IS NOT NULL
            GROUP BY cidade, uf
            ORDER BY total DESC
            LIMIT 5
            """
        ).fetchall()
        trend_rows = conn.execute(
            """
            SELECT to_char(date_trunc('month', last_seen_at), 'Mon') AS month,
                   count(*) AS properties,
                   avg(preco_venda) AS avg_price,
                   count(*) FILTER (WHERE desconto_percentual >= 30) AS opportunities
            FROM properties
            WHERE status = 'active'
            GROUP BY date_trunc('month', last_seen_at)
            ORDER BY date_trunc('month', last_seen_at) DESC
            LIMIT 6
            """
        ).fetchall()

    colors = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#6B7280"]
    total_for_cities = sum(int(r["total"]) for r in city_rows) or 1
    return jsonify({
        "total_active": totals["total_active"],
        "opportunities": totals["opportunities"],
        "avg_price": float(totals["avg_price"]) if totals["avg_price"] is not None else None,
        "avg_discount": float(totals["avg_discount"]) if totals["avg_discount"] is not None else None,
        "cities": totals["cities"],
        "bairros": totals["bairros"],
        "coverage": dict(coverage),
        "city_distribution": [
            {
                "name": f"{r['cidade']}/{r['uf']}",
                "value": round((int(r["total"]) / total_for_cities) * 100, 1),
                "count": int(r["total"]),
                "color": colors[i % len(colors)],
            }
            for i, r in enumerate(city_rows)
        ],
        "market_trend": [
            {
                "month": r["month"],
                "properties": int(r["properties"]),
                "avgPrice": float(r["avg_price"]) if r["avg_price"] is not None else None,
                "opportunities": int(r["opportunities"]),
            }
            for r in reversed(trend_rows)
        ],
    })
