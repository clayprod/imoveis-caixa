import { Sparkles, TrendingUp, AlertCircle, Users } from 'lucide-react'

function brl(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)
}

/**
 * Painel de avaliação do bairro — aparece quando o user filtra por bairro
 * ou quando hover/seleciona um imóvel. Espelha o que vem de `neighborhoods`.
 */
export default function NeighborhoodPanel({ uf, cidade, bairro, eval: ev, sample_n }) {
  if (!ev) return null
  const { score, justificativa, pontos_fortes = [], pontos_fracos = [], perfil_recomendado, preco_m2_medio } = ev
  const tone = score >= 70 ? 'moss' : score >= 50 ? 'amber' : 'rust'
  const dot =
    score >= 70 ? 'bg-[var(--color-moss-500)]' : score >= 50 ? 'bg-[var(--color-amber)]' : 'bg-[var(--color-rust)]'

  return (
    <article className="card-paper overflow-hidden rise-in">
      <header className="flex items-start gap-3 px-5 pt-5">
        <div className="relative">
          <svg viewBox="0 0 60 60" className="h-14 w-14 -rotate-90">
            <circle cx="30" cy="30" r="26" fill="none" stroke="var(--color-line)" strokeWidth="5" />
            <circle
              cx="30" cy="30" r="26"
              fill="none"
              stroke={score >= 70 ? '#6f8861' : score >= 50 ? '#c89a3a' : '#c2683f'}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 26}
              strokeDashoffset={2 * Math.PI * 26 * (1 - score / 100)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-[15px] font-800 leading-none text-[var(--color-ink)]">{score}</span>
            <span className="font-mono text-[8px] uppercase tracking-wide text-[var(--color-ink-mute)]">/100</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-mute)]">
            <Sparkles size={10} /> avaliação ia · {sample_n ?? '—'} imóveis amostrados
          </p>
          <h3 className="mt-0.5 font-display text-[16px] font-700 leading-tight text-[var(--color-ink)]">
            {bairro}
          </h3>
          <p className="mt-0.5 text-[11.5px] text-[var(--color-ink-mute)]">
            {cidade}/{uf} · R$ {Math.round(preco_m2_medio ?? 0).toLocaleString('pt-BR')}/m² médio
          </p>
        </div>
        <span className={`pill pill-${tone}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          {score >= 70 ? 'recomendado' : score >= 50 ? 'analisar' : 'cautela'}
        </span>
      </header>

      {justificativa && (
        <p className="mx-5 mt-3 text-[12.5px] leading-relaxed text-[var(--color-ink-soft)]">
          {justificativa}
        </p>
      )}

      <div className="mx-5 mt-4 grid grid-cols-2 gap-2">
        {pontos_fortes.length > 0 && (
          <div className="rounded-xl bg-[var(--color-moss-50)] p-3">
            <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-moss-700)]">
              <TrendingUp size={11} /> pontos fortes
            </p>
            <ul className="mt-2 space-y-1 text-[11.5px] text-[var(--color-ink-soft)]">
              {pontos_fortes.slice(0, 4).map((s, i) => (
                <li key={i} className="line-clamp-2">· {s}</li>
              ))}
            </ul>
          </div>
        )}
        {pontos_fracos.length > 0 && (
          <div className="rounded-xl bg-[color-mix(in_oklab,var(--color-rust)_10%,var(--color-paper))] p-3">
            <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-rust)]">
              <AlertCircle size={11} /> atenções
            </p>
            <ul className="mt-2 space-y-1 text-[11.5px] text-[var(--color-ink-soft)]">
              {pontos_fracos.slice(0, 4).map((s, i) => (
                <li key={i} className="line-clamp-2">· {s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {perfil_recomendado && (
        <footer className="mx-5 my-4 flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper-soft)] px-3 py-2">
          <Users size={12} className="text-[var(--color-ink-mute)]" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-mute)]">
            perfil ideal
          </span>
          <span className="ml-auto text-[12px] font-600 capitalize text-[var(--color-ink)]">
            {perfil_recomendado}
          </span>
        </footer>
      )}
    </article>
  )
}
