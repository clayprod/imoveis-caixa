import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Hammer, ExternalLink, Bell, MapPin, Clock,
} from 'lucide-react'
import Sidebar from '../components/app/Sidebar'
import { MOCK_PROPERTIES } from '../lib/mockProperties'

const WEEKDAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function brl(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)
}

/** Constrói matriz 6x7 de células (segunda a domingo) cobrindo todo o mês alvo. */
function buildGrid(year, month) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  // segunda = 1; converter para offset 0 a 6 (mon = 0)
  const offsetStart = (first.getDay() + 6) % 7
  const days = []
  for (let i = 0; i < offsetStart; i++) {
    const d = new Date(year, month, -offsetStart + i + 1)
    days.push({ date: d, current: false })
  }
  for (let d = 1; d <= last.getDate(); d++) {
    days.push({ date: new Date(year, month, d), current: true })
  }
  while (days.length % 7 !== 0) {
    const last = days[days.length - 1].date
    const next = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1)
    days.push({ date: next, current: false })
  }
  while (days.length < 42) {
    const last = days[days.length - 1].date
    const next = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1)
    days.push({ date: next, current: false })
  }
  return days
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Pega todos os "eventos" (1º e 2º leilão) de cada imóvel. */
function buildEvents(properties) {
  const events = []
  for (const p of properties) {
    if (p.data_leilao_1) {
      events.push({
        property: p,
        date: new Date(p.data_leilao_1),
        kind: '1º leilão',
        valor: p.valor_leilao_1 ?? p.valor_avaliacao,
      })
    }
    if (p.data_leilao_2) {
      events.push({
        property: p,
        date: new Date(p.data_leilao_2),
        kind: '2º leilão',
        valor: p.valor_leilao_2 ?? p.preco_venda,
      })
    }
  }
  return events
}

