import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/app/Sidebar'
import PropertyFilters, { SORT_OPTIONS } from '../components/app/PropertyFilters'
import PropertyCard from '../components/app/PropertyCard'
import PropertyMap from '../components/app/PropertyMap'
import NeighborhoodPanel from '../components/app/NeighborhoodPanel'
import { MOCK_PROPERTIES, MOCK_FILTER_OPTIONS } from '../lib/mockProperties'

const TYPE_FILTER_NORMALIZED = (s) => (s ?? '').toLowerCase()

function applyFilters(items, query, filters) {
  const q = query.trim().toLowerCase()
  return items.filter((p) => {
    if (q && !`${p.endereco_short} ${p.endereco_full} ${p.numero_imovel} ${p.bairro} ${p.cidade}`.toLowerCase().includes(q)) return false
    if (filters.modalidade && p.modalidade_short && !filters.modalidade.toLowerCase().includes(p.modalidade_short.toLowerCase().split(' ')[0])) {
      // matching tolerante: "Leilão SFI - Edital Único" filter casa com card "Leilão SFI"
      const f = filters.modalidade.toLowerCase()
      const m = p.modalidade_short.toLowerCase()
      if (!f.includes(m.split(' ')[0]) && !m.includes(f.split(' ')[0])) return false
    }
    if (filters.tipo_imovel && TYPE_FILTER_NORMALIZED(p.tipo_imovel) !== filters.tipo_imovel) return false
    if (filters.uf && p.uf !== filters.uf) return false
    if (filters.cidade && p.cidade !== filters.cidade) return false
    if (filters.bairro && p.bairro !== filters.bairro) return false
    if (filters.preco_max != null && p.preco_venda > filters.preco_max) return false
    if (filters.desconto_min != null && (p.desconto_percentual ?? 0) < filters.desconto_min) return false
    if (filters.quartos_min != null && (p.quartos ?? 0) < filters.quartos_min) return false
    if (filters.area_min != null) {
      const a = p.area_total_m2 ?? p.area_terreno_m2 ?? 0
      if (a < filters.area_min) return false
    }
    if (filters.aceita_fgts && !p.aceita_fgts) return false
    if (filters.aceita_financiamento && !p.aceita_financiamento) return false
    if (filters.somente_desocupados && p.situacao !== 'desocupado') return false
    if (filters.com_matricula && !p.link_matricula_pdf) return false
    if (filters.leilao_iminente) {
      const dt = p.data_leilao_1 ? new Date(p.data_leilao_1) : null
      if (!dt) return false
      const days = (dt.getTime() - Date.now()) / 86400000
      if (days < 0 || days > 30) return false
    }
    return true
  })
}

const SORTERS = {
  desconto_desc: (a, b) => (b.desconto_percentual ?? 0) - (a.desconto_percentual ?? 0),
  preco_asc: (a, b) => (a.preco_venda ?? Infinity) - (b.preco_venda ?? Infinity),
  preco_desc: (a, b) => (b.preco_venda ?? 0) - (a.preco_venda ?? 0),
  ai_score_desc: (a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0),
  bairro_score_desc: (a, b) => (b.bairro_score ?? 0) - (a.bairro_score ?? 0),
  recente: (a, b) => b.id - a.id,
  leilao_proximo: (a, b) => {
    const da = a.data_leilao_1 ? new Date(a.data_leilao_1).getTime() : Infinity
    const db = b.data_leilao_1 ? new Date(b.data_leilao_1).getTime() : Infinity
    return da - db
  },
}

