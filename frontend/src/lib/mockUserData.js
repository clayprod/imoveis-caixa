/**
 * Mock dos dados "do usuário" — telefones cadastrados, watchlists e alertas.
 * Substituir por fetch quando os endpoints `/api/me/*` existirem.
 */

import { MOCK_PROPERTIES } from './mockProperties'

/* ============================================================
   Telefones / canais de notificação
   ============================================================ */

export const MOCK_USER_PHONES = [
  {
    id: 'phone_clayton_main',
    label: 'Meu celular',
    number: '+5511999990000',
    instance: 'claytoncosta',
    is_default: true,
    verified: true,
    created_at: '2026-04-01',
  },
  {
    id: 'phone_socio',
    label: 'Sócio (André)',
    number: '+5511988887777',
    instance: 'claytoncosta',
    is_default: false,
    verified: true,
    created_at: '2026-04-15',
  },
]

/* ============================================================
   Watchlists ativas
   ============================================================ */

export const MOCK_WATCHLISTS = [
  {
    id: 'wl_sp_capital',
    name: 'SP capital — apartamentos com bom desconto',
    description: 'Apartamentos em SP capital com 40%+ de desconto e até R$ 250k',
    active: true,
    created_at: '2026-04-12',
    matches_count: 38,
    last_match_at: '2026-05-08T14:22:00Z',
    filters: {
      uf: 'SP',
      cidade: null,
      bairro: null,
      tipo_imovel: 'apartamento',
      preco_max: 250000,
      desconto_min: 40,
      quartos_min: 2,
      aceita_fgts: true,
      somente_desocupados: false,
      score_bairro_min: 60,
    },
    channels: {
      email: false,
      push: true,
      whatsapp_phone_ids: ['phone_clayton_main'],
      reminders: { '7d': true, '1d': true, '1h': true },
    },
  },
  {
    id: 'wl_ribeirao',
    name: 'Ribeirão Preto — gravame ok',
    description: 'Tudo em Ribeirão Preto, vou avaliar caso a caso',
    active: true,
    created_at: '2026-05-01',
    matches_count: 12,
    last_match_at: '2026-05-09T09:45:00Z',
    filters: {
      uf: 'SP',
      cidade: 'Ribeirão Preto',
      desconto_min: 30,
    },
    channels: {
      email: true,
      push: true,
      whatsapp_phone_ids: ['phone_clayton_main', 'phone_socio'],
      reminders: { '7d': true, '1d': true, '1h': false },
    },
  },
  {
    id: 'wl_leiloes_proximos',
    name: 'Leilões próximos (qualquer UF)',
    description: 'Leilões SFI ou Licitação acontecendo nas próximas 2 semanas',
    active: false,
    created_at: '2026-03-20',
    matches_count: 5,
    last_match_at: '2026-04-30T10:00:00Z',
    filters: {
      modalidade: 'Leilão SFI',
      leilao_iminente: true,
    },
    channels: {
      email: false,
      push: false,
      whatsapp_phone_ids: ['phone_clayton_main'],
      reminders: { '7d': false, '1d': true, '1h': true },
    },
  },
]

/* ============================================================
   Histórico de alertas (auction reminders + price drop + new match)
   ============================================================ */

export const MOCK_ALERTS = [
  {
    id: 'alert_1',
    watchlist_id: 'wl_ribeirao',
    watchlist_name: 'Ribeirão Preto — gravame ok',
    property_id: 1,
    property_summary: 'R. José de Alcântara, 765 — apto 34',
    reason: 'leilao_1_h7d',
    reason_label: '1º leilão em 7 dias',
    matched_at: '2026-05-09T09:45:00Z',
    delivered_at: '2026-05-09T09:46:00Z',
    channels_delivered: { whatsapp: ['+5511999990000', '+5511988887777'], push: true },
  },
  {
    id: 'alert_2',
    watchlist_id: 'wl_sp_capital',
    watchlist_name: 'SP capital — apartamentos com bom desconto',
    property_id: 1,
    property_summary: 'R. José de Alcântara, 765 — apto 34',
    reason: 'novo_match',
    reason_label: 'Novo imóvel bate com filtros',
    matched_at: '2026-05-08T14:22:00Z',
    delivered_at: '2026-05-08T14:23:00Z',
    channels_delivered: { whatsapp: ['+5511999990000'], push: true },
  },
  {
    id: 'alert_3',
    watchlist_id: 'wl_sp_capital',
    watchlist_name: 'SP capital — apartamentos com bom desconto',
    property_id: 5,
    property_summary: 'R. Hortência Ribeiro, 485',
    reason: 'queda_preco',
    reason_label: 'Queda de preço de 12%',
    matched_at: '2026-05-07T20:11:00Z',
    delivered_at: '2026-05-07T20:11:00Z',
    channels_delivered: { whatsapp: ['+5511999990000'], push: true },
  },
  {
    id: 'alert_4',
    watchlist_id: 'wl_leiloes_proximos',
    watchlist_name: 'Leilões próximos (qualquer UF)',
    property_id: 6,
    property_summary: 'Total Ville Pitangueiras',
    reason: 'leilao_1_h1d',
    reason_label: '1º leilão amanhã',
    matched_at: '2026-05-12T13:00:00Z',
    delivered_at: null,  // ainda não entregue
    channels_delivered: null,
  },
]

/** IDs de imóveis favoritados pelo usuário. Em prod virá de tabela favorites. */
export const MOCK_FAVORITES_IDS = [1, 5, 6]

export function getFavoriteProperties() {
  return MOCK_PROPERTIES.filter((p) => MOCK_FAVORITES_IDS.includes(p.id))
}
