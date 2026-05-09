/**
 * Mini card de estatística usado tanto em PropertyCard (compacto)
 * quanto em PropertyDetails (no overlay do mapa).
 */
export default function StatPill({ icon: Icon, label, value, suffix, tone = 'paper' }) {
  const tones = {
    paper: 'bg-[var(--color-paper)] text-[var(--color-ink)] border border-[var(--color-line)]',
    ink: 'bg-[var(--color-ink)] text-[var(--color-paper)] border border-[var(--color-ink)]',
    moss: 'bg-[var(--color-moss-50)] text-[var(--color-moss-700)] border border-[color-mix(in_oklab,var(--color-moss-500)_22%,transparent)]',
    amber:
      'bg-[color-mix(in_oklab,var(--color-amber)_14%,var(--color-paper))] text-[color-mix(in_oklab,var(--color-amber)_80%,var(--color-ink))] border border-[color-mix(in_oklab,var(--color-amber)_28%,transparent)]',
  }
  return (
    <div
      className={[
        'flex min-w-0 flex-col justify-between rounded-2xl px-3 py-3 shadow-[var(--shadow-soft)]',
        tones[tone] ?? tones.paper,
      ].join(' ')}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide opacity-70">
        {Icon && <Icon size={12} strokeWidth={2.2} />}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-display text-[1.55rem] font-700 leading-none tracking-tight">
          {value}
        </span>
        {suffix && (
          <span className="text-xs font-medium opacity-60">{suffix}</span>
        )}
      </div>
    </div>
  )
}
