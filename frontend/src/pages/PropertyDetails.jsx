import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Calendar, Eye, Percent, Heart, ArrowLeft, ChevronRight, Bed, Bath, Car, Ruler,
  Users, Bell, FileText, ExternalLink, Sparkles, TrendingUp, AlertCircle,
  CheckCircle, Building2, Hammer, Scroll, History, Receipt, Wallet, Share2
} from 'lucide-react'
import Sidebar from '../components/app/Sidebar'
import PropertyMap from '../components/app/PropertyMap'
import StatPill from '../components/app/StatPill'
import NeighborhoodPanel from '../components/app/NeighborhoodPanel'
import MarketComparison from '../components/app/MarketComparison'
import { RiskBanner, RiskBadge, hasRiscos } from '../components/app/RiskAlert'
import { MOCK_PROPERTIES } from '../lib/mockProperties'

const TYPE_LABEL = {
  apartamento: 'Apartamento', casa: 'Casa', terreno: 'Terreno',
  galpao: 'Galpão', sala_comercial: 'Sala comercial', loja: 'Loja',
}

function brl(n, opts = {}) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0, ...opts }).format(n ?? 0)
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const RECOMENDACAO_TONE = {
  comprar: { label: 'Recomenda compra', dot: 'bg-[var(--color-moss-500)]', text: 'text-[var(--color-moss-700)]' },
  analisar: { label: 'Analisar', dot: 'bg-[var(--color-amber)]', text: 'text-[color-mix(in_oklab,var(--color-amber)_85%,var(--color-ink))]' },
  evitar: { label: 'Evitar', dot: 'bg-[var(--color-rust)]', text: 'text-[var(--color-rust)]' },
}

