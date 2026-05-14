import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/app/Sidebar'
import PropertyFilters, { SORT_OPTIONS } from '../components/app/PropertyFilters'
import PropertyCard from '../components/app/PropertyCard'
import PropertyMap from '../components/app/PropertyMap'
import NeighborhoodPanel from '../components/app/NeighborhoodPanel'
import API_BASE_URL from '../config/api'

const EMPTY_FILTER_OPTIONS = { ufs: [], cidades: [], bairros: [] }

function buildParams(query, filters, sort) {
  const params = new URLSearchParams({ limit: '200', sort })
  if (query.trim()) params.set('q', query.trim())
  for (const key of ['uf', 'cidade', 'bairro', 'tipo_imovel', 'preco_max', 'desconto_min', 'quartos_min', 'area_min']) {
    if (filters[key] != null && filters[key] !== '') params.set(key, String(filters[key]))
  }
  for (const key of ['aceita_financiamento', 'com_matricula']) {
    if (filters[key]) params.set(key, 'true')
  }
  return params
}

export default function PropertySearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({})
  const [sort, setSort] = useState('desconto_desc')
  const [hovered, setHovered] = useState(null)
  const [mapBounds, setMapBounds] = useState(null)
  const [restrictToMap, setRestrictToMap] = useState(true)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [filterOptions, setFilterOptions] = useState(EMPTY_FILTER_OPTIONS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API_BASE_URL}/properties/filters`)
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('filters')))
      .then(setFilterOptions)
      .catch(() => setFilterOptions(EMPTY_FILTER_OPTIONS))
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    fetch(`${API_BASE_URL}/properties?${buildParams(query, filters, sort)}`, { signal: controller.signal })
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('properties')))
      .then((data) => {
        setItems(data.items ?? [])
        setTotal(data.total ?? 0)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setItems([])
          setTotal(0)
          setError('Nao foi possivel carregar os dados reais do banco.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [query, filters, sort])

  const prefiltered = items

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

  const fitTrigger = useMemo(
    () => JSON.stringify({ query, filters, sort, total: prefiltered.length }),
    [query, filters, sort, prefiltered.length]
  )

  const focusBairro = useMemo(() => {
    if (filters.bairro) return prefiltered.find((p) => p.bairro === filters.bairro)
    if (hovered) return prefiltered.find((p) => p.id === hovered)
    return null
  }, [filters.bairro, hovered, prefiltered])

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? ''
  const hiddenByMap = prefiltered.length - filtered.length

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />

      <main className="flex flex-1 flex-col gap-3 overflow-hidden p-4 pl-0">
        <div className="card-glass rise-in flex items-center px-4 py-3" style={{ animationDelay: '40ms' }}>
          <PropertyFilters
            query={query}
            onQueryChange={setQuery}
            filters={filters}
            onFiltersChange={setFilters}
            sort={sort}
            onSortChange={setSort}
            ufs={filterOptions.ufs}
            cidades={filterOptions.cidades}
            bairros={filterOptions.bairros}
            total={total}
          />
        </div>

        <div className="grid flex-1 grid-cols-[minmax(380px,440px)_1fr] gap-3 overflow-hidden">
          <section className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
            <header className="rise-in flex flex-col gap-1.5" style={{ animationDelay: '90ms' }}>
              <div className="flex items-baseline justify-between">
                <h1 className="font-display text-[20px] font-700 leading-tight text-[var(--color-ink)]">
                  {loading ? 'Carregando' : filtered.length} {filtered.length === 1 ? 'oportunidade' : 'oportunidades'}
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
                  <span className={[
                    'inline-flex h-3.5 w-6 items-center rounded-full p-0.5 transition-colors',
                    restrictToMap ? 'bg-[var(--color-moss-500)]' : 'bg-[var(--color-line)]',
                  ].join(' ')}>
                    <span className={[
                      'h-2.5 w-2.5 rounded-full bg-white shadow transition-transform',
                      restrictToMap ? 'translate-x-2.5' : 'translate-x-0',
                    ].join(' ')} />
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

            {error ? (
              <div className="card-paper p-8 text-center">
                <p className="font-display text-[14px] text-[var(--color-rust)]">{error}</p>
              </div>
            ) : loading ? (
              <div className="card-paper p-8 text-center">
                <p className="font-display text-[14px] text-[var(--color-ink-soft)]">Carregando dados reais da Caixa...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="card-paper p-8 text-center">
                <p className="font-display text-[14px] text-[var(--color-ink-soft)]">Nenhum imovel para esses filtros.</p>
                <p className="mt-1 text-[12px] text-[var(--color-ink-mute)]">Tenta afrouxar os criterios ou limpar os filtros.</p>
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
