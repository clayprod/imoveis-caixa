import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, Plus, Phone, Trash2, Edit3, Power, Smartphone,
  CheckCircle, Clock, AlertTriangle, X, MessageCircle,
} from 'lucide-react'
import Sidebar from '../components/app/Sidebar'
import { MOCK_USER_PHONES, MOCK_WATCHLISTS, MOCK_ALERTS } from '../lib/mockUserData'

const REASON_TONE = {
  novo_match: { label: 'Novo match', tone: 'pill-moss', icon: CheckCircle },
  queda_preco: { label: 'Queda de preço', tone: 'pill-amber', icon: AlertTriangle },
  leilao_1_h7d: { label: '1º leilão em 7d', tone: 'pill-rust', icon: Clock },
  leilao_1_h1d: { label: '1º leilão amanhã', tone: 'pill-rust', icon: Clock },
  leilao_1_h1h: { label: '1º leilão em 1h', tone: 'pill-rust', icon: Clock },
  leilao_2_h7d: { label: '2º leilão em 7d', tone: 'pill-rust', icon: Clock },
  leilao_2_h1d: { label: '2º leilão amanhã', tone: 'pill-rust', icon: Clock },
}

function fmtDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function brl(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)
}

function describeFilters(f) {
  if (!f) return '—'
  const parts = []
  if (f.tipo_imovel) parts.push(f.tipo_imovel)
  if (f.uf) parts.push(f.uf)
  if (f.cidade) parts.push(f.cidade)
  if (f.bairro) parts.push(f.bairro)
  if (f.preco_max) parts.push(`até ${brl(f.preco_max)}`)
  if (f.desconto_min) parts.push(`${f.desconto_min}%+ desc`)
  if (f.quartos_min) parts.push(`${f.quartos_min}+ quartos`)
  if (f.score_bairro_min) parts.push(`bairro ${f.score_bairro_min}+`)
  if (f.aceita_fgts) parts.push('FGTS')
  if (f.somente_desocupados) parts.push('desocupado')
  if (f.modalidade) parts.push(f.modalidade)
  if (f.leilao_iminente) parts.push('leilão em 30d')
  return parts.length ? parts.join(' · ') : 'sem filtros'
}

function PhoneCard({ phone, onRemove, onSetDefault }) {
  return (
    <div className="card-paper flex items-center gap-3 px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-moss-50)] text-[var(--color-moss-700)]">
        <Smartphone size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-display text-[13.5px] font-700 text-[var(--color-ink)]">{phone.label}</span>
          {phone.is_default && <span className="pill pill-amber !py-0 !px-2 !text-[9.5px]">padrão</span>}
          {phone.verified && <span className="pill pill-moss !py-0 !px-2 !text-[9.5px]">verificado</span>}
        </div>
        <p className="font-mono text-[11.5px] text-[var(--color-ink-mute)]">
          {phone.number} · instance <span className="text-[var(--color-ink-soft)]">{phone.instance}</span>
        </p>
      </div>
      <div className="flex items-center gap-1">
        {!phone.is_default && (
          <button
            onClick={onSetDefault}
            className="rounded-full px-2 py-1 text-[11px] text-[var(--color-ink-mute)] hover:bg-[var(--color-paper-soft)] hover:text-[var(--color-ink)]"
          >
            tornar padrão
          </button>
        )}
        <button
          onClick={onRemove}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-ink-mute)] hover:bg-[color-mix(in_oklab,var(--color-rust)_15%,var(--color-paper))] hover:text-[var(--color-rust)]"
          aria-label="remover"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

function AddPhoneRow({ onAdd }) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [number, setNumber] = useState('')

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--color-line)] bg-[var(--color-paper)]/50 px-4 py-3 text-[12.5px] font-500 text-[var(--color-ink-mute)] hover:border-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
      >
        <Plus size={14} /> adicionar número
      </button>
    )
  }

  const submit = () => {
    if (!number.trim()) return
    onAdd?.({ label: label.trim() || 'Sem nome', number: number.trim() })
    setOpen(false)
    setLabel('')
    setNumber('')
  }

  return (
    <div className="card-paper flex flex-wrap items-center gap-2 px-3 py-2.5">
      <input
        autoFocus
        className="input-line min-w-[160px] flex-1 !py-1.5"
        placeholder="Ex: Esposa, Sócio…"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <input
        className="input-line min-w-[180px] !py-1.5"
        placeholder="+55 11 99999-9999"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
      />
      <button onClick={submit} className="rounded-full bg-[var(--color-ink)] px-3 py-1.5 text-[12px] font-600 text-[var(--color-paper)] hover:bg-[var(--color-moss-700)]">
        salvar
      </button>
      <button onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-ink-mute)] hover:bg-[var(--color-paper-soft)]">
        <X size={13} />
      </button>
    </div>
  )
}

