import { useState } from 'react'
import { Search, ChevronDown, X, SlidersHorizontal } from 'lucide-react'

function Dropdown({ label, value, onChange, options, minWidth = 130, compact = false }) {
  return (
    <div className="relative">
      <select
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value || null)}
        className={[
          'appearance-none input-line cursor-pointer pr-8',
          compact ? '!py-1.5 !px-3 !text-[12.5px]' : '',
        ].join(' ')}
        style={{ minWidth }}
      >
        <option value="">{label}</option>
        {options.map((opt) => (
          <option key={String(opt.value ?? opt)} value={opt.value ?? opt}>
            {opt.label ?? opt}
          </option>
        ))}
      </select>
      <ChevronDown
        size={13}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-mute)]"
      />
    </div>
  )
}

function ToggleChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'pill transition-all',
        active ? 'pill-ink !py-1 !px-3 !text-[12px]' : 'pill-line !py-1 !px-3 !text-[12px] hover:border-[var(--color-ink-soft)]',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export const SORT_OPTIONS = [
  { value: 'desconto_desc', label: 'Maior desconto' },
  { value: 'preco_asc', label: 'Menor preço' },
  { value: 'preco_desc', label: 'Maior preço' },
  { value: 'ai_score_desc', label: 'Melhor score IA' },
  { value: 'bairro_score_desc', label: 'Melhor bairro' },
  { value: 'recente', label: 'Mais recentes' },
  { value: 'leilao_proximo', label: 'Leilão mais próximo' },
]

export const MODALIDADE_OPTIONS = [
  { value: 'Venda Direta Online', label: 'Venda Direta Online' },
  { value: 'Venda Online', label: 'Venda Online' },
  { value: 'Leilão SFI - Edital Único', label: 'Leilão SFI' },
  { value: 'Licitação Aberta', label: 'Licitação Aberta' },
]

export const TIPO_OPTIONS = [
  { value: 'apartamento', label: 'Apartamento' },
  { value: 'casa', label: 'Casa' },
  { value: 'terreno', label: 'Terreno' },
  { value: 'sala_comercial', label: 'Sala comercial' },
  { value: 'galpao', label: 'Galpão' },
  { value: 'loja', label: 'Loja' },
  { value: 'comercial', label: 'Comercial' },
]

const PRECO_OPTIONS = [
  { value: 50000, label: 'até R$ 50 mil' },
  { value: 100000, label: 'até R$ 100 mil' },
  { value: 150000, label: 'até R$ 150 mil' },
  { value: 250000, label: 'até R$ 250 mil' },
  { value: 500000, label: 'até R$ 500 mil' },
  { value: 1000000, label: 'até R$ 1 mi' },
  { value: 5000000, label: 'até R$ 5 mi' },
]

const DESCONTO_OPTIONS = [
  { value: 10, label: '10%+' },
  { value: 25, label: '25%+' },
  { value: 40, label: '40%+' },
  { value: 50, label: '50%+' },
  { value: 60, label: '60%+' },
]

const AREA_OPTIONS = [
  { value: 30, label: '30m²+' },
  { value: 50, label: '50m²+' },
  { value: 80, label: '80m²+' },
  { value: 120, label: '120m²+' },
  { value: 200, label: '200m²+' },
]