export default function PropertyDetails() {
  const navigate = useNavigate()
  const { id } = useParams()
  const property = useMemo(() => MOCK_PROPERTIES.find((p) => String(p.id) === String(id)) ?? MOCK_PROPERTIES[0], [id])
  const [fav, setFav] = useState(property.favorited ?? false)

  const recomendacao = RECOMENDACAO_TONE[property.ai_recomendacao] ?? RECOMENDACAO_TONE.analisar

  // Stats do bairro pra pill central
  const neighborhood = {
    n_imoveis: property.bairro_eval?.amostra_n ?? '—',
    preco_m2_medio: property.bairro_eval?.preco_m2_medio ?? null,
    score_medio: property.bairro_eval?.score ?? property.bairro_score ?? '—',
  }

  const isLeilao = property.modalidade_short?.toLowerCase().includes('leil') || property.modalidade_short?.toLowerCase().includes('licit')

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />

      <main className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pl-0">
        {/* breadcrumb + ações */}
        <nav className="rise-in flex items-center gap-1.5 text-[12px] font-500 text-[var(--color-ink-mute)]">
          <button
            onClick={() => navigate('/search')}
            className="flex items-center gap-1 rounded-full px-2 py-1 hover:bg-[var(--color-paper-soft)] hover:text-[var(--color-ink)]"
          >
            <ArrowLeft size={13} />
            Buscar
          </button>
          <ChevronRight size={12} />
          <span>{property.uf}</span>
          <ChevronRight size={12} />
          <span>{property.cidade}</span>
          <ChevronRight size={12} />
          <span className="text-[var(--color-ink)]">{property.numero_imovel}</span>
          <span className="ml-auto flex items-center gap-2">
            <button className="flex items-center gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-1.5 text-[var(--color-ink)] hover:border-[var(--color-ink-soft)]">
              <Share2 size={12} /> Compartilhar
            </button>
            <button
              onClick={() => setFav((v) => !v)}
              className={`flex items-center gap-1 rounded-full border px-3 py-1.5 transition-colors ${
                fav
                  ? 'border-[var(--color-amber)] bg-[var(--color-amber)] text-[var(--color-ink)]'
                  : 'border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:border-[var(--color-ink-soft)]'
              }`}
            >
              <Heart size={12} className={fav ? 'fill-current' : ''} />
              {fav ? 'Favoritado' : 'Favoritar'}
            </button>
          </span>
        </nav>

        {/* Banner de riscos jurídicos — aparece logo após breadcrumb se houver */}
        {hasRiscos(property) && (
          <RiskBanner
            riscos={property.riscos_juridicos}
            raw={property.riscos_juridicos_raw}
          />
        )}

        {/* MAPA — pill stats deslocada pro topo, longe dos cards de baixo */}
        <section className="rise-in relative h-[380px] shrink-0" style={{ animationDelay: '60ms' }}>
          <PropertyMap properties={[property]} highlightId={property.id} />

          <div className="pointer-events-none absolute left-1/2 top-6 z-[400] flex -translate-x-1/2 items-stretch gap-0 rounded-[18px] bg-[var(--color-ink)] p-1 shadow-[var(--shadow-pop)]">
            <StatBlock value={neighborhood.n_imoveis} label="imóveis no bairro" />
            <Divider />
            <StatBlock value={neighborhood.preco_m2_medio ? `R$ ${Math.round(neighborhood.preco_m2_medio).toLocaleString('pt-BR')}` : '—'} label="preço/m² médio" small />
            <Divider />
            <StatBlock value={neighborhood.score_medio} label="score do bairro" suffix="/100" />
          </div>
        </section>

        {/* LINHA 1: Localização + foto + Watchlist */}
        <section className="grid grid-cols-[1.1fr_1fr_0.85fr] gap-4 rise-in" style={{ animationDelay: '120ms' }}>
          {/* Localização + atributos físicos */}
          <article className="card-paper flex flex-col gap-4 p-5">
            <header className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {property.nome_empreendimento && (
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-mute)]">
                    {property.nome_empreendimento}
                  </p>
                )}
                <h2 className="mt-0.5 font-display text-[17px] font-700 leading-tight text-[var(--color-ink)]">
                  {property.endereco_short}
                </h2>
                <p className="mt-1 text-[11.5px] leading-snug text-[var(--color-ink-mute)]">
                  {property.endereco_full}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1">
                  <span className="pill pill-line !py-0.5 !px-2.5 !text-[10.5px]">{TYPE_LABEL[property.tipo_imovel] ?? property.tipo_imovel}</span>
                  {property.modalidade_short && <span className="pill pill-moss !py-0.5 !px-2.5 !text-[10.5px]">{property.modalidade_short}</span>}
                  <span className={`pill !py-0.5 !px-2.5 !text-[10.5px] ${property.situacao === 'desocupado' ? 'pill-amber' : 'pill-line'}`}>
                    {property.situacao}
                  </span>
                  {property.aceita_fgts && <span className="pill pill-line !py-0.5 !px-2.5 !text-[10.5px]">FGTS</span>}
                  {property.aceita_financiamento && <span className="pill pill-line !py-0.5 !px-2.5 !text-[10.5px]">Financia</span>}
                </div>
              </div>
            </header>

            <div className="grid grid-cols-3 gap-2">
              <StatPill icon={Calendar} label="Construção" value={property.matricula?.ano_construcao_estimado ?? '—'} />
              <StatPill icon={Users} label="Watchers" value={(property.watchers ?? 0).toLocaleString('pt-BR')} tone="moss" />
              <StatPill icon={Percent} label="Desconto" value={property.desconto_percentual?.toFixed(1) ?? '—'} suffix="%" tone="amber" />
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-[var(--color-line)] pt-4 text-[12.5px]">
              {property.quartos != null && <Row icon={Bed} label="Quartos" value={property.quartos} />}
              {property.banheiros != null && <Row icon={Bath} label="Banheiros" value={property.banheiros} />}
              {property.vagas != null && <Row icon={Car} label="Vagas" value={property.vagas} />}
              {property.area_total_m2 && <Row icon={Ruler} label="Área total" value={`${property.area_total_m2}m²`} />}
              {property.area_construida_m2 && <Row icon={Ruler} label="Construída" value={`${property.area_construida_m2}m²`} />}
              {property.area_privativa_m2 && <Row icon={Ruler} label="Privativa" value={`${property.area_privativa_m2}m²`} />}
              {property.area_terreno_m2 && <Row icon={Ruler} label="Terreno" value={`${property.area_terreno_m2}m²`} />}
              {property.matricula_numero && <Row icon={FileText} label="Matrícula" value={property.matricula_numero} />}
              {property.comarca && <Row icon={Building2} label="Comarca" value={property.comarca} />}
            </div>
          </article>

          {/* foto principal */}
          <article className="card-paper relative overflow-hidden p-0">
            {property.image && <img src={property.image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-ink)]/75 via-[var(--color-ink)]/10 to-transparent" />
            <div className="relative flex h-full flex-col justify-end gap-2 p-5">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-[28px] font-800 leading-none tracking-tight text-[var(--color-paper)]">
                  {brl(property.preco_venda)}
                </span>
                <span className="text-[12px] font-500 text-[var(--color-paper)]/70 line-through">
                  {brl(property.valor_avaliacao)}
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-paper)]/80">
                {property.modalidade_short} · #{property.numero_imovel}
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                <button className="rounded-full bg-[var(--color-amber)] px-4 py-2 text-[12.5px] font-700 text-[var(--color-ink)] shadow-md hover:opacity-95">
                  Fazer proposta
                </button>
                {property.link_matricula_pdf && (
                  <a href={property.link_matricula_pdf} target="_blank" rel="noreferrer"
                    className="rounded-full border border-white/30 bg-white/15 px-3 py-2 text-[12px] font-500 text-[var(--color-paper)] backdrop-blur-sm hover:bg-white/25">
                    <FileText size={11} className="inline mr-1" /> Matrícula
                  </a>
                )}
              </div>
            </div>
          </article>

          {/* Watchlist */}
          <article className="card-paper flex flex-col gap-4 p-5">
            <header className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-amber)] text-[var(--color-ink)]">
                <Bell size={17} />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-[15px] font-700 leading-tight text-[var(--color-ink)]">
                  Watchlist
                </h3>
                <p className="mt-1 text-[11.5px] leading-snug text-[var(--color-ink-mute)]">
                  Alertas no WhatsApp se preço cair, edital sair, leilão chegar.
                </p>
              </div>
            </header>

            <div className="relative flex flex-1 items-center justify-center py-2">
              <svg viewBox="0 0 120 70" className="w-full max-w-[180px]">
                <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="var(--color-line)" strokeWidth="9" strokeLinecap="round" />
                <path
                  d="M 10 60 A 50 50 0 0 1 110 60"
                  fill="none"
                  stroke="var(--color-amber)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray="157"
                  strokeDashoffset={157 - 157 * Math.min((property.watchers ?? 0) / 5000, 1)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                <span className="font-display text-[26px] font-800 leading-none tracking-tight text-[var(--color-ink)]">
                  {(property.watchers ?? 0) >= 1000 ? `${((property.watchers ?? 0) / 1000).toFixed(1)}k` : property.watchers ?? 0}
                </span>
                <span className="mt-1 font-mono text-[9px] uppercase tracking-wider text-[var(--color-ink-mute)]">
                  monitorando
                </span>
              </div>
            </div>

            <button className="w-full rounded-full bg-[var(--color-ink)] py-2.5 text-[13px] font-600 text-[var(--color-paper)] transition-colors hover:bg-[var(--color-moss-700)]">
              Adicionar à watchlist
            </button>
          </article>
        </section>

        {/* LINHA 2: Análise IA + Avaliação Bairro */}
        <section className="grid grid-cols-[1.1fr_1fr] gap-4 rise-in" style={{ animationDelay: '180ms' }}>
          {/* IA */}
          <article className="card-paper p-5">
            <header className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-[var(--color-amber)]" />
                <h3 className="font-display text-[15px] font-700 text-[var(--color-ink)]">Análise IA</h3>
              </div>
              {property.ai_score != null && (
                <span className="font-mono text-[11px] text-[var(--color-ink-mute)]">
                  modelo · llama-3.3
                </span>
              )}
            </header>

            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl bg-[var(--color-paper-soft)] p-4">
              <div className="relative">
                <svg viewBox="0 0 60 60" className="h-16 w-16 -rotate-90">
                  <circle cx="30" cy="30" r="26" fill="none" stroke="var(--color-line)" strokeWidth="5" />
                  <circle
                    cx="30" cy="30" r="26"
                    fill="none"
                    stroke={(property.ai_score ?? 0) >= 70 ? '#6f8861' : (property.ai_score ?? 0) >= 50 ? '#c89a3a' : '#c2683f'}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 26}
                    strokeDashoffset={2 * Math.PI * 26 * (1 - (property.ai_score ?? 0) / 100)}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-[18px] font-800 leading-none">{property.ai_score ?? '—'}</span>
                  <span className="font-mono text-[8px] uppercase text-[var(--color-ink-mute)]">/100</span>
                </div>
              </div>
              <div>
                <p className="flex items-center gap-1.5 font-display text-[14px] font-700 capitalize">
                  <span className={`h-2 w-2 rounded-full ${recomendacao.dot}`} />
                  {recomendacao.label}
                </p>
                <p className="mt-1 text-[11.5px] text-[var(--color-ink-soft)]">
                  {property.ai_estrategia ?? 'Estratégia em análise.'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-mute)]">ROI estimado</p>
                <p className="mt-0.5 font-display text-[14px] font-700 text-[var(--color-moss-700)]">
                  {property.ai_roi_estimado ?? '—'}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-[var(--color-moss-50)] p-3">
                <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-moss-700)]">
                  <CheckCircle size={11} /> a favor
                </p>
                <ul className="mt-2 space-y-1 text-[11.5px] text-[var(--color-ink-soft)]">
                  {(property.ai_pros ?? []).slice(0, 5).map((s, i) => (<li key={i}>· {s}</li>))}
                </ul>
              </div>
              <div className="rounded-xl bg-[color-mix(in_oklab,var(--color-rust)_10%,var(--color-paper))] p-3">
                <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-rust)]">
                  <AlertCircle size={11} /> riscos
                </p>
                <ul className="mt-2 space-y-1 text-[11.5px] text-[var(--color-ink-soft)]">
                  {(property.ai_riscos ?? []).slice(0, 5).map((s, i) => (<li key={i}>· {s}</li>))}
                </ul>
              </div>
            </div>
          </article>

          {/* Comparativo de mercado (Zap/VivaReal/etc consolidado por LLM) */}
          <MarketComparison
            data={property.mercado_similar}
            preco_venda={property.preco_venda}
            valor_avaliacao={property.valor_avaliacao}
          />
        </section>

        {/* LINHA 3: Avaliação Bairro + Histórico matrícula */}
        <section className="grid grid-cols-[1fr_1.1fr] gap-4 rise-in" style={{ animationDelay: '210ms' }}>
          {property.bairro_eval ? (
            <NeighborhoodPanel
              uf={property.uf}
              cidade={property.cidade}
              bairro={property.bairro}
              eval={property.bairro_eval}
              sample_n={property.bairro_eval.amostra_n}
            />
          ) : (
            <article className="card-paper flex items-center justify-center p-5 text-[12px] text-[var(--color-ink-mute)]">
              Avaliação do bairro em processamento.
            </article>
          )}

          {/* Histórico OCR */}
          <article className="card-paper p-5">
            <header className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={14} className="text-[var(--color-ink-soft)]" />
                <h3 className="font-display text-[15px] font-700 text-[var(--color-ink)]">Histórico da matrícula</h3>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-mute)]">
                via ocr + ia
              </span>
            </header>

            {property.matricula ? (
              <>
                <div className="mb-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-[var(--color-paper-soft)] p-3">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-mute)]">Proprietário atual</p>
                    <p className="mt-1 truncate font-display text-[12.5px] font-700 text-[var(--color-ink)]">
                      {property.matricula.donos_atuais?.[0]?.nome ?? '—'}
                    </p>
                    {property.matricula.donos_atuais?.[0]?.cpf_cnpj && (
                      <p className="font-mono text-[10px] text-[var(--color-ink-mute)]">
                        {property.matricula.donos_atuais[0].cpf_cnpj}
                      </p>
                    )}
                  </div>
                  <div className="rounded-xl bg-[var(--color-paper-soft)] p-3">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-mute)]">Construção</p>
                    <p className="mt-1 font-display text-[15px] font-700 text-[var(--color-ink)]">
                      {property.matricula.ano_construcao_estimado ?? '—'}
                    </p>
                  </div>
                </div>

                {property.matricula.vendas_anteriores?.length > 0 && (
                  <>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-mute)]">Transferências</p>
                    <ul className="mt-2 space-y-1.5">
                      {property.matricula.vendas_anteriores.map((v, i) => (
                        <li key={i} className="flex items-center justify-between gap-3 rounded-lg bg-[var(--color-paper-soft)] px-3 py-2 text-[11.5px]">
                          <span className="font-mono text-[10px] text-[var(--color-ink-mute)]">{fmtDate(v.data)}</span>
                          <span className="min-w-0 flex-1 truncate text-[var(--color-ink-soft)]">
                            {v.vendedor} → {v.comprador}
                          </span>
                          <span className="font-display text-[12px] font-700 text-[var(--color-ink)]">
                            {brl(v.valor)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            ) : (
              <p className="text-[12px] text-[var(--color-ink-mute)]">
                Matrícula em processamento. Será feita só pra imóveis em watchlists ou amostra inicial — pra não desperdiçar tokens.
              </p>
            )}
          </article>

        </section>

        {/* LINHA 4: Leilão & Documentos + Formas de pagamento */}
        <section className="grid grid-cols-2 gap-4 rise-in" style={{ animationDelay: '270ms' }}>
          {/* Leiloeiro / Documentos */}
          <article className="card-paper flex flex-col gap-4 p-5">
            <header className="flex items-center gap-2">
              {isLeilao ? <Hammer size={14} className="text-[var(--color-rust)]" /> : <Scroll size={14} className="text-[var(--color-ink-soft)]" />}
              <h3 className="font-display text-[15px] font-700 text-[var(--color-ink)]">
                {isLeilao ? 'Leilão & Documentos' : 'Documentos'}
              </h3>
            </header>

            {isLeilao && property.nome_leiloeiro && (
              <div className="rounded-2xl bg-[color-mix(in_oklab,var(--color-rust)_8%,var(--color-paper))] p-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-rust)]">Pregoeiro externo</p>
                <p className="mt-1 font-display text-[13.5px] font-700 text-[var(--color-ink)]">
                  {property.nome_leiloeiro}
                </p>
                {property.edital && (
                  <p className="font-mono text-[10.5px] text-[var(--color-ink-mute)]">Edital {property.edital}</p>
                )}
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  {property.data_leilao_1 && (
                    <div>
                      <p className="font-mono text-[9px] uppercase text-[var(--color-ink-mute)]">1º leilão</p>
                      <p className="font-display text-[12px] font-700">{fmtDate(property.data_leilao_1)}</p>
                      {property.valor_leilao_1 && <p className="text-[10.5px] text-[var(--color-ink-soft)]">{brl(property.valor_leilao_1)}</p>}
                    </div>
                  )}
                  {property.data_leilao_2 && (
                    <div>
                      <p className="font-mono text-[9px] uppercase text-[var(--color-ink-mute)]">2º leilão</p>
                      <p className="font-display text-[12px] font-700">{fmtDate(property.data_leilao_2)}</p>
                      {property.valor_leilao_2 && <p className="text-[10.5px] text-[var(--color-ink-soft)]">{brl(property.valor_leilao_2)}</p>}
                    </div>
                  )}
                </div>
                {property.link_pregoeiro && (
                  <a href={property.link_pregoeiro} target="_blank" rel="noreferrer"
                    className="mt-3 flex items-center justify-between gap-2 rounded-full bg-[var(--color-ink)] px-3 py-2 text-[12px] font-600 text-[var(--color-paper)] hover:bg-[var(--color-moss-700)]">
                    <span>Site do leiloeiro</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}

            <ul className="space-y-1.5">
              {property.link_matricula_pdf && (
                <DocLink label="Matrícula do imóvel" href={property.link_matricula_pdf} />
              )}
              {property.link_edital_pdf && (
                <DocLink label="Edital e anexos" href={property.link_edital_pdf} />
              )}
              <DocLink label="Lista de corretores credenciados" href="#" muted />
              <DocLink label="Regras da venda online" href="#" muted />
            </ul>
          </article>

          {/* Formas de pagamento — agora ao lado do leilão na linha 4 */}
          <article className="card-paper p-5">
            <header className="mb-3 flex items-center gap-2">
              <Wallet size={14} className="text-[var(--color-moss-700)]" />
              <h3 className="font-display text-[15px] font-700 text-[var(--color-ink)]">Formas de pagamento aceitas</h3>
            </header>
            <ul className="space-y-1.5">
              {(property.formas_pagamento ?? []).map((f, i) => (
                <li key={i} className="flex items-start gap-2 rounded-lg bg-[var(--color-paper-soft)] px-3 py-2 text-[12px]">
                  <CheckCircle size={13} className="mt-0.5 shrink-0 text-[var(--color-moss-500)]" />
                  <span className="text-[var(--color-ink-soft)]">{f}</span>
                </li>
              ))}
              {(property.formas_pagamento ?? []).length === 0 && (
                <li className="text-[12px] text-[var(--color-ink-mute)]">Sem dados disponíveis.</li>
              )}
            </ul>
          </article>
        </section>

        {/* LINHA 5: Regras de despesas (full width) */}
        <section className="rise-in pb-2" style={{ animationDelay: '330ms' }}>
          <article className="card-paper p-5">
            <header className="mb-3 flex items-center gap-2">
              <Receipt size={14} className="text-[var(--color-rust)]" />
              <h3 className="font-display text-[15px] font-700 text-[var(--color-ink)]">Regras de pagamento das despesas</h3>
            </header>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.entries(property.regras_despesas ?? {}).map(([k, v]) => (
                <li key={k} className="rounded-lg bg-[var(--color-paper-soft)] px-3 py-2 text-[12px]">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-mute)]">{k}</p>
                  <p className="mt-0.5 leading-relaxed text-[var(--color-ink-soft)]">{v}</p>
                </li>
              ))}
              {Object.keys(property.regras_despesas ?? {}).length === 0 && (
                <li className="text-[12px] text-[var(--color-ink-mute)]">Sem regras explícitas — verificar edital.</li>
              )}
            </ul>
          </article>
        </section>
      </main>
    </div>
  )
}

