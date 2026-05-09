-- Schema inicial do Imóveis Caixa Pro (pivot 2026-05).
-- Pgvector para busca semântica; resto do schema reflete o pipeline:
-- ingest (lista CSV) -> detalhe (scraper) -> matrícula (OCR+IA) -> embeddings -> alertas.
--
-- Roda automaticamente no primeiro start do container Postgres
-- (docker-entrypoint-initdb.d/) ou via `psql -f` para reset manual.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- properties: dado canônico vindo da lista CSV + parsed da Descrição
-- ============================================================
CREATE TABLE IF NOT EXISTS properties (
    id                BIGSERIAL PRIMARY KEY,
    numero_imovel     TEXT NOT NULL UNIQUE,
    uf                CHAR(2) NOT NULL,
    cidade            TEXT NOT NULL,
    bairro            TEXT,
    endereco          TEXT,
    cep               TEXT,
    preco_venda            NUMERIC(14,2),
    valor_avaliacao        NUMERIC(14,2),
    desconto_percentual    NUMERIC(6,2),
    aceita_financiamento   BOOLEAN,
    modalidade_venda       TEXT,
    link_caixa             TEXT,

    descricao_raw     TEXT,
    tipo_imovel       TEXT,
    quartos           INT,
    banheiros         INT,
    vagas             INT,
    area_total_m2        NUMERIC(10,2),
    area_privativa_m2    NUMERIC(10,2),
    area_terreno_m2      NUMERIC(10,2),

    comarca               TEXT,
    oficio                TEXT,
    matricula_numero      TEXT,
    inscricao_imobiliaria TEXT,
    averbacao_leiloes_negativos BOOLEAN,

    lat NUMERIC(10,7),
    lon NUMERIC(10,7),

    -- Soft-delete: o registro nunca é apagado, só marcado.
    -- 'active'  = veio na última lista da UF
    -- 'removed' = não veio mais (vendeu, encerrou edital, etc)
    status TEXT NOT NULL DEFAULT 'active',
    removed_at TIMESTAMPTZ,

    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_properties_uf_cidade  ON properties (uf, cidade);
CREATE INDEX IF NOT EXISTS ix_properties_bairro_trgm ON properties USING gin (bairro gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ix_properties_preco       ON properties (preco_venda);
CREATE INDEX IF NOT EXISTS ix_properties_desconto    ON properties (desconto_percentual);
CREATE INDEX IF NOT EXISTS ix_properties_tipo        ON properties (tipo_imovel);
CREATE INDEX IF NOT EXISTS ix_properties_status      ON properties (status) WHERE status = 'active';

-- ============================================================
-- ingest_runs: log de cada execução do ingestor (auditoria)
-- ============================================================
CREATE TABLE IF NOT EXISTS ingest_runs (
    id BIGSERIAL PRIMARY KEY,
    uf TEXT NOT NULL,                    -- UF processada ('geral' = lista geral)
    source_file TEXT NOT NULL,
    rows_seen INT NOT NULL DEFAULT 0,
    rows_inserted INT NOT NULL DEFAULT 0,
    rows_updated INT NOT NULL DEFAULT 0,
    rows_removed INT NOT NULL DEFAULT 0,
    price_changes INT NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    error TEXT
);
CREATE INDEX IF NOT EXISTS ix_ingest_runs_uf_started ON ingest_runs (uf, started_at DESC);

-- ============================================================
-- property_price_history: snapshot toda vez que o preço/desconto muda
-- (alimentado pelo ingestor; permite alertar quedas)
-- ============================================================
CREATE TABLE IF NOT EXISTS property_price_history (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    preco_venda         NUMERIC(14,2),
    valor_avaliacao     NUMERIC(14,2),
    desconto_percentual NUMERIC(6,2),
    captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_pph_property ON property_price_history (property_id, captured_at DESC);

-- ============================================================
-- property_details: dado vindo do scraper da página de detalhe
-- ============================================================
CREATE TABLE IF NOT EXISTS property_details (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT NOT NULL UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
    formas_pagamento     JSONB,  -- ex: ["recursos_proprios","fgts","financiamento_caixa"]
    regras_despesas      JSONB,  -- {"condominio": "...", "tributos": "..."}
    link_matricula_pdf   TEXT,
    link_corretores      TEXT,
    link_pregoeiro       TEXT,   -- preenchido quando modalidade não é venda online direta
    raw_html             TEXT,
    last_scraped_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- matricula_extracts: OCR + LLM extraindo histórico do imóvel
-- ============================================================
CREATE TABLE IF NOT EXISTS matricula_extracts (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT NOT NULL UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
    pdf_path TEXT,
    ocr_text TEXT,
    donos_atuais     JSONB,
    donos_anteriores JSONB,
    ano_construcao_estimado INT,
    vendas_anteriores JSONB,  -- [{"data":"2010-05-12","valor":120000,"vendedor":"...","comprador":"..."}]
    ocr_confidence NUMERIC(4,3),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- property_embeddings: pgvector para busca semântica
-- ============================================================
CREATE TABLE IF NOT EXISTS property_embeddings (
    property_id BIGINT PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
    embedding VECTOR(1536) NOT NULL,  -- text-embedding-3-small / compatível
    text_used TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_property_embeddings_ivf
    ON property_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- neighborhoods: avaliação do bairro pela IA + média de preço/m2
-- ============================================================
CREATE TABLE IF NOT EXISTS neighborhoods (
    id BIGSERIAL PRIMARY KEY,
    uf CHAR(2) NOT NULL,
    cidade TEXT NOT NULL,
    bairro TEXT NOT NULL,
    score INT,                      -- 0-100
    justificativa TEXT,
    pois_summary JSONB,             -- contagem de POIs por categoria
    preco_m2_medio NUMERIC(12,2),   -- calculado da nossa base
    amostra_n INT,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (uf, cidade, bairro)
);

-- ============================================================
-- users / watchlists / alerts (Fase 5)
-- users: já existe via SQLAlchemy (tabela 'users') — não recrio aqui.
-- ============================================================
CREATE TABLE IF NOT EXISTS watchlists (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name TEXT NOT NULL,
    filters JSONB NOT NULL,    -- {"uf":"SP","cidade":"Ribeirão Preto","tipo":"apartamento","preco_max":150000,"desconto_min":40,"score_bairro_min":60}
    channels JSONB NOT NULL,   -- {"email":true,"push":true,"whatsapp":"+5511..."}
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_watchlists_user ON watchlists (user_id) WHERE active;

CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    watchlist_id BIGINT NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    property_id  BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    reason TEXT,                    -- ex: "queda de preço de 12%", "novo match"
    matched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    delivered_at TIMESTAMPTZ,
    channels_status JSONB,
    UNIQUE (watchlist_id, property_id, reason)
);
CREATE INDEX IF NOT EXISTS ix_alerts_pending ON alerts (matched_at) WHERE delivered_at IS NULL;
