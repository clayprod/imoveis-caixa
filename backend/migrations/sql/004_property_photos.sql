-- Fotos dos imóveis extraídas da galeria da página de detalhe.

CREATE TABLE IF NOT EXISTS property_photos (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    ordinal INT NOT NULL DEFAULT 1,
    source_url TEXT NOT NULL,
    local_path TEXT,
    downloaded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (property_id, source_url)
);

CREATE INDEX IF NOT EXISTS ix_property_photos_pending
    ON property_photos (property_id, ordinal)
    WHERE local_path IS NULL;
