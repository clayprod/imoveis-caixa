-- Campos extras descobertos ao mapear o HTML da página de detalhe (Fase 2.1).

ALTER TABLE property_details
    ADD COLUMN IF NOT EXISTS nome_empreendimento TEXT,
    ADD COLUMN IF NOT EXISTS situacao TEXT,                  -- 'ocupado'|'desocupado'|null
    ADD COLUMN IF NOT EXISTS descricao_full TEXT,
    ADD COLUMN IF NOT EXISTS endereco_full TEXT,
    ADD COLUMN IF NOT EXISTS corretores_cidade_id TEXT,      -- argumento do lista_corretores JS
    ADD COLUMN IF NOT EXISTS nome_leiloeiro TEXT,
    ADD COLUMN IF NOT EXISTS edital TEXT,
    ADD COLUMN IF NOT EXISTS numero_item TEXT,
    ADD COLUMN IF NOT EXISTS data_leilao_1 TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS data_leilao_2 TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS valor_leilao_1 NUMERIC(14,2),
    ADD COLUMN IF NOT EXISTS valor_leilao_2 NUMERIC(14,2),
    ADD COLUMN IF NOT EXISTS link_edital_pdf TEXT;

-- Tabela de execuções do scraper (auditoria, mesma ideia de ingest_runs)
CREATE TABLE IF NOT EXISTS scrape_runs (
    id BIGSERIAL PRIMARY KEY,
    scope TEXT NOT NULL,                  -- 'all', 'stale', 'pending', 'one'
    properties_total INT NOT NULL DEFAULT 0,
    properties_ok INT NOT NULL DEFAULT 0,
    properties_failed INT NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    error TEXT
);
CREATE INDEX IF NOT EXISTS ix_scrape_runs_started ON scrape_runs (started_at DESC);

-- Auditoria por property (último resultado e contagem de tentativas)
CREATE TABLE IF NOT EXISTS scrape_attempts (
    property_id BIGINT PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
    last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_status TEXT NOT NULL,            -- 'ok' | 'http_error' | 'parse_error' | 'not_found'
    last_http_code INT,
    last_error TEXT,
    attempts INT NOT NULL DEFAULT 0
);
