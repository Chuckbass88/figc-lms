'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Check, Clock } from 'lucide-react'
import type { TemplateGiorno } from '@/lib/types'

interface Props {
  templateId: string
  onGiorniChange: (giorni: TemplateGiorno[]) => void
}

const GIORNI_SETTIMANA = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function dowMonday(d: Date): number {
  // Returns 1=Mon, 2=Tue, ..., 6=Sat, 7=Sun
  return ((d.getDay() + 6) % 7) + 1
}

function buildMonthGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  const startDow = (firstDay.getDay() + 6) % 7  // 0=Mon offset
  const rows: (Date | null)[][] = []
  const current = new Date(year, month, 1 - startDow)
  while (current <= lastDay || rows.length === 0) {
    const week: (Date | null)[] = []
    for (let d = 0; d < 6; d++) {  // Mon–Sat only
      const cell = new Date(current)
      week.push(cell.getMonth() === month ? cell : null)
      current.setDate(current.getDate() + 1)
    }
    current.setDate(current.getDate() + 1)  // skip Sunday
    rows.push(week)
    if (rows.length > 6) break
  }
  return rows
}

function getISOWeekKey(d: Date): string {
  // Returns "YYYY-WW" ISO week key
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const weekStart = new Date(jan4)
  weekStart.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const weekNum = Math.ceil(((d.getTime() - weekStart.getTime()) / 86400000 + 1) / 7)
  // Handle year boundary
  const year = weekNum < 1 ? d.getFullYear() - 1 : d.getFullYear()
  const wn = weekNum < 1 ? 52 : weekNum
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

  // Build dense week sequence (including gaps for pause weeks)
  const allWeeks: string[] = []
  const [fy, fw] = weekKeys[0].split('-').map(Number)
  const [ly, lw] = weekKeys[weekKeys.length - 1].split('-').map(Number)
  let y = fy, w = fw
  while (y < ly || (y === ly && w <= lw)) {
    allWeeks.push(`${y}-${String(w).padStart(2, '0')}`)
    w++
    if (w > 52) { w = 1; y++ }
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
      result.push({
        numero: numero++,
        giorno_settimana: dowMonday(d),
        settimana_numero,
        is_mezza_giornata: halfDays.has(iso),
        isoDate: iso,
      })
    }
  }
  return result
}

