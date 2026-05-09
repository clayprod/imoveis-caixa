-- Riscos jurídicos averbados na matrícula que aparecem no detalhe do imóvel.
-- Padrões observados na Caixa (canto inferior direito, junto às regras de despesas):
--   "Imóvel com gravame/penhora/indisponibilidade averbada na matrícula"
--   "Regularização por conta do adquirente"
--   "Ação judicial em curso"
--   etc.
--
-- Guardamos como array de strings normalizado (taxonomia mínima):
--   ['gravame', 'penhora', 'indisponibilidade', 'regularizacao_adquirente',
--    'acao_judicial', 'hipoteca', 'litigio']
-- + texto bruto pra auditoria.

ALTER TABLE property_details
    ADD COLUMN IF NOT EXISTS riscos_juridicos JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS riscos_juridicos_raw TEXT;

CREATE INDEX IF NOT EXISTS ix_property_details_riscos
    ON property_details USING gin (riscos_juridicos);
