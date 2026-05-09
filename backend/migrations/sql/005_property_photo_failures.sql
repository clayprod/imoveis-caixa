-- Auditoria de falhas no download de fotos.

ALTER TABLE property_photos
    ADD COLUMN IF NOT EXISTS download_failed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS download_error TEXT,
    ADD COLUMN IF NOT EXISTS failure_count INT NOT NULL DEFAULT 0;
