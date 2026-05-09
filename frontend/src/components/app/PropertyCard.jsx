import { useState } from 'react'
import { Heart, Bed, Car, Ruler, Star } from 'lucide-react'
import StatPill from './StatPill'
import { RiskBadge, hasRiscos } from './RiskAlert'

const TYPE_LABEL = {
  apartamento: 'Apto',
  casa: 'Casa',
  terreno: 'Terreno',
  galpao: 'Galpão',
  sala_comercial: 'Sala',
  loja: 'Loja',
  comercial: 'Comercial',
}

function brl(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)
}

function MetaItem({ icon: Icon, value, suffix }) {
  if (value == null || value === '') return null
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-500 text-[var(--color-ink-soft)]">
      <Icon size={13} strokeWidth={2} className="text-[var(--color-ink-mute)]" />
      {value}{suffix && <span className="text-[var(--color-ink-mute)]">{suffix}</span>}
    </span>
  )
}

export default function PropertyCard({ property, onClick, onFavorite }) {
  const [fav, setFav] = useState(property.favorited)
  const fmtType = TYPE_LABEL[property.tipo_imovel] ?? property.tipo_imovel ?? '—'
  const area = property.area_total_m2 ?? property.area_terreno_m2

  return (
    <article
      onClick={onClick}
      className="card-paper cursor-pointer overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
    >
      <header className="flex items-start justify-between gap-3 px-4 pt-4 pb-2.5">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-[14.5px] font-700 leading-tight text-[var(--color-ink)]">
            {property.endereco_short}
          </h3>
          <p className="mt-0.5 truncate text-[11.5px] font-500 text-[var(--color-ink-mute)]">
            {property.bairro} · {property.cidade}/{property.uf}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            <span className="pill pill-line !py-0.5 !px-2.5 !text-[10.5px]">{fmtType}</span>
            {property.modalidade_short && (
              <span className="pill pill-moss !py-0.5 !px-2.5 !text-[10.5px]">{property.modalidade_short}</span>
            )}
            {property.situacao && (
              <span className={`pill !py-0.5 !px-2.5 !text-[10.5px] ${property.situacao === 'desocupado' ? 'pill-amber' : 'pill-line'}`}>
                {property.situacao}
              </span>
            )}
            {property.aceita_fgts && (
              <span className="pill pill-line !py-0.5 !px-2.5 !text-[10.5px]">FGTS</span>
            )}
            {property.aceita_financiamento && (
              <span className="pill pill-line !py-0.5 !px-2.5 !text-[10.5px]">Financia</span>
            )}
            {hasRiscos(property) && <RiskBadge riscos={property.riscos_juridicos} />}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setFav((v) => !v)
            onFavorite?.(!fav)
          }}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-line)] transition-colors ${
            fav ? 'bg-[var(--color-amber)] text-white' : 'bg-[var(--color-paper)] text-[var(--color-ink-mute)] hover:text-[var(--color-amber)]'
          }`}
          aria-label="favoritar"
        >
          <Heart size={14} className={fav ? 'fill-current heart-pop' : ''} />
        </button>
      </header>

      <div className="grid grid-cols-[1.05fr_0.85fr_0.85fr] gap-2 px-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[var(--color-paper-soft)]">
          {property.image ? (
            <img src={property.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-wider text-[var(--color-ink-mute)]">
              Sem foto
            </div>
          )}
          <div className="absolute bottom-1.5 left-1.5 rounded-full bg-[var(--color-ink)]/85 px-2 py-0.5 text-[10.5px] font-700 text-[var(--color-paper)] backdrop-blur">
            {brl(property.preco_venda)}
          </div>
        </div>

        <StatPill
          icon={Star}
          label="Score bairro"
          value={property.bairro_score ?? '—'}
          suffix={property.bairro_score != null ? '/100' : null}
          tone="moss"
        />
        <StatPill
          label="Desconto"
          value={property.desconto_percentual?.toFixed(1) ?? '—'}
          suffix="%"
          tone="amber"
        />
      </div>

      {/* meta inline: dados dos scrapers */}
      <footer className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--color-line)] px-4 py-2.5">
        <MetaItem icon={Bed} value={property.quartos} suffix="q" />
        <MetaItem icon={Car} value={property.vagas} suffix="v" />
        {property.area_total_m2 ? (
          <MetaItem icon={Ruler} value={Number(property.area_total_m2).toFixed(0)} suffix="m² total" />
        ) : property.area_terreno_m2 ? (
          <MetaItem icon={Ruler} value={Number(property.area_terreno_m2).toFixed(0)} suffix="m² terreno" />
        ) : null}
        {property.area_construida_m2 && (
          <MetaItem icon={Ruler} value={Number(property.area_construida_m2).toFixed(0)} suffix="m² constr." />
        )}
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-mute)]">
          #{property.numero_imovel}
        </span>
      </footer>

      {/* preço comparativo: aval. Caixa + vs mercado */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--color-line)] bg-[var(--color-paper-soft)] px-4 py-2 text-[11px]">
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-mute)]">
          aval. caixa
        </span>
        <span className="font-display text-[12px] font-600 text-[var(--color-ink-soft)]">
          {brl(property.valor_avaliacao)}
        </span>
        {property.mercado_similar?.preco_medio && (
          <>
            <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-[var(--color-moss-700)]">
              vs mercado
            </span>
            <span className="font-display text-[12px] font-700 text-[var(--color-moss-700)]">
              -{(((property.mercado_similar.preco_medio - property.preco_venda) / property.mercado_similar.preco_medio) * 100).toFixed(0)}%
            </span>
          </>
        )}
      </div>
    </article>
  )
}
