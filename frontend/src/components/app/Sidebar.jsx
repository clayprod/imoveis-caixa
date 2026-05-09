import { NavLink } from 'react-router-dom'
import { Heart, Bell, Map, Calendar, Settings, HelpCircle } from 'lucide-react'

const items = [
  { to: '/search', icon: Map, label: 'Mapa & busca' },
  { to: '/calendar', icon: Calendar, label: 'Calendário de leilões' },
  { to: '/favorites', icon: Heart, label: 'Favoritos' },
  { to: '/alerts', icon: Bell, label: 'Watchlists & alertas' },
]
const bottom = [
  { to: '/profile', icon: Settings, label: 'Conta' },
  { to: '/help', icon: HelpCircle, label: 'Ajuda' },
]

function Item({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'group relative flex h-11 w-11 items-center justify-center rounded-full transition-all',
          isActive
            ? 'bg-[var(--color-ink)] text-[var(--color-amber-soft)] shadow-[var(--shadow-soft)]'
            : 'text-[var(--color-ink-mute)] hover:bg-[var(--color-paper-soft)] hover:text-[var(--color-ink)]',
        ].join(' ')
      }
    >
      <Icon size={18} strokeWidth={2} />
      <span className="pointer-events-none absolute left-full top-1/2 z-[100] ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-[var(--color-ink)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-paper)] opacity-0 shadow-[var(--shadow-pop)] transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </NavLink>
  )
}

export default function Sidebar() {
  return (
    <aside className="relative z-30 flex w-[68px] flex-col items-center justify-between py-5">
      <div className="flex flex-col items-center gap-3">
        <NavLink to="/" className="brand-mark mb-3" title="Imóveis Caixa Pro">
          ic
        </NavLink>
        {items.map((it) => (
          <Item key={it.to} {...it} />
        ))}
      </div>
      <div className="flex flex-col items-center gap-3">
        {bottom.map((it) => (
          <Item key={it.to} {...it} />
        ))}
      </div>
    </aside>
  )
}
