// components/programma/ProgrammaElenco.tsx
'use client'

import type { CorsoEvento } from '@/lib/types'

interface Props {
  eventi: CorsoEvento[]
  corseName: string
}

const DOW_IT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
const MONTH_IT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']

function formatDate(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return `${DOW_IT[d.getDay()]} ${d.getDate()} ${MONTH_IT[d.getMonth()]}`
}

function formatTime(t: string) { return t.slice(0, 5) }

function getMonday(d: Date): Date {
  const dow = d.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  const m = new Date(d)
  m.setDate(d.getDate() + diff)
  return m
}

function getISOWeekKey(d: Date): string {
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const weekStart = new Date(jan4)
  weekStart.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const wn = Math.ceil(((d.getTime() - weekStart.getTime()) / 86400000 + 1) / 7)
  const y = wn < 1 ? d.getFullYear() - 1 : d.getFullYear()
  return `${y}-${String(wn < 1 ? 52 : wn).padStart(2, '0')}`
}

function weekRangeLabel(dates: string[]): string {
  const sorted = [...dates].sort()
  const first = new Date(sorted[0] + 'T12:00:00')
  const last  = new Date(sorted[sorted.length - 1] + 'T12:00:00')
  const mon   = getMonday(first)
  const sat   = new Date(mon); sat.setDate(mon.getDate() + 5)
  const fmt   = (d: Date) => `${d.getDate()} ${MONTH_IT[d.getMonth()]}`
  return `${fmt(mon)}–${fmt(sat)} ${last.getFullYear()}`
}

export default function ProgrammaElenco({ eventi, corseName }: Props) {
  if (eventi.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed p-12 text-center"
        style={{ borderColor: 'rgba(27,55,104,0.15)' }}>
        <p className="text-sm" style={{ color: 'rgba(27,55,104,0.4)' }}>
          Nessun evento nel programma. Applica un template dalla Panoramica del corso.
        </p>
      </div>
    )
  }

  // Raggruppa per data
  const byDate = new Map<string, CorsoEvento[]>()
  for (const ev of eventi) {
    const list = byDate.get(ev.data) ?? []
    list.push(ev)
    byDate.set(ev.data, list)
  }

  // Raggruppa per settimana ISO
  const byWeek = new Map<string, string[]>()
  for (const iso of [...byDate.keys()].sort()) {
    const d   = new Date(iso + 'T12:00:00')
    const key = getISOWeekKey(d)
    const list = byWeek.get(key) ?? []
    list.push(iso)
    byWeek.set(key, list)
  }

  const weekEntries = [...byWeek.entries()].sort(([a], [b]) => a.localeCompare(b))
  let settimanaIdx = 1

  return (
    <div className="space-y-6" id="programma-elenco">
      {weekEntries.map(([weekKey, dates]) => {
        const idx = settimanaIdx++
        return (
          <div key={weekKey}>
            {/* Header settimana */}
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded"
                style={{ background: '#1B3768', color: 'white' }}>
                S{idx}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'rgba(27,55,104,0.5)' }}>
                {weekRangeLabel(dates)}
              </span>
              <div className="flex-1 h-px" style={{ background: 'rgba(27,55,104,0.08)' }} />
            </div>

            {/* Righe giorno */}
            <div className="space-y-1">
              {[...dates].sort().map(iso => {
                const fasce = (byDate.get(iso) ?? []).sort((a, b) => a.ora_inizio.localeCompare(b.ora_inizio))
                return (
                  <div key={iso} className="flex items-start gap-3 py-1.5 px-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(27,55,104,0.07)' }}>
                    {/* Label giorno */}
                    <span className="text-xs font-semibold flex-shrink-0 w-20 pt-1"
                      style={{ color: '#1B3768' }}>
                      {formatDate(iso)}
                    </span>
                    {/* Blocchi fascia */}
                    <div className="flex flex-wrap gap-1.5 flex-1">
                      {fasce.map(ev => {
                        const isPausa = !ev.materia || ['pausa', 'pranzo', 'caffè', 'cena', 'break'].some(
                          p => ev.materia?.toLowerCase().includes(p)
                        )
                        return (
                          <div key={ev.id}
                            className="flex flex-col px-2.5 py-1.5 rounded-lg text-xs leading-tight"
                            style={{
                              background: isPausa
                                ? 'rgba(245,158,11,0.1)'
                                : 'rgba(30,184,229,0.1)',
                              border: `1px solid ${isPausa ? 'rgba(245,158,11,0.2)' : 'rgba(30,184,229,0.2)'}`,
                              color: '#1B3768',
                            }}>
                            <span className="font-medium">{ev.materia || '—'}</span>
                            <span style={{ color: 'rgba(27,55,104,0.5)', fontSize: 10 }}>
                              {formatTime(ev.ora_inizio)}–{formatTime(ev.ora_fine)}
                            </span>
                            {ev.note && (
                              <span style={{ color: 'rgba(27,55,104,0.4)', fontSize: 10 }}>{ev.note}</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
