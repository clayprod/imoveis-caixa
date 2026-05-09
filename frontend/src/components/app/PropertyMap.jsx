import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

const CARTO_VOYAGER = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

function brl(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)
}

const TYPE_LABEL = {
  apartamento: 'Apto',
  casa: 'Casa',
  terreno: 'Terreno',
  galpao: 'Galpão',
  sala_comercial: 'Sala',
  loja: 'Loja',
}

/**
 * Faz fit nos imóveis quando `fitTrigger` muda — evita reagir à interação do
 * usuário (zoom/pan), que NÃO altera o trigger. Mudança de filtros do parent
 * altera o trigger (ex: JSON.stringify dos filtros).
 */
function FitOnTrigger({ properties, trigger }) {
  const map = useMap()
  useEffect(() => {
    const pts = properties.filter((p) => p.lat && p.lon).map((p) => [p.lat, p.lon])
    if (pts.length === 0) return
    if (pts.length === 1) {
      map.setView(pts[0], 13, { animate: true })
      return
    }
    map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], animate: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger])
  return null
}

/** Notifica parent sobre mudanças de viewport (moveend / zoomend). */
function BoundsListener({ onChange }) {
  const map = useMapEvents({
    moveend: () => onChange?.(map.getBounds()),
    zoomend: () => onChange?.(map.getBounds()),
  })
  // dispara um snapshot inicial após mount
  useEffect(() => {
    onChange?.(map.getBounds())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

function RichTooltip({ p }) {
  const fmtType = TYPE_LABEL[p.tipo_imovel] ?? p.tipo_imovel ?? ''
  const hasRisks = Array.isArray(p.riscos_juridicos) && p.riscos_juridicos.length > 0
  return (
    <div className="w-[260px] overflow-hidden rounded-2xl bg-[var(--color-ink)] p-0 font-body text-[var(--color-paper)] shadow-xl">
      {p.image && (
        <div className="relative h-[110px] w-full overflow-hidden">
          <img src={p.image} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-ink)]/90 via-[var(--color-ink)]/0 to-transparent" />
          {hasRisks && (
            <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-[var(--color-rust)] px-2 py-0.5 text-[10px] font-700 text-white">
              ⚠ {p.riscos_juridicos.length} risco{p.riscos_juridicos.length > 1 ? 's' : ''}
            </div>
          )}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <span className="font-display text-[16px] font-800 leading-none tracking-tight text-[var(--color-amber-soft)]">
              {brl(p.preco_venda)}
            </span>
            {p.desconto_percentual != null && (
              <span className="rounded-full bg-[var(--color-amber)] px-2 py-0.5 text-[10.5px] font-700 text-[var(--color-ink)]">
                -{p.desconto_percentual.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      )}
      <div className="px-3 py-2.5">
        <p className="line-clamp-1 font-display text-[12.5px] font-700 leading-tight">
          {p.endereco_short}
        </p>
        <p className="mt-0.5 line-clamp-1 text-[10.5px] text-[var(--color-paper)]/65">
          {p.bairro} · {p.cidade}/{p.uf}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1 text-[10px]">
          {fmtType && <span className="rounded-full border border-[var(--color-paper)]/15 px-2 py-0.5 font-500">{fmtType}</span>}
          {p.modalidade_short && <span className="rounded-full border border-[var(--color-paper)]/15 px-2 py-0.5 font-500">{p.modalidade_short}</span>}
          {p.situacao && <span className="rounded-full border border-[var(--color-paper)]/15 px-2 py-0.5 font-500 capitalize">{p.situacao}</span>}
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-1.5 border-t border-[var(--color-paper)]/10 pt-2">
          {p.quartos != null && (
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-[var(--color-paper)]/50">Quartos</span>
              <span className="font-display text-[13px] font-700">{p.quartos}</span>
            </div>
          )}
          {p.vagas != null && (
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-[var(--color-paper)]/50">Vagas</span>
              <span className="font-display text-[13px] font-700">{p.vagas}</span>
            </div>
          )}
          {(p.area_total_m2 || p.area_terreno_m2) && (
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-[var(--color-paper)]/50">Área</span>
              <span className="font-display text-[13px] font-700">
                {Math.round(p.area_total_m2 ?? p.area_terreno_m2)}m²
              </span>
            </div>
          )}
          {p.bairro_score != null && (
            <div className="col-span-3 flex items-center justify-between rounded-lg bg-[var(--color-paper)]/5 px-2 py-1.5">
              <span className="text-[10px] font-500 text-[var(--color-paper)]/70">Score do bairro</span>
              <span className="font-display text-[13px] font-700 text-[var(--color-amber-soft)]">
                {p.bairro_score}<span className="ml-0.5 text-[9px] text-[var(--color-paper)]/50">/100</span>
              </span>
            </div>
          )}
          {p.ai_score != null && (
            <div className="col-span-3 flex items-center justify-between rounded-lg bg-[var(--color-paper)]/5 px-2 py-1.5">
              <span className="text-[10px] font-500 text-[var(--color-paper)]/70">Score IA</span>
              <span className="font-display text-[13px] font-700 text-[var(--color-amber-soft)]">
                {p.ai_score}<span className="ml-0.5 text-[9px] text-[var(--color-paper)]/50">/100 · {p.ai_recomendacao}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PropertyMap({
  properties = [],
  highlightId,
  onMarkerClick,
  onBoundsChange,
  fitTrigger,
  rounded = true,
  height = '100%',
}) {
  const center = useMemo(() => {
    const pts = properties.filter((p) => p.lat && p.lon)
    if (pts.length === 0) return [-15.7801, -47.9292]
    const avgLat = pts.reduce((a, p) => a + p.lat, 0) / pts.length
    const avgLon = pts.reduce((a, p) => a + p.lon, 0) / pts.length
    return [avgLat, avgLon]
  }, [properties])

  return (
    <div
      className={['relative h-full w-full overflow-hidden', rounded ? 'rounded-[var(--radius-card)]' : ''].join(' ')}
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={5}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer url={CARTO_VOYAGER} attribution={ATTRIBUTION} />
        <FitOnTrigger properties={properties} trigger={fitTrigger} />
        {onBoundsChange && <BoundsListener onChange={onBoundsChange} />}
        {properties
          .filter((p) => p.lat && p.lon)
          .map((p) => {
            const active = p.id === highlightId
            return (
              <CircleMarker
                key={p.id}
                center={[p.lat, p.lon]}
                radius={active ? 12 : 8}
                pathOptions={{
                  color: active ? '#1a221b' : '#3f5235',
                  weight: active ? 2 : 1,
                  fillColor: active ? '#c89a3a' : '#6f8861',
                  fillOpacity: active ? 1 : 0.78,
                }}
                eventHandlers={{ click: () => onMarkerClick?.(p) }}
              >
                <Tooltip
                  direction="top"
                  offset={[0, -10]}
                  opacity={1}
                  className="property-rich-tooltip"
                >
                  <RichTooltip p={p} />
                </Tooltip>
              </CircleMarker>
            )
          })}
      </MapContainer>
    </div>
  )
}
