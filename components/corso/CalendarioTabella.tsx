'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Mail } from 'lucide-react'
import type { CorsoEvento } from '@/lib/types'

interface Props {
  corsoId: string
  corsoNome: string
  eventi: CorsoEvento[]
  canShare: boolean
}

const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
const WEEKS_PER_PAGE = 4

function getMonday(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const m = new Date(d)
  m.setDate(d.getDate() + diff)
  return m
}

function toISO(d: Date): string {
  return d.toISOString().split('T')[0]
}

function formatTime(t: string): string {
  return t.slice(0, 5)
}

function formatWeekRange(monday: Date): string {
  const sat = new Date(monday)
  sat.setDate(monday.getDate() + 5)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${monday.toLocaleDateString('it-IT', opts)}–${sat.toLocaleDateString('it-IT', opts)}`
}

export default function CalendarioTabella({ corsoId, corsoNome, eventi, canShare }: Props) {
  const [pageOffset, setPageOffset] = useState(0)
  const [sendingPdf, setSendingPdf] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const firstEventDate = eventi.length > 0 ? new Date(eventi[0].data + 'T12:00:00') : new Date()
  const startMonday = getMonday(firstEventDate)

  const weeks: Date[] = []
  for (let w = 0; w < WEEKS_PER_PAGE; w++) {
    const mon = new Date(startMonday)
    mon.setDate(startMonday.getDate() + (pageOffset * WEEKS_PER_PAGE + w) * 7)
    weeks.push(mon)
  }

  const eventiPerData = new Map<string, CorsoEvento[]>()
  eventi.forEach(ev => {
    const list = eventiPerData.get(ev.data) ?? []
    list.push(ev)
    eventiPerData.set(ev.data, list)
  })

  const lastEventDate = eventi.length > 0
    ? new Date(eventi[eventi.length - 1].data + 'T12:00:00')
    : new Date()
  const totalWeeks = Math.max(1, Math.ceil(
    (lastEventDate.getTime() - startMonday.getTime()) / (7 * 24 * 3600 * 1000) + 1
  ))
  const totalPages = Math.max(1, Math.ceil(totalWeeks / WEEKS_PER_PAGE))

  function downloadPdf() {
    window.open(`/api/corsi/${corsoId}/calendario/pdf`, '_blank')
  }

  async function sendEmail() {
    if (!emailInput.trim()) return
    setSendingPdf(true)
    await fetch(`/api/corsi/${corsoId}/calendario/invia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput }),
    })
    setSendingPdf(false)
    setEmailSent(true)
    setShowEmailForm(false)
    setTimeout(() => setEmailSent(false), 3000)
  }

  return (
    <div className="space-y-4">
      {/* Header azioni */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#1B3768' }}>Calendario</h2>
          <p className="text-sm" style={{ color: 'rgba(27,55,104,0.5)' }}>{corsoNome}</p>
        </div>

        {canShare && (
          <div className="flex items-center gap-2">
            {emailSent && <span className="text-xs text-green-600 font-medium">Email inviata ✓</span>}
            {showEmailForm ? (
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  placeholder="email@esempio.it"
                  className="rounded-xl px-3 py-2 text-sm border focus:outline-none focus:ring-2"
                  style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768', '--tw-ring-color': '#1EB8E5' } as React.CSSProperties}
                />
                <button onClick={sendEmail} disabled={sendingPdf}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-white"
                  style={{ background: sendingPdf ? 'rgba(30,184,229,0.5)' : '#1EB8E5' }}>
                  {sendingPdf ? '...' : 'Invia'}
                </button>
                <button onClick={() => setShowEmailForm(false)}
                  className="px-3 py-2 rounded-xl text-xs font-medium"
                  style={{ background: 'rgba(27,55,104,0.08)', color: '#1B3768' }}>
                  Annulla
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => setShowEmailForm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition hover:bg-gray-50"
                  style={{ borderColor: 'rgba(27,55,104,0.15)', color: '#1B3768' }}>
                  <Mail size={13} /> Invia via mail
                </button>
                <button onClick={downloadPdf}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition"
                  style={{ background: '#1EB8E5' }}>
                  <Download size={13} /> Scarica PDF
                </button>
              </>
            )}
          </div>
        )}

        {!canShare && (
          <button onClick={downloadPdf}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition hover:bg-gray-50"
            style={{ borderColor: 'rgba(27,55,104,0.15)', color: '#1B3768' }}>
            <Download size={13} /> Scarica PDF
          </button>
        )}
      </div>

      {/* Tabella */}
      {eventi.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 text-sm">Nessun evento nel calendario.</p>
          <p className="text-gray-300 text-xs mt-1">Applica un template per generare il calendario.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs border-collapse">
            <thead>
              <tr>
                <th className="w-28 px-3 py-2.5 text-left border-b border-r"
                  style={{ borderColor: 'rgba(27,55,104,0.08)', color: 'rgba(27,55,104,0.4)', fontSize: 10, fontWeight: 600, background: 'rgba(27,55,104,0.03)' }}>
                  SETTIMANA
                </th>
                {GIORNI.map(g => (
                  <th key={g} className="px-2 py-2.5 text-center border-b"
                    style={{ borderColor: 'rgba(27,55,104,0.08)', color: '#1B3768', fontWeight: 700, background: 'rgba(27,55,104,0.03)' }}>
                    {g}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((monday, wi) => {
                const weekDates = GIORNI.map((_, i) => {
                  const d = new Date(monday)
                  d.setDate(monday.getDate() + i)
                  return d
                })

                return (
                  <tr key={wi}>
                    <td className="px-3 py-2 border-r align-top"
                      style={{ borderColor: 'rgba(27,55,104,0.06)', color: 'rgba(27,55,104,0.45)', fontSize: 10, verticalAlign: 'top', minWidth: '6rem' }}>
                      <div className="font-semibold">Sett {pageOffset * WEEKS_PER_PAGE + wi + 1}</div>
                      <div style={{ opacity: 0.7 }}>{formatWeekRange(monday)}</div>
                    </td>
                    {weekDates.map((date, di) => {
                      const dateStr = toISO(date)
                      const dayEvents = eventiPerData.get(dateStr) ?? []
                      const isToday = dateStr === toISO(new Date())

                      return (
                        <td key={di} className="px-1.5 py-1.5 align-top border-r last:border-r-0"
                          style={{
                            borderColor: 'rgba(27,55,104,0.06)',
                            background: isToday ? 'rgba(30,184,229,0.04)' : 'transparent',
                          }}>
                          <div className="text-center mb-1"
                            style={{ color: isToday ? '#1EB8E5' : 'rgba(27,55,104,0.35)', fontSize: 10, fontWeight: isToday ? 700 : 400 }}>
                            {date.getDate()}
                          </div>
                          {dayEvents.map(ev => (
                            <div key={ev.id} className="rounded-lg px-1.5 py-1 mb-1"
                              style={{ background: 'rgba(27,55,104,0.07)', border: '1px solid rgba(27,55,104,0.1)' }}>
                              <div className="font-semibold truncate" style={{ color: '#1B3768', fontSize: 10 }}>
                                {ev.materia}
                              </div>
                              <div style={{ color: 'rgba(27,55,104,0.5)', fontSize: 9 }}>
                                {formatTime(ev.ora_inizio)}–{formatTime(ev.ora_fine)}
                              </div>
                            </div>
                          ))}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Navigazione pagine */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPageOffset(Math.max(0, pageOffset - 1))}
            disabled={pageOffset === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition disabled:opacity-30"
            style={{ borderColor: 'rgba(27,55,104,0.15)', color: '#1B3768' }}>
            <ChevronLeft size={14} /> Prev 4 sett
          </button>
          <span className="text-xs" style={{ color: 'rgba(27,55,104,0.4)' }}>
            Pagina {pageOffset + 1} di {totalPages}
          </span>
          <button
            onClick={() => setPageOffset(Math.min(totalPages - 1, pageOffset + 1))}
            disabled={pageOffset >= totalPages - 1}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition disabled:opacity-30"
            style={{ borderColor: 'rgba(27,55,104,0.15)', color: '#1B3768' }}>
            Prossime 4 sett <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
