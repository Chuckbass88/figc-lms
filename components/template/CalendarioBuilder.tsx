'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import type { TemplateGiorno } from '@/lib/types'

interface Props {
  templateId: string
  onGiorniChange: (giorni: TemplateGiorno[]) => void
}

const DOW_HEADERS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const DOW_FULL    = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function dowMonday(d: Date): number {
  // 1=Mon, 2=Tue, ..., 6=Sat, 7=Sun
  return ((d.getDay() + 6) % 7) + 1
}

// 6-row × 7-col grid, overflow days from prev/next month included
function buildMonthGrid(year: number, month: number): { date: Date; inMonth: boolean }[][] {
  const firstDay = new Date(year, month, 1)
  const startDow = (firstDay.getDay() + 6) % 7 // 0 = Monday
  const cur = new Date(year, month, 1 - startDow)
  const rows: { date: Date; inMonth: boolean }[][] = []
  for (let row = 0; row < 6; row++) {
    const week: { date: Date; inMonth: boolean }[] = []
    for (let col = 0; col < 7; col++) {
      week.push({ date: new Date(cur), inMonth: cur.getMonth() === month })
      cur.setDate(cur.getDate() + 1)
    }
    rows.push(week)
    // Stop after 5 rows if the month is fully covered
    if (cur.getMonth() !== month && row >= 4) break
  }
  return rows
}

function getISOWeekKey(d: Date): string {
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const weekStart = new Date(jan4)
  weekStart.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const weekNum = Math.ceil(((d.getTime() - weekStart.getTime()) / 86400000 + 1) / 7)
  const year = weekNum < 1 ? d.getFullYear() - 1 : d.getFullYear()
  const wn   = weekNum < 1 ? 52 : weekNum
  return `${year}-${String(wn).padStart(2, '0')}`
}

function buildGiorniFromDates(
  selectedDates: Set<string>,
  halfDays: Set<string>
): Array<{
  numero: number
  giorno_settimana: number
  settimana_numero: number
  is_mezza_giornata: boolean
  isoDate: string
}> {
  if (selectedDates.size === 0) return []
  const sorted = [...selectedDates].sort()
  const weekMap = new Map<string, string[]>()
  for (const iso of sorted) {
    const d = new Date(iso + 'T12:00:00')
    const key = getISOWeekKey(d)
    const list = weekMap.get(key) ?? []
    list.push(iso)
    weekMap.set(key, list)
  }
  const weekKeys = [...weekMap.keys()].sort()
  const allWeeks: string[] = []
  const [fy, fw] = weekKeys[0].split('-').map(Number)
  const [ly, lw] = weekKeys[weekKeys.length - 1].split('-').map(Number)
  let y = fy, w = fw
  while (y < ly || (y === ly && w <= lw)) {
    allWeeks.push(`${y}-${String(w).padStart(2, '0')}`)
    w++; if (w > 52) { w = 1; y++ }
    if (allWeeks.length > 200) break
  }
  const result: ReturnType<typeof buildGiorniFromDates> = []
  let numero = 1
  for (let wi = 0; wi < allWeeks.length; wi++) {
    const settimana_numero = wi + 1
    const dates = weekMap.get(allWeeks[wi])
    if (!dates) continue
    for (const iso of [...dates].sort()) {
      const d = new Date(iso + 'T12:00:00')
      result.push({ numero: numero++, giorno_settimana: dowMonday(d), settimana_numero, is_mezza_giornata: halfDays.has(iso), isoDate: iso })
    }
  }
  return result
}

