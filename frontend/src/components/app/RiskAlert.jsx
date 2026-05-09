import { AlertTriangle, ShieldAlert, Gavel, Scale } from 'lucide-react'

const RISCO_LABELS = {
  gravame: { label: 'Gravame', icon: Gavel, severity: 'high' },
  penhora: { label: 'Penhora', icon: Gavel, severity: 'high' },
  indisponibilidade: { label: 'Indisponibilidade', icon: ShieldAlert, severity: 'high' },
  hipoteca: { label: 'Hipoteca', icon: Scale, severity: 'medium' },
  acao_judicial: { label: 'Ação judicial', icon: Scale, severity: 'high' },
  litigio: { label: 'Litígio', icon: Scale, severity: 'high' },
  regularizacao_adquirente: { label: 'Regularização por conta do adquirente', icon: ShieldAlert, severity: 'medium' },
  divida_ativa: { label: 'Dívida ativa', icon: AlertTriangle, severity: 'medium' },
  usucapiao: { label: 'Usucapião', icon: Scale, severity: 'medium' },
  invasao: { label: 'Invasão', icon: AlertTriangle, severity: 'high' },
}

export function hasRiscos(p) {
  return Array.isArray(p?.riscos_juridicos) && p.riscos_juridicos.length > 0
}

/** Badge compacto pra usar no PropertyCard / no tooltip do mapa. */
export function RiskBadge({ riscos = [], size = 'sm' }) {
  if (!riscos.length) return null
  const sev = riscos.some((k) => RISCO_LABELS[k]?.severity === 'high') ? 'high' : 'medium'
  const cls =
    sev === 'high'
      ? 'bg-[var(--color-rust)] text-white border-[var(--color-rust)]'
      : 'bg-[color-mix(in_oklab,var(--color-amber)_30%,var(--color-paper))] text-[color-mix(in_oklab,var(--color-amber)_85%,var(--color-ink))] border-[var(--color-amber)]/40'
  const sizeCls = size === 'sm' ? '!py-0.5 !px-2 !text-[10px]' : '!py-1 !px-2.5 !text-[11.5px]'
  return (
    <span className={`pill ${cls} ${sizeCls} border`}>
      <AlertTriangle size={size === 'sm' ? 10 : 12} strokeWidth={2.4} />
      {riscos.length === 1
        ? RISCO_LABELS[riscos[0]]?.label ?? riscos[0]
        : `${riscos.length} riscos jurídicos`}
    </span>
  )
}

/** Banner full-width pro PropertyDetails. */
export function RiskBanner({ riscos = [], raw }) {
  if (!riscos.length) return null
  return (
    <article className="rise-in overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-rust)]/40 bg-[color-mix(in_oklab,var(--color-rust)_10%,var(--color-paper))] p-4">
      <header className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-rust)] text-white">
          <AlertTriangle size={17} strokeWidth={2.4} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[14px] font-700 leading-tight text-[var(--color-rust)]">
            Atenção: {riscos.length} risco{riscos.length > 1 ? 's' : ''} jurídico{riscos.length > 1 ? 's' : ''} averbado{riscos.length > 1 ? 's' : ''} na matrícula
          </h3>
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-ink-soft)]">
            Estes itens aparecem averbados no detalhe do imóvel ou na matrícula. Leia o edital e a matrícula com cuidado, e considere consultar advogado especializado antes de fazer proposta.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {riscos.map((k) => {
              const info = RISCO_LABELS[k] ?? { label: k, icon: AlertTriangle }
              const Icon = info.icon
              return (
                <span
                  key={k}
                  className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-600 text-[var(--color-rust)] backdrop-blur"
                >
                  <Icon size={11} strokeWidth={2.4} />
                  {info.label}
                </span>
              )
            })}
          </div>
          {raw && (
            <details className="mt-2.5 text-[11px] text-[var(--color-ink-mute)]">
              <summary className="cursor-pointer font-mono uppercase tracking-wider">
                texto bruto extraído
              </summary>
              <p className="mt-1 italic leading-relaxed">"{raw}"</p>
            </details>
          )}
        </div>
      </header>
    </article>
  )
}
