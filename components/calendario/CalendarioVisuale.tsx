'use client'

import { useState, useTransition, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Clock, CalendarDays, AlignLeft, Check, Pencil } from 'lucide-react'
import { createReminder, updateReminder, deleteReminder } from '@/app/actions/reminders'
import type { Reminder, ReminderColor } from '@/app/actions/reminders'

// ── Tipi ───────────────────────────────────────────────────────────────────
export type CalEvent = {
  id: string
  kind: 'session' | 'task' | 'quiz'
  date: string
  title: string
  courseName: string
  href: string
  available?: boolean
}

// ── Colori promemoria (Apple style) ───────────────────────────────────────
const REMINDER_COLORS: Record<ReminderColor, { pill: string; bg: string; ring: string; label: string }> = {
  gray:   { pill: 'bg-gray-500 text-white',   bg: 'bg-gray-500',   ring: 'ring-gray-500',   label: 'Grigio'  },
  red:    { pill: 'bg-red-500 text-white',     bg: 'bg-red-500',    ring: 'ring-red-500',    label: 'Rosso'   },
  green:  { pill: 'bg-green-500 text-white',   bg: 'bg-green-500',  ring: 'ring-green-500',  label: 'Verde'   },
  blue:   { pill: 'bg-blue-400 text-white',    bg: 'bg-blue-400',   ring: 'ring-blue-400',   label: 'Blu'     },
  yellow: { pill: 'bg-yellow-400 text-gray-800', bg: 'bg-yellow-400', ring: 'ring-yellow-400', label: 'Giallo' },
}

// ── Costanti ──────────────────────────────────────────────────────────────
const DAYS_FULL = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const KIND_COLOR = {
  session:     { pill: 'bg-blue-500 hover:bg-blue-600 text-white',   dot: 'bg-blue-500'  },
  task:        { pill: 'bg-amber-500 hover:bg-amber-600 text-white', dot: 'bg-amber-500' },
  quiz:        { pill: 'bg-purple-500 hover:bg-purple-600 text-white', dot: 'bg-purple-500' },
  quiz_locked: { pill: 'bg-gray-200 text-gray-400 cursor-default',   dot: 'bg-gray-300'  },
}

function getDaysInMonth(y: number, m: number)  { return new Date(y, m + 1, 0).getDate() }
function getFirstDayOfMonth(y: number, m: number) { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1 }
function toDateStr(d: Date) { return d.toISOString().split('T')[0] }
function sortEvts(evs: CalEvent[]) {
  const order = { session: 0, task: 1, quiz: 2 }
  return [...evs].sort((a, b) => order[a.kind] - order[b.kind])
}
function getEvColor(ev: CalEvent) {
  if (ev.kind === 'quiz' && ev.available === false) return KIND_COLOR.quiz_locked
  return KIND_COLOR[ev.kind]
}