export default function PropertySearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({})
  const [sort, setSort] = useState('desconto_desc')
  const [hovered, setHovered] = useState(null)
  const [mapBounds, setMapBounds] = useState(null)
  const [restrictToMap, setRestrictToMap] = useState(true)

  // pré-filtro (search + atributos) — pins do mapa usam esta lista
  const prefiltered = useMemo(() => {
    const list = applyFilters(MOCK_PROPERTIES, query, filters)
    return list.slice().sort(SORTERS[sort] ?? SORTERS.desconto_desc)
  }, [query, filters, sort])

  // lista renderizada — restringe ao viewport do mapa quando habilitado
  const filtered = useMemo(() => {
    if (!restrictToMap || !mapBounds) return prefiltered
    return prefiltered.filter((p) => {
      if (!p.lat || !p.lon) return false
      try {
        return mapBounds.contains([p.lat, p.lon])
      } catch {
        return true
      }
    })
  }, [prefiltered, mapBounds, restrictToMap])

  // muda quando filtros explícitos mudam — força fit do mapa nos novos resultados
  const fitTrigger = useMemo(
    () => JSON.stringify({ query, filters, sort }),
    [query, filters, sort]
  )

  const focusBairro = useMemo(() => {
    if (filters.bairro) return MOCK_PROPERTIES.find((p) => p.bairro === filters.bairro)
    if (hovered) return MOCK_PROPERTIES.find((p) => p.id === hovered)
    return null
  }, [filters.bairro, hovered])

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? ''
  const hiddenByMap = prefiltered.length - filtered.length

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />

      <main className="flex flex-1 flex-col gap-3 overflow-hidden p-4 pl-0">
        {/* Filtros */}
        <div className="card-glass rise-in flex items-center px-4 py-3" style={{ animationDelay: '40ms' }}>
          <PropertyFilters
            query={query}
            onQueryChange={setQuery}
            filters={filters}
            onFiltersChange={setFilters}
            sort={sort}
            onSortChange={setSort}
            ufs={MOCK_FILTER_OPTIONS.ufs}
            cidades={MOCK_FILTER_OPTIONS.cidades}
            bairros={MOCK_FILTER_OPTIONS.bairros}
            total={prefiltered.length}
          />
        </div>

        {/* lista + mapa */}
        <div className="grid flex-1 grid-cols-[minmax(380px,440px)_1fr] gap-3 overflow-hidden">
          <section className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
            <header className="rise-in flex flex-col gap-1.5" style={{ animationDelay: '90ms' }}>
              <div className="flex items-baseline justify-between">
                <h1 className="font-display text-[20px] font-700 leading-tight text-[var(--color-ink)]">
                  {filtered.length} {filtered.length === 1 ? 'oportunidade' : 'oportunidades'}
                </h1>
                <span className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--color-ink-mute)]">
                  {sortLabel.toLowerCase()}
                </span>
              </div>
              <button
                onClick={() => setRestrictToMap((v) => !v)}
                className={[
                  'flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-[11.5px] transition-colors',
                  restrictToMap
                    ? 'border border-[var(--color-moss-500)]/30 bg-[var(--color-moss-50)] text-[var(--color-moss-700)]'
                    : 'border border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink-soft)] hover:border-[var(--color-ink-soft)]',
                ].join(' ')}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={[
                      'inline-flex h-3.5 w-6 items-center rounded-full p-0.5 transition-colors',
                      restrictToMap ? 'bg-[var(--color-moss-500)]' : 'bg-[var(--color-line)]',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'h-2.5 w-2.5 rounded-full bg-white shadow transition-transform',
                        restrictToMap ? 'translate-x-2.5' : 'translate-x-0',
                      ].join(' ')}
                    />
                  </span>
                  Filtrar pelo viewport do mapa
                </span>
                {restrictToMap && hiddenByMap > 0 && (
                  <span className="font-mono text-[10px] text-[var(--color-moss-700)]/70">
                    +{hiddenByMap} fora
                  </span>
                )}
              </button>
            </header>

            {focusBairro && (
              <NeighborhoodPanel
                uf={focusBairro.uf}
                cidade={focusBairro.cidade}
                bairro={focusBairro.bairro}
                eval={focusBairro.bairro_eval}
                sample_n={focusBairro.bairro_eval?.amostra_n}
              />
            )}

            {filtered.length === 0 ? (
              <div className="card-paper p-8 text-center">
                <p className="font-display text-[14px] text-[var(--color-ink-soft)]">Nenhum imóvel para esses filtros.</p>
                <p className="mt-1 text-[12px] text-[var(--color-ink-mute)]">Tenta afrouxar os critérios ou limpar os filtros.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map((p, i) => (
                  <div
                    key={p.id}
                    className="rise-in"
                    style={{ animationDelay: `${110 + i * 40}ms` }}
                    onMouseEnter={() => setHovered(p.id)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <PropertyCard property={p} onClick={() => navigate(`/property/${p.id}`)} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rise-in min-h-0" style={{ animationDelay: '160ms' }}>
            <div className="card-paper relative h-full overflow-hidden">
              <PropertyMap
                properties={prefiltered}
                highlightId={hovered}
                onMarkerClick={(p) => navigate(`/property/${p.id}`)}
                onBoundsChange={setMapBounds}
                fitTrigger={fitTrigger}
                rounded={false}
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
