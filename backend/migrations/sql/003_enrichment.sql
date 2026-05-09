-- Fase 3 — campos de auditoria de enrichment.

ALTER TABLE properties
    ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS ix_properties_geocoded
    ON properties (geocoded_at) WHERE geocoded_at IS NULL AND status = 'active';

-- ocr_text é o texto bruto do PDF (deduplicação simples: NOT NULL = processado).
-- Já existe matricula_extracts.ocr_text. Deixar visível que '' (string vazia) significa
-- "tentamos OCR mas o PDF não tinha texto extraível" — diferente de NULL ("ainda não tentei").
COMMENT ON COLUMN matricula_extracts.ocr_text IS
    'Texto bruto extraído do PDF. NULL = ainda não processado. '''' = processado mas sem texto extraível.';

-- last_evaluated_at já existe via evaluated_at em neighborhoods. nada a alterar.