export default function AuctionCalendar() {
  const navigate = useNavigate()
  const today = new Date()
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(null)

  const events = useMemo(() => buildEvents(MOCK_PROPERTIES), [])

  const eventsByDay = useMemo(() => {
    const m = new Map()
    for (const e of events) {
      const key = `${e.date.getFullYear()}-${e.date.getMonth()}-${e.date.getDate()}`
      if (!m.has(key)) m.set(key, [])
      m.get(key).push(e)
    }
    return m
  }, [events])

  const grid = buildGrid(cursor.getFullYear(), cursor.getMonth())

  const monthEvents = useMemo(
    () =>
      events
        .filter((e) => e.date.getFullYear() === cursor.getFullYear() && e.date.getMonth() === cursor.getMonth())
        .sort((a, b) => a.date - b.date),
    [events, cursor]
  )

  const upcoming = useMemo(
    () =>
      events
        .filter((e) => e.date >= today)
        .sort((a, b) => a.date - b.date)
        .slice(0, 5),
    [events]
  )

  const selectedEvents = useMemo(() => {
    if (!selected) return []
    const key = `${selected.getFullYear()}-${selected.getMonth()}-${selected.getDate()}`
    return eventsByDay.get(key) ?? []
  }, [selected, eventsByDay])

  const prevMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
  const nextMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
  const goToday = () => {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelected(today)
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <main className="flex flex-1 gap-4 overflow-hidden p-4 pl-0">
        {/* coluna principal: calendário */}
        <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          <header className="card-glass rise-in flex items-center gap-3 px-4 py-3">
            <CalendarIcon size={16} className="text-[var(--color-amber)]" />
            <h1 className="font-display text-[18px] font-700 leading-tight text-[var(--color-ink)]">
              Calendário de leilões
            </h1>
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--color-ink-mute)]">
              {events.length} eventos · {monthEvents.length} neste mês
            </span>

            <div className="ml-auto flex items-center gap-1.5">
              <button onClick={prevMonth} className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:border-[var(--color-ink-soft)]">
                <ChevronLeft size={15} />
              </button>
              <button onClick={goToday} className="rounded-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-1.5 text-[12px] font-500 text-[var(--color-ink)] hover:border-[var(--color-ink-soft)]">
                hoje
              </button>
              <button onClick={nextMonth} className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:border-[var(--color-ink-soft)]">
                <ChevronRight size={15} />
              </button>
            </div>

            <h2 className="font-display text-[16px] font-600 text-[var(--color-ink)]">
              {MONTHS[cursor.getMonth()]} <span className="text-[var(--color-ink-mute)]">{cursor.getFullYear()}</span>
            </h2>
          </header>

          <div className="card-paper rise-in flex min-h-0 flex-1 flex-col overflow-hidden p-3" style={{ animationDelay: '90ms' }}>
            <div className="grid grid-cols-7 gap-1.5 px-1 pb-2">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-center font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-mute)]">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid flex-1 grid-cols-7 grid-rows-6 gap-1.5">
              {grid.map((cell, i) => {
                const key = `${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}`
                const dayEvents = eventsByDay.get(key) ?? []
                const isToday = sameDay(cell.date, today)
                const isSelected = selected && sameDay(cell.date, selected)
                return (
                  <button
                    key={i}
                    onClick={() => setSelected(cell.date)}
                    onMouseEnter={() => setSelected(cell.date)}
                    className={[
                      'group relative flex flex-col items-start justify-start gap-1 rounded-xl border p-2 text-left transition-all',
                      cell.current ? 'bg-[var(--color-paper)]' : 'bg-[var(--color-paper-soft)]/40 opacity-50',
                      isSelected
                        ? 'border-[var(--color-ink)] shadow-[var(--shadow-soft)]'
                        : isToday
                          ? 'border-[var(--color-amber)]'
                          : 'border-[var(--color-line)] hover:border-[var(--color-ink-soft)]',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'font-display text-[12.5px] font-700',
                        isToday ? 'text-[var(--color-amber)]' : 'text-[var(--color-ink)]',
                        !cell.current && 'text-[var(--color-ink-mute)]',
                      ].filter(Boolean).join(' ')}
                    >
                      {cell.date.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="mt-auto flex w-full flex-col gap-0.5">
                        {dayEvents.slice(0, 2).map((e, idx) => (
                          <span
                            key={idx}
                            className={[
                              'truncate rounded px-1.5 py-0.5 text-[9.5px] font-600',
                              e.kind.startsWith('1')
                                ? 'bg-[var(--color-rust)] text-white'
                                : 'bg-[var(--color-amber)] text-[var(--color-ink)]',
                            ].join(' ')}
                          >
                            {e.kind} · {e.property.cidade}
                          </span>
                        ))}
                        {dayEvents.length > 2 && (
                          <span className="text-[9px] font-mono text-[var(--color-ink-mute)]">
                            +{dayEvents.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* coluna lateral: detalhes */}
        <aside className="flex w-[340px] shrink-0 flex-col gap-3 overflow-y-auto pr-1">
          {/* Próximos leilões */}
          <article className="card-paper rise-in p-5" style={{ animationDelay: '60ms' }}>
            <header className="mb-3 flex items-center gap-2">
              <Hammer size={14} className="text-[var(--color-rust)]" />
              <h3 className="font-display text-[14px] font-700 text-[var(--color-ink)]">Próximos leilões</h3>
            </header>
            <ul className="flex flex-col gap-2">
              {upcoming.length === 0 ? (
                <li className="text-[12px] text-[var(--color-ink-mute)]">Sem leilões agendados.</li>
              ) : (
                upcoming.map((e, i) => {
                  const days = Math.max(0, Math.round((e.date - today) / 86400000))
                  return (
                    <li
                      key={i}
                      onClick={() => navigate(`/property/${e.property.id}`)}
                      className="cursor-pointer rounded-xl border border-[var(--color-line)] bg-[var(--color-paper-soft)] p-3 transition-colors hover:bg-[var(--color-paper)] hover:border-[var(--color-ink-soft)]"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-rust)]">
                          {e.kind}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--color-ink-mute)]">
                          em {days === 0 ? 'hoje' : `${days}d`}
                        </span>
                      </div>
                      <p className="mt-1 truncate font-display text-[13px] font-700 text-[var(--color-ink)]">
                        {e.property.endereco_short}
                      </p>
                      <p className="text-[11px] text-[var(--color-ink-mute)]">
                        {e.property.bairro} · {e.property.cidade}/{e.property.uf}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-display text-[12.5px] font-700 text-[var(--color-amber)]">
                          {brl(e.valor)}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--color-ink-mute)]">
                          {e.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </li>
                  )
                })
              )}
            </ul>
          </article>

          {/* Detalhe da data selecionada */}
          {selected && (
            <article className="card-paper rise-in p-5" style={{ animationDelay: '120ms' }}>
              <header className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-[14px] font-700 text-[var(--color-ink)]">
                  {selected.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </h3>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-mute)]">
                  {selectedEvents.length} {selectedEvents.length === 1 ? 'evento' : 'eventos'}
                </span>
              </header>
              {selectedEvents.length === 0 ? (
                <p className="text-[12px] text-[var(--color-ink-mute)]">
                  Sem leilões nesta data.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {selectedEvents.map((e, i) => (
                    <li
                      key={i}
                      onClick={() => navigate(`/property/${e.property.id}`)}
                      className="cursor-pointer rounded-xl border border-[var(--color-line)] p-3 transition-colors hover:border-[var(--color-ink-soft)]"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`pill !py-0.5 !px-2 !text-[10px] ${
                            e.kind.startsWith('1') ? 'pill-rust' : 'pill-amber'
                          }`}
                        >
                          {e.kind}
                        </span>
                        <span className="flex items-center gap-1 font-mono text-[10px] text-[var(--color-ink-mute)]">
                          <Clock size={10} />
                          {e.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="mt-1.5 font-display text-[13px] font-700 text-[var(--color-ink)]">
                        {e.property.endereco_short}
                      </p>
                      <p className="flex items-center gap-1 text-[11px] text-[var(--color-ink-mute)]">
                        <MapPin size={10} />
                        {e.property.bairro} · {e.property.cidade}/{e.property.uf}
                      </p>
                      {e.property.nome_leiloeiro && (
                        <p className="mt-1.5 text-[11px] text-[var(--color-ink-soft)]">
                          Leiloeiro: <span className="font-600">{e.property.nome_leiloeiro}</span>
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-display text-[13px] font-700 text-[var(--color-amber)]">
                          {brl(e.valor)}
                        </span>
                        {e.property.link_pregoeiro && (
                          <a
                            href={e.property.link_pregoeiro}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(ev) => ev.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[10.5px] font-500 text-[var(--color-ink-mute)] hover:text-[var(--color-ink)]"
                          >
                            site <ExternalLink size={9} />
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          )}

          {/* Lembretes */}
          <article className="card-paper rise-in p-5" style={{ animationDelay: '180ms' }}>
            <header className="mb-2 flex items-center gap-2">
              <Bell size={14} className="text-[var(--color-amber)]" />
              <h3 className="font-display text-[14px] font-700 text-[var(--color-ink)]">Lembretes</h3>
            </header>
            <p className="text-[11.5px] leading-relaxed text-[var(--color-ink-soft)]">
              Adicione um imóvel à sua watchlist para receber WhatsApp 7 dias, 1 dia e 1 hora antes do leilão.
              O envio passa pelo n8n + Evolution API e respeita o número configurado no seu perfil.
            </p>
          </article>
        </aside>
      </main>
    </div>
  )
}