export default function CalendarioBuilder({ templateId, onGiorniChange }: Props) {
  const today = new Date()
  const [pageOffset, setPageOffset] = useState(0)
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [halfDays, setHalfDays] = useState<Set<string>>(new Set())
  const [rangeStart, setRangeStart] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const months = useMemo(() => {
    const base = new Date(today.getFullYear(), today.getMonth() + pageOffset, 1)
    return [0, 1, 2].map(offset => {
      const d = new Date(base.getFullYear(), base.getMonth() + offset, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageOffset])

  function handleDayClick(iso: string) {
    if (rangeStart === null) {
      setRangeStart(iso)
      return
    }
    if (rangeStart === iso) {
      setRangeStart(null)
      return
    }
    // Complete range: select all Mon-Sat between rangeStart and iso
    const startMs = Math.min(new Date(rangeStart + 'T12:00:00').getTime(), new Date(iso + 'T12:00:00').getTime())
    const endMs   = Math.max(new Date(rangeStart + 'T12:00:00').getTime(), new Date(iso + 'T12:00:00').getTime())
    const newDates = new Set(selectedDates)
    const cur = new Date(startMs)
    while (cur.getTime() <= endMs) {
      if (dowMonday(cur) <= 6) newDates.add(toISO(cur))
      cur.setDate(cur.getDate() + 1)
    }
    setSelectedDates(newDates)
    setRangeStart(null)
  }

  function toggleHalfDay(iso: string) {
    setHalfDays(prev => { const n = new Set(prev); n.has(iso) ? n.delete(iso) : n.add(iso); return n })
  }

  function removeDay(iso: string) {
    setSelectedDates(prev => { const n = new Set(prev); n.delete(iso); return n })
    setHalfDays(prev => { const n = new Set(prev); n.delete(iso); return n })
  }

  function clearAll() {
    setSelectedDates(new Set())
    setHalfDays(new Set())
    setRangeStart(null)
  }

  const giorniStruttura = useMemo(
    () => buildGiorniFromDates(selectedDates, halfDays),
    [selectedDates, halfDays]
  )

  const settimaneMap = useMemo(() => {
    const m = new Map<number, typeof giorniStruttura>()
    for (const g of giorniStruttura) {
      const list = m.get(g.settimana_numero) ?? []
      list.push(g)
      m.set(g.settimana_numero, list)
    }
    return m
  }, [giorniStruttura])

  const maxSettimana = giorniStruttura.length > 0
    ? Math.max(...giorniStruttura.map(g => g.settimana_numero))
    : 0

  async function handleApplica() {
    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const payload = giorniStruttura.map(({ isoDate: _, ...g }) => g)
      const res = await fetch(`/api/template/${templateId}/giorni`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulk: true, giorni: payload }),
      })
      const json = await res.json()
      if (json.giorni) {
        onGiorniChange(json.giorni)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (err) {
      console.error('CalendarioBuilder: errore salvataggio struttura', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setPageOffset(p => p - 3)}
          className="p-1.5 rounded-lg transition"
          style={{ color: 'rgba(27,55,104,0.5)' }}>
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs font-medium text-center" style={{ color: '#1B3768' }}>
          {rangeStart
            ? `Seleziona il giorno finale (inizio: ${rangeStart})`
            : 'Clicca il primo giorno di un blocco per iniziare'}
        </span>
        <button onClick={() => setPageOffset(p => p + 3)}
          className="p-1.5 rounded-lg transition"
          style={{ color: 'rgba(27,55,104,0.5)' }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* 3 month grids */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {months.map(({ year, month }) => {
          const label = new Date(year, month, 1)
            .toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
          const grid = buildMonthGrid(year, month)
          return (
            <div key={`${year}-${month}`} className="space-y-1">
              <p className="text-xs font-semibold text-center capitalize" style={{ color: '#1B3768' }}>{label}</p>
              <div className="grid grid-cols-6 gap-0.5">
                {GIORNI_SETTIMANA.map(d => (
                  <div key={d} className="text-center text-xs py-1 font-medium"
                    style={{ color: 'rgba(27,55,104,0.4)' }}>{d}</div>
                ))}
              </div>
              {grid.map((week, wi) => (
                <div key={wi} className="grid grid-cols-6 gap-0.5">
                  {week.map((date, di) => {
                    if (!date) return <div key={di} />
                    const iso = toISO(date)
                    const isSelected = selectedDates.has(iso)
                    const isStart = rangeStart === iso
                    const isHalf = halfDays.has(iso)
                    return (
                      <button
                        key={di}
                        onClick={() => handleDayClick(iso)}
                        className="relative h-7 w-full rounded text-xs font-medium transition-colors"
                        style={{
                          background: isStart    ? '#f59e0b'
                            : isSelected ? '#1EB8E5'
                            : 'rgba(27,55,104,0.04)',
                          color: (isSelected || isStart) ? 'white' : '#1B3768',
                          border: isStart ? '2px solid #d97706' : 'none',
                        }}>
                        {date.getDate()}
                        {isHalf && (
                          <span className="absolute bottom-0.5 right-0.5 text-[8px] leading-none"
                            style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : '#f59e0b' }}>½</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Structure summary */}
      {giorniStruttura.length > 0 && (
        <div className="rounded-xl p-3 space-y-2"
          style={{ background: 'rgba(27,55,104,0.04)', border: '1px solid rgba(27,55,104,0.08)' }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold" style={{ color: '#1B3768' }}>
              Struttura ({giorniStruttura.length} giornate, {maxSettimana} settimane)
            </p>
            <button onClick={clearAll} className="text-xs" style={{ color: 'rgba(27,55,104,0.4)' }}>
              Cancella tutto
            </button>
          </div>
          <div className="space-y-1.5">
            {[...settimaneMap.entries()].sort(([a], [b]) => a - b).map(([wn, days]) => (
              <div key={wn} className="flex items-start gap-2">
                <span className="text-xs font-semibold flex-shrink-0 w-8 mt-0.5"
                  style={{ color: 'rgba(27,55,104,0.5)' }}>S{wn}</span>
                <div className="flex flex-wrap gap-1">
                  {[...days].sort((a, b) => a.giorno_settimana - b.giorno_settimana).map(day => (
                    <div key={day.isoDate}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                      style={{ background: 'rgba(30,184,229,0.12)', color: '#1B3768' }}>
                      <span>{GIORNI_SETTIMANA[day.giorno_settimana - 1]}</span>
                      <button onClick={() => toggleHalfDay(day.isoDate)}
                        className="font-bold" title="Mezza giornata"
                        style={{ color: halfDays.has(day.isoDate) ? '#f59e0b' : 'rgba(27,55,104,0.3)' }}>
                        ½
                      </button>
                      <button onClick={() => removeDay(day.isoDate)}
                        className="text-[10px] leading-none" style={{ color: 'rgba(27,55,104,0.3)' }}>
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

      {/* Apply button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleApplica}
          disabled={saving || giorniStruttura.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition"
          style={{
            backgroundColor: saved ? '#22c55e'
              : saving ? 'rgba(30,184,229,0.5)'
              : giorniStruttura.length === 0 ? 'rgba(27,55,104,0.2)' : '#1EB8E5',
            cursor: giorniStruttura.length === 0 ? 'not-allowed' : 'pointer',
          }}>
          <Check size={14} />
          {saved ? 'Struttura applicata!' : saving ? 'Salvataggio...' : 'Applica struttura'}
        </button>
        {giorniStruttura.length > 0 && (
          <span className="text-xs" style={{ color: 'rgba(27,55,104,0.5)' }}>
            <Clock size={11} className="inline mr-1" />
            {giorniStruttura.length} giornate selezionate
          </span>
        )}
      </div>

      <p className="text-xs" style={{ color: 'rgba(27,55,104,0.35)' }}>
        ⓘ Le date nel calendario sono solo un riferimento visivo. Il template salva la struttura
        (es. Settimana 1: Lun–Mer), non le date specifiche.
      </p>
    </div>
  )
}