// ── Modal promemoria — Google Calendar style ──────────────────────────────
function ReminderModal({
  defaultDate,
  reminder,
  initialMode = 'edit',
  onClose,
  onAdd,
  onUpdate,
  onDelete,
}: {
  defaultDate: string
  reminder?: Reminder
  initialMode?: 'view' | 'edit'
  onClose: () => void
  onAdd?: (r: Reminder) => void
  onUpdate?: (r: Reminder) => void
  onDelete?: (id: string) => void
}) {
  const [mode,   setMode]   = useState<'view' | 'edit'>(initialMode)
  const [title,  setTitle]  = useState(reminder?.title ?? '')
  const [note,   setNote]   = useState(reminder?.note  ?? '')
  const [date,   setDate]   = useState(reminder?.date  ?? defaultDate)
  const [time,   setTime]   = useState(reminder?.time  ?? '')
  const [color,  setColor]  = useState<ReminderColor>(reminder?.color ?? 'blue')
  const [error,  setError]  = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (mode === 'edit') titleRef.current?.focus() }, [mode])
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // Colore hex per lo stile dinamico
  const colorHex: Record<ReminderColor, string> = {
    gray: '#6b7280', red: '#ef4444', green: '#22c55e', blue: '#3b82f6', yellow: '#eab308',
  }

  // Formato data leggibile
  function fmtDate(ds: string) {
    return new Date(ds + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Il titolo è obbligatorio'); return }
    setError(null)
    const timeVal = time.trim() || null
    startTransition(async () => {
      if (reminder) {
        const res = await updateReminder(reminder.id, {
          title: title.trim(), note: note.trim() || undefined, color, date, time: timeVal ?? undefined,
        })
        if (!res.ok) { setError(res.error); return }
        onUpdate?.({ ...reminder, title: title.trim(), note: note.trim() || null, color, date, time: timeVal })
      } else {
        const res = await createReminder({
          title: title.trim(), note: note.trim() || undefined, color, date, time: timeVal ?? undefined,
        })
        if (!res.ok) { setError(res.error); return }
        if (res.ok) onAdd?.(res.reminder)
      }
      onClose()
    })
  }

  function handleDelete() {
    if (!reminder) return
    startTransition(async () => {
      const res = await deleteReminder(reminder.id)
      if (!res.ok) { setError(res.error); return }
      onDelete?.(reminder.id)
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />

      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ boxShadow: '0 24px 48px rgba(0,0,0,0.18)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Barra colore in cima ── */}
        <div className="h-2 w-full" style={{ backgroundColor: colorHex[color] }} />

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
            {mode === 'view' ? 'Promemoria' : reminder ? 'Modifica promemoria' : 'Nuovo promemoria'}
          </p>
          <div className="flex items-center gap-1">
            {mode === 'view' && (
              <button
                onClick={() => setMode('edit')}
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
                title="Modifica"
              >
                <Pencil size={13} />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ══ MODALITÀ VISUALIZZAZIONE ══ */}
        {mode === 'view' ? (
          <div>
            {/* Titolo */}
            <div className="px-5 pb-1">
              <p className="text-xl font-semibold text-gray-900 pb-1 border-b-2" style={{ borderColor: colorHex[color] }}>
                {title}
              </p>
            </div>

            {/* Corpo */}
            <div className="px-5 py-4 space-y-0">
              {/* Data + Ora */}
              <div className="flex items-center gap-3 py-2.5 border-b border-gray-50">
                <CalendarDays size={16} className="text-gray-400 flex-shrink-0" />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-700 bg-gray-50 rounded-lg px-2.5 py-1 capitalize">{fmtDate(date)}</span>
                  {time && (
                    <span className="flex items-center gap-1.5 text-sm text-gray-700 bg-gray-50 rounded-lg px-2.5 py-1">
                      <Clock size={12} className="text-gray-400" />{time.slice(0, 5)}
                    </span>
                  )}
                </div>
              </div>

              {/* Nota */}
              {note ? (
                <div className="flex items-start gap-3 py-2.5 border-b border-gray-50">
                  <AlignLeft size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{note}</p>
                </div>
              ) : null}

              {/* Colore */}
              <div className="flex items-center gap-3 py-3">
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: colorHex[color] }} />
                <span className="text-sm text-gray-500">{REMINDER_COLORS[color].label}</span>
              </div>
            </div>

            {/* Footer view */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-medium transition disabled:opacity-40"
              >
                <Trash2 size={13} />Elimina
              </button>
              <button
                type="button"
                onClick={() => setMode('edit')}
                className="flex items-center gap-1.5 text-sm font-semibold text-white px-5 py-1.5 rounded-lg transition"
                style={{ backgroundColor: colorHex[color] }}
              >
                <Pencil size={13} />Modifica
              </button>
            </div>
          </div>
        ) : (
        /* ══ MODALITÀ MODIFICA/CREA ══ */
        <form onSubmit={handleSubmit}>
          {/* ── Titolo ── */}
          <div className="px-5 pb-1">
            <input
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Aggiungi un titolo"
              className="w-full text-xl font-normal text-gray-900 placeholder-gray-300 outline-none border-0 border-b-2 pb-1 transition-colors bg-transparent"
              style={{ borderColor: title ? colorHex[color] : '#e5e7eb' }}
              onFocus={e => (e.target.style.borderColor = colorHex[color])}
              onBlur={e => (e.target.style.borderColor = title ? colorHex[color] : '#e5e7eb')}
            />
          </div>

          {/* ── Corpo ── */}
          <div className="px-5 py-4 space-y-0">

            {/* Data + Ora */}
            <div className="flex items-center gap-3 py-2.5 border-b border-gray-50">
              <CalendarDays size={16} className="text-gray-400 flex-shrink-0" />
              <div className="flex items-center gap-2 flex-1 flex-wrap">
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg px-2.5 py-1 outline-none focus:ring-2 transition cursor-pointer"
                  style={{ colorScheme: 'light' }}
                />
                <div className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg px-2.5 py-1 transition">
                  <Clock size={12} className="text-gray-400" />
                  <input
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    placeholder="Orario"
                    className="text-sm text-gray-700 bg-transparent outline-none w-[80px] cursor-pointer"
                    style={{ colorScheme: 'light' }}
                  />
                  {time && (
                    <button type="button" onClick={() => setTime('')} className="text-gray-300 hover:text-gray-500 transition">
                      <X size={10} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Nota */}
            <div className="flex items-start gap-3 py-2.5 border-b border-gray-50">
              <AlignLeft size={16} className="text-gray-400 flex-shrink-0 mt-1" />
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Aggiungi una descrizione"
                rows={2}
                className="flex-1 text-sm text-gray-700 placeholder-gray-300 outline-none resize-none bg-transparent"
              />
            </div>

            {/* Colore */}
            <div className="flex items-center gap-3 py-3">
              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: colorHex[color] }} />
              <div className="flex items-center gap-2.5 flex-1">
                {(Object.entries(REMINDER_COLORS) as [ReminderColor, typeof REMINDER_COLORS[ReminderColor]][]).map(([key, val]) => (
                  <button
                    key={key}
                    type="button"
                    title={val.label}
                    onClick={() => setColor(key)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${val.bg} ${
                      color === key ? 'ring-2 ring-offset-2 scale-110' : 'hover:scale-110 opacity-60 hover:opacity-100'
                    }`}
                    style={color === key ? { outlineColor: colorHex[key] } : {}}
                  >
                    {color === key && <Check size={11} className={key === 'yellow' ? 'text-gray-700' : 'text-white'} />}
                  </button>
                ))}
                <span className="text-xs text-gray-400 ml-1">{REMINDER_COLORS[color].label}</span>
              </div>
            </div>

          </div>

          {error && <p className="text-xs text-red-500 px-5 pb-2">{error}</p>}

          {/* ── Footer ── */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            {reminder ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-medium transition disabled:opacity-40"
              >
                <Trash2 size={13} />Elimina
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={reminder ? () => setMode('view') : onClose}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-1.5 rounded-lg hover:bg-gray-100 transition font-medium"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isPending || !title.trim()}
                className="text-sm font-semibold text-white px-5 py-1.5 rounded-lg transition disabled:opacity-40"
                style={{ backgroundColor: colorHex[color] }}
              >
                {isPending ? '…' : reminder ? 'Salva' : 'Crea'}
              </button>
            </div>
          </div>
        </form>
        )}
      </div>
    </div>
  )
}

// ── Componente principale ─────────────────────────────────────────────────
export default function CalendarioVisuale({
  events,
  initialReminders = [],
}: {
  events: CalEvent[]
  initialReminders?: Reminder[]
}) {
  const today    = new Date()
  const todayStr = toDateStr(today)

  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selected,  setSelected]  = useState<string | null>(null)

  // Modal stato
  const [modalDate,     setModalDate]     = useState<string | null>(null)   // nuovo promemoria
  const [editReminder,  setEditReminder]  = useState<Reminder | null>(null)  // modifica

  // Reminders — stato locale con aggiornamenti ottimistici
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders)

  const handleAdd    = useCallback((r: Reminder)  => setReminders(prev => [...prev, r]), [])
  const handleUpdate = useCallback((r: Reminder)  => setReminders(prev => prev.map(x => x.id === r.id ? r : x)), [])
  const handleDelete = useCallback((id: string)   => setReminders(prev => prev.filter(x => x.id !== id)), [])

  // Indice eventi per data
  const byDate = new Map<string, CalEvent[]>()
  for (const ev of events) {
    if (!byDate.has(ev.date)) byDate.set(ev.date, [])
    byDate.get(ev.date)!.push(ev)
  }

  // Indice reminders per data
  const remByDate = new Map<string, Reminder[]>()
  for (const r of reminders) {
    if (!remByDate.has(r.date)) remByDate.set(r.date, [])
    remByDate.get(r.date)!.push(r)
  }

  function prevMonth() { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1) } else setViewMonth(m => m-1) }
  function nextMonth() { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1) } else setViewMonth(m => m+1) }
  function goToday()  { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setSelected(todayStr) }

  const daysInMonth  = getDaysInMonth(viewYear, viewMonth)
  const firstDay     = getFirstDayOfMonth(viewYear, viewMonth)

  const selectedEvts = selected ? sortEvts(byDate.get(selected) ?? []) : []
  const selectedRems = selected ? (remByDate.get(selected) ?? []) : []

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* ── Navigazione ── */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <button onClick={goToday} className="text-xs font-semibold px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            Oggi
          </button>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              <ChevronLeft size={16} className="text-gray-500" />
            </button>
            <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              <ChevronRight size={16} className="text-gray-500" />
            </button>
          </div>
          <h2 className="text-base font-semibold text-gray-900">{MONTHS_IT[viewMonth]} {viewYear}</h2>
          <div className="ml-auto flex items-center gap-3">
            {[
              { label: 'Sessione',   cls: 'bg-blue-500' },
              { label: 'Task',       cls: 'bg-amber-500' },
              { label: 'Quiz',       cls: 'bg-purple-500' },
              { label: 'Promemoria', cls: 'bg-gray-400' },
            ].map(({ label, cls }) => (
              <div key={label} className="hidden sm:flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-sm ${cls}`} />
                <span className="text-[11px] text-gray-400">{label}</span>
              </div>
            ))}
            {/* Pulsante sempre visibile — aggiunge promemoria a oggi */}
            <button
              onClick={() => setModalDate(todayStr)}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors ml-2"
            >
              <Plus size={12} />Promemoria
            </button>
          </div>
        </div>

        {/* ── Header giorni ── */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAYS_FULL.map((d, i) => (
            <div key={i} className={`py-2.5 text-center border-r last:border-r-0 border-gray-100 ${i >= 5 ? 'bg-gray-50/50' : ''}`}>
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{d}</span>
            </div>
          ))}
        </div>

        {/* ── Griglia ── */}
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e${i}`} className="border-r border-b border-gray-100 min-h-[110px] sm:min-h-[130px]" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const day       = idx + 1
            const col       = (firstDay + idx) % 7
            const ds        = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
            const evs       = sortEvts(byDate.get(ds) ?? [])
            const rems      = remByDate.get(ds) ?? []
            const isToday   = ds === todayStr
            const isPast    = ds < todayStr
            const isSel     = ds === selected
            const isWeekend = col >= 5
            const MAX       = 3
            const allPills  = [...evs.slice(0, MAX), ...rems.slice(0, Math.max(0, MAX - evs.length))]
            const totalAll  = evs.length + rems.length
            const overflow  = Math.max(0, totalAll - MAX)

            return (
              <div
                key={day}
                onClick={() => setSelected(p => p === ds ? null : ds)}
                className={`
                  border-r border-b border-gray-100 min-h-[110px] sm:min-h-[130px] p-1.5
                  cursor-pointer transition-colors relative group
                  ${isWeekend ? 'bg-gray-50/40' : 'bg-white'}
                  ${isSel ? '!bg-blue-50/60' : 'hover:bg-gray-50/60'}
                `}
              >
                {/* Numero */}
                <div className="flex justify-between items-start mb-1">
                  <span className={`
                    text-xs font-semibold leading-none w-7 h-7 flex items-center justify-center rounded-full select-none
                    ${isToday ? 'bg-blue-600 text-white font-bold' :
                      isSel   ? 'bg-blue-100 text-blue-700 font-bold' :
                      isPast  ? 'text-gray-300' :
                      isWeekend ? 'text-gray-400' : 'text-gray-700'}
                  `}>{day}</span>

                  {/* Pulsante "+" — sempre visibile, più pieno su hover */}
                  <button
                    onClick={e => { e.stopPropagation(); setModalDate(ds) }}
                    className="w-5 h-5 rounded-full bg-gray-100 hover:bg-blue-500 text-gray-300 hover:text-white flex items-center justify-center opacity-40 group-hover:opacity-100 transition-all flex-shrink-0"
                    title="Aggiungi promemoria"
                  >
                    <Plus size={11} />
                  </button>
                </div>

                {/* Pills — desktop */}
                <div className="hidden sm:flex flex-col gap-0.5">
                  {evs.slice(0, MAX).map(ev => {
                    const { pill } = getEvColor(ev)
                    const isLocked = ev.kind === 'quiz' && ev.available === false
                    const base = `w-full text-left text-[11px] font-medium px-2 py-0.5 rounded-[4px] truncate leading-[18px] transition-colors ${pill}`
                    if (isLocked) return <span key={ev.id} className={base} title={ev.title}>{ev.title}</span>
                    return (
                      <Link key={ev.id} href={ev.href} onClick={e => e.stopPropagation()} className={base} title={ev.title}>
                        {ev.title}
                      </Link>
                    )
                  })}
                  {/* Promemoria (fino al limite rimasto) */}
                  {rems.slice(0, Math.max(0, MAX - evs.length)).map(r => (
                    <button
                      key={r.id}
                      onClick={e => { e.stopPropagation(); setEditReminder(r) }}
                      className={`w-full text-left text-[11px] font-medium px-2 py-0.5 rounded-[4px] truncate leading-[18px] transition-opacity hover:opacity-80 ${REMINDER_COLORS[r.color].pill}`}
                      title={r.title}
                    >
                      {r.time ? `${r.time.slice(0,5)} ` : ''}{r.title}
                    </button>
                  ))}
                  {overflow > 0 && (
                    <span className="text-[10px] text-gray-400 font-medium px-2 leading-tight mt-0.5">+{overflow} altri</span>
                  )}
                </div>

                {/* Dots — mobile */}
                <div className="flex sm:hidden gap-0.5 flex-wrap mt-0.5 px-0.5">
                  {evs.slice(0,3).map((ev, j) => <span key={j} className={`w-1.5 h-1.5 rounded-full ${getEvColor(ev).dot}`} />)}
                  {rems.slice(0,2).map((r, j) => <span key={`r${j}`} className={`w-1.5 h-1.5 rounded-full ${REMINDER_COLORS[r.color].bg}`} />)}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Pannello giorno selezionato ── */}
        {selected && (
          <div className="border-t border-gray-100">
            <div className="px-5 py-3 flex items-center justify-between border-b border-gray-50">
              <p className="text-sm font-semibold text-gray-800 capitalize">
                {new Date(selected + 'T12:00:00').toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalDate(selected)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  <Plus size={12} />Promemoria
                </button>
                <button onClick={() => setSelected(null)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors ml-2">✕</button>
              </div>
            </div>

            {selectedEvts.length === 0 && selectedRems.length === 0 ? (
              <p className="text-xs text-gray-400 px-5 py-4">Nessun evento. Aggiungi un promemoria con "+".</p>
            ) : (
              <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                {/* Promemoria — ordinati per orario */}
                {[...selectedRems].sort((a,b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99')).map(r => (
                  <button
                    key={r.id}
                    onClick={() => setEditReminder(r)}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left group"
                  >
                    {/* Barra colore verticale */}
                    <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${REMINDER_COLORS[r.color].bg}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {r.time && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock size={10} />{r.time.slice(0,5)}
                          </span>
                        )}
                        {r.note && <p className="text-xs text-gray-400 truncate">{r.note}</p>}
                      </div>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${REMINDER_COLORS[r.color].pill} opacity-80`}>
                      Promemoria
                    </span>
                  </button>
                ))}
                {/* Eventi */}
                {selectedEvts.map(ev => {
                  const { dot, pill } = getEvColor(ev)
                  const isLocked = ev.kind === 'quiz' && ev.available === false
                  const kindLabel = ev.kind === 'session' ? 'Sessione' : ev.kind === 'task' ? 'Task' : isLocked ? 'In arrivo' : 'Quiz'
                  const badgeCls = ev.kind === 'session' ? 'bg-blue-50 text-blue-700' : ev.kind === 'task' ? 'bg-amber-50 text-amber-700' : isLocked ? 'bg-gray-50 text-gray-400' : 'bg-purple-50 text-purple-700'

                  const row = (
                    <div className="flex items-center gap-3 px-5 py-3">
                      <span className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{ev.title}</p>
                        <p className="text-xs text-gray-400 truncate">{ev.courseName}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${badgeCls}`}>{kindLabel}</span>
                    </div>
                  )
                  if (isLocked) return <div key={ev.id}>{row}</div>
                  return <Link key={ev.id} href={ev.href} className="block hover:bg-gray-50 transition-colors">{row}</Link>
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal nuovo promemoria ── */}
      {modalDate && (
        <ReminderModal
          defaultDate={modalDate}
          onClose={() => setModalDate(null)}
          onAdd={handleAdd}
        />
      )}

      {/* ── Modal modifica promemoria ── */}
      {editReminder && (
        <ReminderModal
          defaultDate={editReminder.date}
          reminder={editReminder}
          initialMode="view"
          onClose={() => setEditReminder(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </>
  )
}
