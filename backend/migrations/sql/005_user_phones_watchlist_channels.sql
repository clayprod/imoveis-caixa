-- Múltiplos números de WhatsApp por usuário + ajuste no schema de watchlists.
--
-- Filosofia: o usuário cadastra N "phones" (cada um com label, número, instance
-- do Evolution API e flag is_default). Cada watchlist seleciona QUAIS phones
-- recebem alertas via channels.whatsapp_phone_ids = [phone_id, ...].

CREATE TABLE IF NOT EXISTS user_phones (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    label TEXT NOT NULL,                 -- ex: "Meu celular", "Sócio André"
    number TEXT NOT NULL,                -- E.164: "+5511999990000"
    instance TEXT NOT NULL,              -- nome da instância no Evolution
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, number)
);
CREATE INDEX IF NOT EXISTS ix_user_phones_user ON user_phones (user_id);

-- Apenas um phone "default" por usuário.
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_phones_default
    ON user_phones (user_id) WHERE is_default;

-- O schema de `watchlists.channels` JSONB já existe (001_init.sql).
-- Convenção a partir de agora — documentar via COMMENT:
COMMENT ON COLUMN watchlists.channels IS
$$Schema:
{
  "email": bool,
  "push": bool,
  "whatsapp_phone_ids": [int, ...],   -- referencia user_phones.id
  "reminders": {"7d": bool, "1d": bool, "1h": bool}
}$$;

-- View útil pro auction_reminders worker — retorna alerts pendentes
-- ENRIQUECIDOS com os números a despachar (n8n consome direto).
CREATE OR REPLACE VIEW v_alerts_pending_dispatch AS
SELECT
    a.id          AS alert_id,
    a.watchlist_id,
    a.property_id,
    a.reason,
    a.matched_at,
    w.user_id,
    w.name        AS watchlist_name,
    w.channels,
    p.numero_imovel,
    p.endereco,
    p.cidade,
    p.uf,
    p.preco_venda,
    p.desconto_percentual,
    p.link_caixa,
    -- Resolve os phones selecionados (label + number + instance):
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object(
                 'id', up.id,
                 'label', up.label,
                 'number', up.number,
                 'instance', up.instance
               ))
        FROM jsonb_array_elements_text(w.channels->'whatsapp_phone_ids') x(pid)
        JOIN user_phones up
          ON up.id::text = x.pid
         AND up.user_id = w.user_id
      ),
      '[]'::jsonb
    ) AS dispatch_targets
FROM alerts a
JOIN watchlists w ON w.id = a.watchlist_id
JOIN properties p ON p.id = a.property_id
WHERE a.delivered_at IS NULL
  AND w.active;
