import { BarChart3, TrendingDown } from 'lucide-react'

function brl(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)
}

function Bar({ label, sublabel, value, max, accent = 'moss' }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0
  const accentBg = {
    moss: 'bg-[var(--color-moss-500)]',
    amber: 'bg-[var(--color-amber)]',
    line: 'bg-[var(--color-ink-mute)]',
  }[accent]
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-mute)]">
          {label}
          {sublabel && <span className="ml-1.5 normal-case tracking-normal text-[var(--color-ink-mute)]/70">· {sublabel}</span>}
        </span>
        <span className="font-display text-[13px] font-700 text-[var(--color-ink)]">{brl(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--color-paper-soft)]">
        <div
          className={`h-full rounded-full ${accentBg} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function MarketComparison({ data, preco_venda, valor_avaliacao }) {
  if (!data) return null
  const max = Math.max(data.preco_medio || 0, valor_avaliacao || 0, preco_venda || 0)
  const vs_mercado = data.preco_medio
    ? ((data.preco_medio - preco_venda) / data.preco_medio) * 100
    : null
  const vs_avaliacao = valor_avaliacao
    ? ((valor_avaliacao - preco_venda) / valor_avaliacao) * 100
    : null

  return (
    <article className="card-paper p-5">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-[var(--color-amber)]" />
          <h3 className="font-display text-[15px] font-700 text-[var(--color-ink)]">
            Comparativo de mercado
          </h3>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-mute)]">
          n={data.amostra_n} · {data.confianca ?? 'média'}
        </span>
      </header>

      <p className="mb-4 text-[11.5px] text-[var(--color-ink-mute)]">
        {data.criterio}
      </p>

      <div className="space-y-3">
        <Bar
          label="Mercado médio"
          sublabel={`${brl(data.preco_min)}–${brl(data.preco_max)}`}
          value={data.preco_medio}
          max={max}
          accent="line"
        />
        <Bar label="Avaliação Caixa" value={valor_avaliacao} max={max} accent="moss" />
        <Bar label="Preço Caixa" value={preco_venda} max={max} accent="amber" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-[var(--color-moss-50)] p-3 text-center">
          <p className="flex items-center justify-center gap-1 font-display text-[20px] font-800 text-[var(--color-moss-700)]">
            <TrendingDown size={15} strokeWidth={2.5} />
            {vs_mercado != null ? `${vs_mercado.toFixed(1)}%` : '—'}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--color-moss-700)]/80">
            abaixo do mercado
          </p>
        </div>
        <div className="rounded-xl bg-[var(--color-paper-soft)] p-3 text-center">
          <p className="font-display text-[20px] font-800 text-[var(--color-ink)]">
            {vs_avaliacao != null ? `${vs_avaliacao.toFixed(1)}%` : '—'}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--color-ink-mute)]">
            abaixo da avaliação
          </p>
        </div>
      </div>

      <footer className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-mute)]">
          fontes:
        </span>
        {data.fontes?.map((f) => (
          <span key={f.nome} className="pill pill-line !text-[10px] !py-0.5 !px-2">
            {f.nome} · {f.n}
          </span>
        ))}
      </footer>
    </article>
  )
}