function WatchlistCard({ wl, phones, onToggleActive, onTogglePhone, onDelete }) {
  const reminderLabels = []
  if (wl.channels?.reminders?.['7d']) reminderLabels.push('7d')
  if (wl.channels?.reminders?.['1d']) reminderLabels.push('1d')
  if (wl.channels?.reminders?.['1h']) reminderLabels.push('1h')

  return (
    <article className={`card-paper p-5 transition-opacity ${wl.active ? '' : 'opacity-60'}`}>
      <header className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-amber)]/15 text-[var(--color-amber)]">
          <Bell size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-[14.5px] font-700 leading-tight text-[var(--color-ink)]">
              {wl.name}
            </h3>
            {!wl.active && <span className="pill pill-line !py-0 !px-2 !text-[10px]">pausada</span>}
          </div>
          {wl.description && (
            <p className="mt-0.5 text-[11.5px] text-[var(--color-ink-mute)]">{wl.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleActive?.(wl.id)}
            className={`flex h-8 w-8 items-center justify-center rounded-full ${
              wl.active
                ? 'text-[var(--color-moss-700)] hover:bg-[var(--color-moss-50)]'
                : 'text-[var(--color-ink-mute)] hover:bg-[var(--color-paper-soft)]'
            }`}
            aria-label={wl.active ? 'pausar' : 'ativar'}
          >
            <Power size={13} />
          </button>
          <button
            onClick={() => onDelete?.(wl.id)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-ink-mute)] hover:bg-[color-mix(in_oklab,var(--color-rust)_15%,var(--color-paper))] hover:text-[var(--color-rust)]"
            aria-label="remover"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </header>

      <p className="mt-3 rounded-xl bg-[var(--color-paper-soft)] px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-mute)]">
        {describeFilters(wl.filters)}
      </p>

      <div className="mt-3 flex items-center justify-between text-[11.5px]">
        <span className="text-[var(--color-ink-mute)]">
          <span className="font-display text-[14px] font-700 text-[var(--color-ink)]">
            {wl.matches_count}
          </span>{' '}
          matches{' '}
          {wl.last_match_at && <>· último {fmtDate(wl.last_match_at)}</>}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-mute)]">
          lembretes: {reminderLabels.length ? reminderLabels.join(' · ') : 'nenhum'}
        </span>
      </div>

      <div className="mt-3 border-t border-[var(--color-line)] pt-3">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-mute)]">
          enviar para
        </p>
        <div className="flex flex-wrap gap-1.5">
          {phones.map((ph) => {
            const active = wl.channels?.whatsapp_phone_ids?.includes(ph.id)
            return (
              <button
                key={ph.id}
                onClick={() => onTogglePhone?.(wl.id, ph.id)}
                className={[
                  'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-500 transition-all',
                  active
                    ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]'
                    : 'border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink-mute)] hover:border-[var(--color-ink-soft)]',
                ].join(' ')}
              >
                <Phone size={10} />
                {ph.label}
              </button>
            )
          })}
        </div>
      </div>
    </article>
  )
}

