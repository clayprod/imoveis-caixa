import { useState } from 'react'
import { Heart, Bed, Car, Ruler, ExternalLink, FileText, Tag, MapPin } from 'lucide-react'
import { RiskBadge, hasRiscos } from './RiskAlert'

const TYPE_LABEL = {
  apartamento: 'Apto',
  casa: 'Casa',
  terreno: 'Terreno',
  galpao: 'Galpao',
  sala_comercial: 'Sala',
  loja: 'Loja',
  comercial: 'Comercial',
}

function getFavoriteIds() {
  try {
    return JSON.parse(localStorage.getItem('favorite_property_ids') || '[]')
  } catch {
    return []
  }
}

function setFavoriteId(id, active) {
  const ids = new Set(getFavoriteIds().map(String))
  if (active) ids.add(String(id))
  else ids.delete(String(id))
  localStorage.setItem('favorite_property_ids', JSON.stringify([...ids]))
}

function brl(n) {
  if (n == null) return '-'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)
}

function modalidadeTone(modalidade = '') {
  const value = modalidade.toLowerCase()
  if (value.includes('direta')) return 'border-[var(--color-moss-500)]/25 bg-[var(--color-moss-50)] text-[var(--color-moss-700)]'
  if (value.includes('leil')) return 'border-[var(--color-rust)]/25 bg-[color-mix(in_oklab,var(--color-rust)_10%,var(--color-paper))] text-[var(--color-rust)]'
  if (value.includes('licita')) return 'border-[var(--color-amber)]/35 bg-[var(--color-amber)]/12 text-[color-mix(in_oklab,var(--color-amber)_75%,var(--color-ink))]'
  return 'border-[var(--color-line)] bg-[var(--color-paper-soft)] text-[var(--color-ink-soft)]'
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
  const [fav, setFav] = useState(() => property.favorited ?? getFavoriteIds().map(String).includes(String(property.id)))
  const fmtType = TYPE_LABEL[property.tipo_imovel] ?? property.tipo_imovel ?? '-'
  const modalidadeCls = modalidadeTone(property.modalidade_short)

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
              <span className={`rounded-full border px-2.5 py-0.5 text-[10.5px] font-700 ${modalidadeCls}`}>
                {property.modalidade_short}
              </span>
            )}
            {property.situacao && (
              <span className={`pill !py-0.5 !px-2.5 !text-[10.5px] ${property.situacao === 'desocupado' ? 'pill-amber' : 'pill-line'}`}>
                {property.situacao}
              </span>
            )}
            {property.aceita_fgts && <span className="pill pill-line !py-0.5 !px-2.5 !text-[10.5px]">FGTS</span>}
            {property.aceita_financiamento && <span className="pill pill-line !py-0.5 !px-2.5 !text-[10.5px]">Financia</span>}
            {hasRiscos(property) && <RiskBadge riscos={property.riscos_juridicos} />}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            const next = !fav
            setFav(next)
            setFavoriteId(property.id, next)
            onFavorite?.(next)
          }}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-line)] transition-colors ${
            fav ? 'bg-[var(--color-amber)] text-white' : 'bg-[var(--color-paper)] text-[var(--color-ink-mute)] hover:text-[var(--color-amber)]'
          }`}
          aria-label="favoritar"
        >
          <Heart size={14} className={fav ? 'fill-current heart-pop' : ''} />
        </button>
      </header>

      <div className="grid grid-cols-[1.05fr_1.25fr] gap-3 px-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[var(--color-paper-soft)]">
          {property.image ? (
            <img src={property.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-wider text-[var(--color-ink-mute)]">
              Sem foto
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col justify-between rounded-xl border border-[var(--color-line)] bg-[var(--color-paper-soft)] p-3">
          <div>
            <p className="font-mono text-[9.5px] uppercase tracking-wider text-[var(--color-ink-mute)]">preco de venda</p>
            <p className="mt-1 font-display text-[22px] font-800 leading-none text-[var(--color-ink)]">
              {brl(property.preco_venda)}
            </p>
            {property.valor_avaliacao != null && (
              <p className="mt-1 text-[11px] text-[var(--color-ink-mute)]">
                avaliacao Caixa {brl(property.valor_avaliacao)}
              </p>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[10.5px]">
            {property.desconto_percentual != null && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-paper)] px-2 py-0.5 text-[var(--color-ink-soft)]">
                <Tag size={10} /> {property.desconto_percentual.toFixed(1)}% desc.
              </span>
            )}
            {property.bairro_score != null && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-paper)] px-2 py-0.5 text-[var(--color-ink-soft)]">
                <MapPin size={10} /> bairro {property.bairro_score}/100
              </span>
            )}
          </div>
        </div>
      </div>

      <footer className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--color-line)] px-4 py-2.5">
        <MetaItem icon={Bed} value={property.quartos} suffix="q" />
        <MetaItem icon={Car} value={property.vagas} suffix="v" />
        {property.area_total_m2 ? (
          <MetaItem icon={Ruler} value={Number(property.area_total_m2).toFixed(0)} suffix="m2 total" />
        ) : property.area_terreno_m2 ? (
          <MetaItem icon={Ruler} value={Number(property.area_terreno_m2).toFixed(0)} suffix="m2 terreno" />
        ) : null}
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-mute)]">
          #{property.numero_imovel}
        </span>
      </footer>

      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-line)] bg-[var(--color-paper-soft)] px-4 py-2 text-[11px]">
        {property.link_caixa && (
          <a
            href={property.link_caixa}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--color-ink)] px-3 py-1.5 font-700 text-[var(--color-paper)] hover:bg-[var(--color-moss-700)]"
          >
            Abrir na Caixa <ExternalLink size={11} />
          </a>
        )}
        {property.link_matricula_pdf && (
          <a
            href={property.link_matricula_pdf}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-1.5 font-600 text-[var(--color-ink-soft)] hover:border-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
          >
            Matricula <FileText size={11} />
          </a>
        )}
      </div>
    </article>
  )
}