function computeRange(a: string, b: string): Set<string> {
  const startMs = Math.min(new Date(a + 'T12:00:00').getTime(), new Date(b + 'T12:00:00').getTime())
  const endMs   = Math.max(new Date(a + 'T12:00:00').getTime(), new Date(b + 'T12:00:00').getTime())
  const set = new Set<string>()
  const cur = new Date(startMs)
  while (cur.getTime() <= endMs) {
    if (dowMonday(cur) <= 6) set.add(toISO(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return set
}

export default function CalendarioBuilder({ templateId, onGiorniChange }: Props) {
  const today    = new Date()
  const todayISO = toISO(today)

  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [halfDays,      setHalfDays]      = useState<Set<string>>(new Set())
  const [rangeStart,    setRangeStart]    = useState<string | null>(null)
  const [hoverDate,     setHoverDate]     = useState<string | null>(null)
  const [saving,        setSaving]        = useState(false)
  const [saved,         setSaved]         = useState(false)

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month])

  const monthLabel = new Date(year, month, 1)
    .toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })

  const previewRange = useMemo<Set<string>>(() => {
    if (!rangeStart || !hoverDate || rangeStart === hoverDate) return new Set()
    return computeRange(rangeStart, hoverDate)
  }, [rangeStart, hoverDate])

  function handleDayClick(iso: string) {
    if (rangeStart === null) {
      if (selectedDates.has(iso)) {
        setSelectedDates(prev => { const n = new Set(prev); n.delete(iso); return n })
        setHalfDays(prev => { const n = new Set(prev); n.delete(iso); return n })
      } else {
        setSelectedDates(prev => new Set([...prev, iso]))
        setRangeStart(iso)
      }
    } else if (rangeStart === iso) {
      setRangeStart(null)
    } else {
      const rangeSet = computeRange(rangeStart, iso)
      setSelectedDates(prev => new Set([...prev, ...rangeSet]))
      setRangeStart(null); setHoverDate(null)
    }
  }

  function removeDay(iso: string) {
    setSelectedDates(prev => { const n = new Set(prev); n.delete(iso); return n })
    setHalfDays(prev => { const n = new Set(prev); n.delete(iso); return n })
    if (rangeStart === iso) setRangeStart(null)
  }

  function toggleHalfDay(iso: string) {
    setHalfDays(prev => { const n = new Set(prev); n.has(iso) ? n.delete(iso) : n.add(iso); return n })
  }

  function clearAll() {
    setSelectedDates(new Set()); setHalfDays(new Set()); setRangeStart(null); setHoverDate(null)
  }

  const giorniStruttura = useMemo(() => buildGiorniFromDates(selectedDates, halfDays), [selectedDates, halfDays])

  const settimaneMap = useMemo(() => {
    const m = new Map<number, typeof giorniStruttura>()
    for (const g of giorniStruttura) {
      const list = m.get(g.settimana_numero) ?? []; list.push(g); m.set(g.settimana_numero, list)
    }
    return m
  }, [giorniStruttura])

  const maxSettimana = giorniStruttura.length > 0 ? Math.max(...giorniStruttura.map(g => g.settimana_numero)) : 0

  async function handleApplica() {
    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const payload = giorniStruttura.map(({ isoDate: _, ...g }) => g)
      const res = await fetch(`/api/template/${templateId}/giorni`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulk: true, giorni: payload }),
      })
      const json = await res.json()
      if (json.giorni) { onGiorniChange(json.giorni); setSaved(true); setTimeout(() => setSaved(false), 2000) }
    } catch (err) {
      console.error('CalendarioBuilder:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Calendar header ── */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth}
          className="p-2 rounded-full transition-colors hover:bg-gray-100"
          style={{ color: '#1B3768' }}>
          <ChevronLeft size={18} />
        </button>

        <h3 className="text-sm font-semibold capitalize" style={{ color: '#1B3768' }}>
          {monthLabel}
        </h3>

        <button onClick={nextMonth}
          className="p-2 rounded-full transition-colors hover:bg-gray-100"
          style={{ color: '#1B3768' }}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Status hint */}
      <div className="flex items-center gap-2 min-h-[22px]">
        {rangeStart ? (
          <>
            <span className="text-xs font-medium" style={{ color: '#d97706' }}>
              Secondo clic per completare l&apos;intervallo
            </span>
            <button
              onClick={() => { setRangeStart(null); setHoverDate(null) }}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', border: '1px solid rgba(245,158,11,0.3)' }}>
              Annulla
            </button>
          </>
        ) : (
          <span className="text-xs" style={{ color: 'rgba(27,55,104,0.4)' }}>
            {selectedDates.size === 0
              ? '1° clic seleziona un giorno · 2° clic completa l\'intervallo · Clic su giorno selezionato per rimuoverlo'
              : `${selectedDates.size} giorn${selectedDates.size === 1 ? 'o' : 'i'} selezionat${selectedDates.size === 1 ? 'o' : 'i'}`}
          </span>
        )}
      </div>

      {/* ── Calendar grid ── */}
      <div className="w-full">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DOW_HEADERS.map((d, i) => (
            <div key={i} className="flex items-center justify-center py-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: i === 6 ? 'rgba(27,55,104,0.2)' : 'rgba(27,55,104,0.35)' }}>
                {d}
              </span>
            </div>
          ))}
        </div>

        {/* Week rows */}
        <div className="space-y-0.5">
          {grid.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {week.map(({ date, inMonth }, di) => {
                const iso      = toISO(date)
                const isSun    = di === 6
                const isSelected = selectedDates.has(iso)
                const isStart  = rangeStart === iso
                const isPreview = previewRange.has(iso) && !isSelected
                const isToday  = iso === todayISO
                const isHalf   = halfDays.has(iso)
                const disabled = isSun || !inMonth

                let bg      = 'transparent'
                let fg      = !inMonth ? 'rgba(27,55,104,0.18)' : isSun ? 'rgba(27,55,104,0.25)' : '#1B3768'
                let shadow  = 'none'
                let cursor  = disabled ? 'default' : 'pointer'

                if (isSelected && !disabled) {
                  bg = '#1EB8E5'; fg = 'white'
                } else if (isPreview && !disabled) {
                  bg = 'rgba(30,184,229,0.15)'
                }

                if (isStart) {
                  shadow = '0 0 0 2px #f59e0b'
                } else if (isToday && !isSelected) {
                  shadow = '0 0 0 1.5px rgba(30,184,229,0.5)'
                }

                return (
                  <div key={di} className="flex items-center justify-center" style={{ height: 44 }}>
                    <button
                      disabled={disabled}
                      onClick={() => !disabled && handleDayClick(iso)}
                      onMouseEnter={() => { if (rangeStart && !disabled) setHoverDate(iso) }}
                      onMouseLeave={() => { if (rangeStart) setHoverDate(null) }}
                      className="relative flex flex-col items-center justify-center w-9 h-9 rounded-full text-sm font-medium transition-all select-none"
                      style={{ background: bg, color: fg, boxShadow: shadow, cursor }}>
                      <span>{date.getDate()}</span>
                      {isHalf && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold"
                          style={{ fontSize: 8, background: '#f59e0b', color: 'white', lineHeight: 1 }}>
                          ½
                        </span>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Structure summary ── */}
      {giorniStruttura.length > 0 && (
        <div className="rounded-xl overflow-hidden mt-2"
          style={{ border: '1px solid rgba(27,55,104,0.1)' }}>
          <div className="flex items-center justify-between px-4 py-2.5"
            style={{ background: 'rgba(27,55,104,0.04)', borderBottom: '1px solid rgba(27,55,104,0.07)' }}>
            <p className="text-xs font-semibold" style={{ color: '#1B3768' }}>
              Struttura · {giorniStruttura.length} giornate · {maxSettimana} settimane
            </p>
            <button onClick={clearAll}
              className="text-xs px-2 py-0.5 rounded-lg transition-colors hover:bg-red-50"
              style={{ color: 'rgba(27,55,104,0.4)' }}>
              Cancella tutto
            </button>
          </div>

          <div className="px-4 py-3 space-y-2">
            {[...settimaneMap.entries()].sort(([a], [b]) => a - b).map(([wn, days]) => (
              <div key={wn} className="flex items-center gap-3">
                <span className="text-[10px] font-bold flex-shrink-0 px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(27,55,104,0.08)', color: '#1B3768' }}>
                  S{wn}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[...days].sort((a, b) => a.giorno_settimana - b.giorno_settimana).map(day => (
                    <div key={day.isoDate}
                      className="group flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: 'rgba(30,184,229,0.09)', color: '#1B3768', border: '1px solid rgba(30,184,229,0.2)' }}>
                      <span>{DOW_FULL[day.giorno_settimana - 1]}</span>
                      <button onClick={() => toggleHalfDay(day.isoDate)} title="Mezza giornata"
                        className="font-bold text-[11px]"
                        style={{ color: halfDays.has(day.isoDate) ? '#f59e0b' : 'rgba(27,55,104,0.25)' }}>
                        ½
                      </button>
                      <button onClick={() => removeDay(day.isoDate)} title="Rimuovi"
                        className="text-[12px] leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'rgba(27,55,104,0.4)' }}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Apply button ── */}
      <button
        onClick={handleApplica}
        disabled={saving || giorniStruttura.length === 0}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-colors"
        style={{
          backgroundColor: saved ? '#22c55e'
            : saving ? 'rgba(30,184,229,0.5)'
            : giorniStruttura.length === 0 ? 'rgba(27,55,104,0.15)'
            : '#1EB8E5',
          cursor: giorniStruttura.length === 0 ? 'not-allowed' : 'pointer',
        }}>
        <Check size={14} />
        {saved ? 'Struttura salvata!' : saving ? 'Salvataggio...' : 'Applica struttura'}
      </button>

      <p className="text-xs" style={{ color: 'rgba(27,55,104,0.3)' }}>
        ⓘ Le date sono un riferimento visivo. Il template salva la struttura settimanale (es. S1: Lun–Mer), non le date specifiche.
      </p>
    </div>
  )
}