export default function Alerts() {
  const navigate = useNavigate()
  const [phones, setPhones] = useState(MOCK_USER_PHONES)
  const [watchlists, setWatchlists] = useState(MOCK_WATCHLISTS)
  const [alerts] = useState(MOCK_ALERTS)

  const stats = useMemo(() => {
    return {
      active: watchlists.filter((w) => w.active).length,
      paused: watchlists.filter((w) => !w.active).length,
      pending: alerts.filter((a) => !a.delivered_at).length,
      delivered_30d: alerts.filter((a) => a.delivered_at).length,
    }
  }, [watchlists, alerts])

  const addPhone = ({ label, number }) => {
    setPhones((prev) => [
      ...prev,
      {
        id: `phone_${Date.now()}`,
        label,
        number,
        instance: 'claytoncosta',
        is_default: prev.length === 0,
        verified: false,
        created_at: new Date().toISOString().slice(0, 10),
      },
    ])
  }

  const removePhone = (id) => {
    setPhones((prev) => prev.filter((p) => p.id !== id))
    setWatchlists((prev) =>
      prev.map((w) => ({
        ...w,
        channels: {
          ...w.channels,
          whatsapp_phone_ids: (w.channels?.whatsapp_phone_ids ?? []).filter((pid) => pid !== id),
        },
      }))
    )
  }

  const setDefaultPhone = (id) => {
    setPhones((prev) => prev.map((p) => ({ ...p, is_default: p.id === id })))
  }

  const toggleActive = (wlId) => {
    setWatchlists((prev) => prev.map((w) => (w.id === wlId ? { ...w, active: !w.active } : w)))
  }

  const togglePhone = (wlId, phoneId) => {
    setWatchlists((prev) =>
      prev.map((w) => {
        if (w.id !== wlId) return w
        const ids = new Set(w.channels?.whatsapp_phone_ids ?? [])
        if (ids.has(phoneId)) ids.delete(phoneId)
        else ids.add(phoneId)
        return { ...w, channels: { ...w.channels, whatsapp_phone_ids: [...ids] } }
      })
    )
  }

  const deleteWatchlist = (wlId) => {
    if (!confirm('Remover esta watchlist?')) return
    setWatchlists((prev) => prev.filter((w) => w.id !== wlId))
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />

      <main className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pl-0">
        <header className="card-glass rise-in flex flex-wrap items-center gap-4 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-amber)] text-[var(--color-ink)]">
            <Bell size={18} />
          </div>
          <div>
            <h1 className="font-display text-[20px] font-700 leading-tight text-[var(--color-ink)]">
              Watchlists & alertas
            </h1>
            <p className="mt-0.5 text-[12px] text-[var(--color-ink-mute)]">
              receba WhatsApp quando algo bater com seus filtros · entrega via n8n + Evolution
            </p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Stat label="ativas" value={stats.active} />
            <Stat label="pausadas" value={stats.paused} muted />
            <Stat label="pendentes" value={stats.pending} accent="amber" />
            <Stat label="entregues" value={stats.delivered_30d} muted />
          </div>
        </header>

        {/* Bloco: Meus números */}
        <section className="rise-in" style={{ animationDelay: '60ms' }}>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-display text-[15px] font-700 text-[var(--color-ink)]">
              Meus números
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-mute)]">
              {phones.length} cadastrado{phones.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {phones.map((p) => (
              <PhoneCard
                key={p.id}
                phone={p}
                onRemove={() => removePhone(p.id)}
                onSetDefault={() => setDefaultPhone(p.id)}
              />
            ))}
            <AddPhoneRow onAdd={addPhone} />
          </div>
        </section>

        {/* Bloco: Watchlists */}
        <section className="rise-in" style={{ animationDelay: '120ms' }}>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-display text-[15px] font-700 text-[var(--color-ink)]">
              Watchlists
            </h2>
            <button
              onClick={() => navigate('/search')}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--color-ink)] px-3 py-1.5 text-[12px] font-600 text-[var(--color-paper)] hover:bg-[var(--color-moss-700)]"
            >
              <Plus size={12} /> nova watchlist
            </button>
          </div>
          {watchlists.length === 0 ? (
            <div className="card-paper p-8 text-center text-[12px] text-[var(--color-ink-mute)]">
              Nenhuma watchlist ainda. Aplique filtros na busca e salve como watchlist.
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {watchlists.map((wl) => (
                <WatchlistCard
                  key={wl.id}
                  wl={wl}
                  phones={phones}
                  onToggleActive={toggleActive}
                  onTogglePhone={togglePhone}
                  onDelete={deleteWatchlist}
                />
              ))}
            </div>
          )}
        </section>

        {/* Bloco: Histórico */}
        <section className="rise-in" style={{ animationDelay: '180ms' }}>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-display text-[15px] font-700 text-[var(--color-ink)]">
              Histórico de alertas
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-mute)]">
              últimos {alerts.length}
            </span>
          </div>
          <article className="card-paper overflow-hidden p-0">
            <ul>
              {alerts.map((a) => {
                const reason = REASON_TONE[a.reason] ?? { label: a.reason_label, tone: 'pill-line', icon: Bell }
                const Icon = reason.icon
                return (
                  <li
                    key={a.id}
                    onClick={() => navigate(`/property/${a.property_id}`)}
                    className="flex cursor-pointer items-center gap-4 border-b border-[var(--color-line)] px-5 py-3 last:border-b-0 hover:bg-[var(--color-paper-soft)]"
                  >
                    <span className={`pill ${reason.tone} !py-0.5 !px-2.5 !text-[10.5px]`}>
                      <Icon size={10} strokeWidth={2.4} />
                      {reason.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-[13px] font-600 text-[var(--color-ink)]">
                        {a.property_summary}
                      </p>
                      <p className="truncate text-[11px] text-[var(--color-ink-mute)]">
                        de "{a.watchlist_name}"
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 text-[10.5px] text-[var(--color-ink-mute)]">
                      <span className="font-mono">{fmtDate(a.matched_at)}</span>
                      {a.delivered_at ? (
                        <span className="inline-flex items-center gap-1 text-[var(--color-moss-700)]">
                          <CheckCircle size={10} />
                          enviado p/ {a.channels_delivered?.whatsapp?.length ?? 0} número
                          {(a.channels_delivered?.whatsapp?.length ?? 0) !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[var(--color-amber)]">
                          <Clock size={10} /> pendente
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
              {alerts.length === 0 && (
                <li className="px-5 py-8 text-center text-[12px] text-[var(--color-ink-mute)]">
                  Sem alertas ainda. Quando algo bater com suas watchlists, aparece aqui.
                </li>
              )}
            </ul>
          </article>
        </section>
      </main>
    </div>
  )
}

function Stat({ label, value, accent, muted }) {
  return (
    <div className={`flex flex-col items-end ${muted ? 'opacity-70' : ''}`}>
      <span
        className={[
          'font-display text-[18px] font-700 leading-none',
          accent === 'amber' ? 'text-[var(--color-amber)]' : 'text-[var(--color-ink)]',
        ].join(' ')}
      >
        {value}
      </span>
      <span className="mt-0.5 font-mono text-[9.5px] uppercase tracking-wider text-[var(--color-ink-mute)]">
        {label}
      </span>
    </div>
  )
}