export default function PropertyFilters({
  query,
  onQueryChange,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  ufs = [],
  cidades = [],
  bairros = [],
  total = 0,
}) {
  const [expanded, setExpanded] = useState(false)
  const set = (k, v) => onFiltersChange?.({ ...filters, [k]: v })
  const activeCount = Object.entries(filters || {}).filter(
    ([, v]) => v != null && v !== '' && v !== false
  ).length

  return (
    <div className="flex w-full flex-col gap-2.5">
      {/* linha principal: search + sort + toggle de filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[260px] flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-ink-mute)]"
          />
          <input
            type="search"
            placeholder="Buscar por endereço, bairro, número do imóvel…"
            value={query ?? ''}
            onChange={(e) => onQueryChange?.(e.target.value)}
            className="input-line w-full !pl-11"
          />
        </div>

        <Dropdown
          label="Ordenar por"
          value={sort}
          onChange={(v) => onSortChange?.(v ?? 'desconto_desc')}
          options={SORT_OPTIONS}
          minWidth={170}
        />

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={[
            'pill transition-all',
            expanded || activeCount > 0
              ? 'pill-ink !py-2 !px-4'
              : 'pill-line !py-2 !px-4 hover:border-[var(--color-ink-soft)]',
          ].join(' ')}
        >
          <SlidersHorizontal size={13} />
          Filtros
          {activeCount > 0 && (
            <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--color-amber)] px-1 font-mono text-[10px] font-700 text-[var(--color-ink)]">
              {activeCount}
            </span>
          )}
        </button>

        <span className="ml-auto font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-mute)]">
          {total} {total === 1 ? 'imóvel' : 'imóveis'}
        </span>
      </div>

      {/* filtros expandidos */}
      {expanded && (
        <div className="rise-in flex flex-wrap items-center gap-2 border-t border-[var(--color-line)] pt-2.5">
          <Dropdown label="Modalidade" value={filters?.modalidade} onChange={(v) => set('modalidade', v)} options={MODALIDADE_OPTIONS} minWidth={170} compact />
          <Dropdown label="Tipo" value={filters?.tipo_imovel} onChange={(v) => set('tipo_imovel', v)} options={TIPO_OPTIONS} minWidth={130} compact />
          <Dropdown label="UF" value={filters?.uf} onChange={(v) => set('uf', v)} options={ufs} minWidth={80} compact />
          <Dropdown label="Cidade" value={filters?.cidade} onChange={(v) => set('cidade', v)} options={cidades} minWidth={150} compact />
          <Dropdown label="Bairro" value={filters?.bairro} onChange={(v) => set('bairro', v)} options={bairros} minWidth={150} compact />

          <span className="mx-1 h-5 w-px bg-[var(--color-line)]" />

          <Dropdown label="Preço máx" value={filters?.preco_max} onChange={(v) => set('preco_max', v ? Number(v) : null)} options={PRECO_OPTIONS} minWidth={140} compact />
          <Dropdown label="Desconto" value={filters?.desconto_min} onChange={(v) => set('desconto_min', v ? Number(v) : null)} options={DESCONTO_OPTIONS} minWidth={110} compact />
          <Dropdown label="Quartos" value={filters?.quartos_min} onChange={(v) => set('quartos_min', v ? Number(v) : null)} options={[1, 2, 3, 4].map((n) => ({ value: n, label: `${n}+` }))} minWidth={100} compact />
          <Dropdown label="Área" value={filters?.area_min} onChange={(v) => set('area_min', v ? Number(v) : null)} options={AREA_OPTIONS} minWidth={100} compact />

          <span className="mx-1 h-5 w-px bg-[var(--color-line)]" />

          <ToggleChip active={filters?.aceita_fgts} onClick={() => set('aceita_fgts', !filters?.aceita_fgts)}>FGTS</ToggleChip>
          <ToggleChip active={filters?.aceita_financiamento} onClick={() => set('aceita_financiamento', !filters?.aceita_financiamento)}>Financia</ToggleChip>
          <ToggleChip active={filters?.somente_desocupados} onClick={() => set('somente_desocupados', !filters?.somente_desocupados)}>Só desocupados</ToggleChip>
          <ToggleChip active={filters?.leilao_iminente} onClick={() => set('leilao_iminente', !filters?.leilao_iminente)}>Leilão em 30d</ToggleChip>
          <ToggleChip active={filters?.com_matricula} onClick={() => set('com_matricula', !filters?.com_matricula)}>Matrícula disponível</ToggleChip>

          {activeCount > 0 && (
            <button
              onClick={() => onFiltersChange?.({})}
              className="ml-auto inline-flex items-center gap-1 rounded-full border border-transparent px-3 py-1.5 text-[12px] font-500 text-[var(--color-ink-mute)] transition-colors hover:bg-[var(--color-paper-soft)] hover:text-[var(--color-ink)]"
            >
              <X size={13} /> limpar
            </button>
          )}
        </div>
      )}
    </div>
  )
}