function StatBlock({ value, label, suffix, small }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-3 text-[var(--color-paper)]">
      <span className={`font-display ${small ? 'text-[19px]' : 'text-[24px]'} font-800 leading-none tracking-tight ${typeof value === 'string' && value.startsWith('R$') ? '' : 'text-[var(--color-amber-soft)]'}`}>
        {value}{suffix && <span className="ml-0.5 text-[10px] text-[var(--color-paper)]/50">{suffix}</span>}
      </span>
      <span className="mt-1.5 font-mono text-[9px] uppercase tracking-wider text-[var(--color-paper)]/60">
        {label}
      </span>
    </div>
  )
}

function Divider() {
  return <div className="my-2 w-px bg-[var(--color-paper)]/15" />
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-paper-soft)] px-3 py-2">
      <span className="flex min-w-0 items-center gap-1.5 truncate text-[11.5px] font-500 text-[var(--color-ink-mute)]">
        <Icon size={12} /> {label}
      </span>
      <span className="font-display text-[12.5px] font-600 text-[var(--color-ink)]">{value}</span>
    </div>
  )
}

function DocLink({ label, href, muted }) {
  return (
    <li>
      <a href={href} target="_blank" rel="noreferrer"
        className={[
          'flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[12px] transition-colors',
          muted
            ? 'text-[var(--color-ink-mute)] hover:bg-[var(--color-paper-soft)] hover:text-[var(--color-ink)]'
            : 'bg-[var(--color-paper-soft)] text-[var(--color-ink)] hover:bg-[var(--color-line)]',
        ].join(' ')}
      >
        <span className="flex items-center gap-2">
          <FileText size={12} className="opacity-60" /> {label}
        </span>
        <ExternalLink size={11} className="opacity-50" />
      </a>
    </li>
  )
}
