// components/programma/ProgrammaElenco.tsx
'use client'

import { useState, useEffect } from 'react'
import { Edit2, Trash2, Plus } from 'lucide-react'
import type { CorsoEvento } from '@/lib/types'

interface Props {
  eventi: CorsoEvento[]
  corseName: string
  corsoId: string
  canManage: boolean
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

const inputStyle = {
  borderColor: 'rgba(27,55,104,0.2)',
  color: '#1B3768',
}

export default function ProgrammaElenco({ eventi, corseName, corsoId, canManage }: Props) {
  const [localEventi, setLocalEventi] = useState<CorsoEvento[]>(eventi)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ materia: '', ora_inizio: '', ora_fine: '', note: '' })
  const [addingFasciaDate, setAddingFasciaDate] = useState<string | null>(null)
  const [newFascia, setNewFascia] = useState({ materia: '', ora_inizio: '', ora_fine: '', note: '', location: '' })
  const [addingGiorno, setAddingGiorno] = useState(false)
  const [newGiorno, setNewGiorno] = useState({ data: '', materia: '', ora_inizio: '', ora_fine: '', location: '' })
  const [giornoError, setGiornoError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { setLocalEventi(eventi) }, [eventi])

  function startEdit(ev: CorsoEvento) {
    setEditingId(ev.id)
    setEditForm({ materia: ev.materia, ora_inizio: ev.ora_inizio.slice(0, 5), ora_fine: ev.ora_fine.slice(0, 5), note: ev.note ?? '' })
  }

  async function saveEdit(ev: CorsoEvento) {
    setSaving(true)
    const res = await fetch(`/api/corso/${corsoId}/eventi/${ev.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    const json = await res.json()
    if (json.evento) {
      setLocalEventi(prev => prev.map(e => e.id === ev.id ? json.evento : e))
    }
    setEditingId(null)
    setSaving(false)
  }

  async function deleteEvento(id: string) {
    if (!window.confirm('Eliminare questa fascia?')) return
    setSaving(true)
    await fetch(`/api/corso/${corsoId}/eventi/${id}`, { method: 'DELETE' })
    setLocalEventi(prev => prev.filter(e => e.id !== id))
    setSaving(false)
  }

  async function addFascia(data: string) {
    if (!newFascia.materia || !newFascia.ora_inizio || !newFascia.ora_fine) return
    setSaving(true)
    const res = await fetch(`/api/corso/${corsoId}/eventi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, ...newFascia, location: newFascia.location || null }),
    })
    const json = await res.json()
    if (json.evento) {
      setLocalEventi(prev => [...prev, json.evento])
    }
    setNewFascia({ materia: '', ora_inizio: '', ora_fine: '', note: '', location: '' })
    setAddingFasciaDate(null)
    setSaving(false)
  }

  async function addGiorno() {
    if (!newGiorno.data || !newGiorno.materia || !newGiorno.ora_inizio || !newGiorno.ora_fine) {
      setGiornoError('Compila tutti i campi: data, materia, ora inizio e ora fine.')
      return
    }
    setGiornoError('')
    setSaving(true)
    const res = await fetch(`/api/corso/${corsoId}/eventi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newGiorno, location: newGiorno.location || null }),
    })
    const json = await res.json()
    if (json.evento) {
      setLocalEventi(prev => [...prev, json.evento])
    }
    setNewGiorno({ data: '', materia: '', ora_inizio: '', ora_fine: '', location: '' })
    setAddingGiorno(false)
    setSaving(false)
  }

  if (localEventi.length === 0 && !canManage) {
    return (
      <div className="rounded-2xl border-2 border-dashed p-12 text-center"
        style={{ borderColor: 'rgba(27,55,104,0.15)' }}>
        <p className="text-sm" style={{ color: 'rgba(27,55,104,0.4)' }}>
          Nessun evento nel programma. Applica un template dalla Panoramica del corso.
        </p>
      </div>
    )
  }

  if (localEventi.length === 0 && canManage) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border-2 border-dashed p-12 text-center"
          style={{ borderColor: 'rgba(27,55,104,0.15)' }}>
          <p className="text-sm mb-4" style={{ color: 'rgba(27,55,104,0.4)' }}>
            Nessun evento nel programma. Applica un template o aggiungi manualmente.
          </p>
          <button
            onClick={() => setAddingGiorno(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition hover:bg-gray-50"
            style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }}>
            <Plus size={12} /> Aggiungi giornata
          </button>
        </div>
        {addingGiorno && (
          <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'rgba(27,55,104,0.15)', background: 'rgba(255,255,255,0.8)' }}>
            <p className="text-xs font-semibold" style={{ color: '#1B3768' }}>Nuova giornata</p>
            <div className="flex flex-wrap gap-2">
              <input type="date" value={newGiorno.data} onChange={e => setNewGiorno(p => ({ ...p, data: e.target.value }))}
                className="rounded-lg border text-xs px-2 py-1" style={inputStyle} />
              <input type="text" placeholder="Materia" value={newGiorno.materia} onChange={e => setNewGiorno(p => ({ ...p, materia: e.target.value }))}
                className="rounded-lg border text-xs px-2 py-1 flex-1 min-w-24" style={inputStyle} />
              <input type="time" value={newGiorno.ora_inizio} onChange={e => setNewGiorno(p => ({ ...p, ora_inizio: e.target.value }))}
                className="rounded-lg border text-xs px-2 py-1" style={inputStyle} />
              <input type="time" value={newGiorno.ora_fine} onChange={e => setNewGiorno(p => ({ ...p, ora_fine: e.target.value }))}
                className="rounded-lg border text-xs px-2 py-1" style={inputStyle} />
            </div>
            {giornoError && (
              <p className="text-xs" style={{ color: '#DC2626' }}>{giornoError}</p>
            )}
            <div className="flex gap-2">
              <button onClick={addGiorno} disabled={saving}
                className="px-3 py-1 rounded-lg text-xs font-medium text-white transition"
                style={{ background: '#1B3768', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Salvataggio…' : 'Aggiungi'}
              </button>
              <button onClick={() => { setAddingGiorno(false); setGiornoError('') }}
                className="px-3 py-1 rounded-lg text-xs font-medium border transition hover:bg-gray-50"
                style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }}>
                Annulla
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Raggruppa per data
  const byDate = new Map<string, CorsoEvento[]>()
  for (const ev of localEventi) {
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
                    {/* Label giorno + sede */}
                    <div className="flex-shrink-0 w-28 pt-1">
                      <span className="text-xs font-semibold block" style={{ color: '#1B3768' }}>
                        {formatDate(iso)}
                      </span>
                      {fasce[0]?.location && (
                        <span className="text-[10px] flex items-center gap-0.5 mt-0.5" style={{ color: '#0891B2' }}>
                          📍 {fasce[0].location}
                        </span>
                      )}
                    </div>
                    {/* Blocchi fascia */}
                    <div className="flex flex-wrap gap-1.5 flex-1">
                      {fasce.map(ev => {
                        if (canManage && editingId === ev.id) {
                          // Inline edit form
                          return (
                            <div key={ev.id} className="flex flex-wrap gap-1.5 items-center rounded-lg px-2.5 py-1.5 w-full"
                              style={{ background: 'rgba(30,184,229,0.06)', border: '1px solid rgba(30,184,229,0.25)' }}>
                              <input type="text" placeholder="Materia" value={editForm.materia}
                                onChange={e => setEditForm(p => ({ ...p, materia: e.target.value }))}
                                className="rounded-lg border text-xs px-2 py-1 flex-1 min-w-24" style={inputStyle} />
                              <input type="time" value={editForm.ora_inizio}
                                onChange={e => setEditForm(p => ({ ...p, ora_inizio: e.target.value }))}
                                className="rounded-lg border text-xs px-2 py-1" style={inputStyle} />
                              <input type="time" value={editForm.ora_fine}
                                onChange={e => setEditForm(p => ({ ...p, ora_fine: e.target.value }))}
                                className="rounded-lg border text-xs px-2 py-1" style={inputStyle} />
                              <input type="text" placeholder="Note (opzionale)" value={editForm.note}
                                onChange={e => setEditForm(p => ({ ...p, note: e.target.value }))}
                                className="rounded-lg border text-xs px-2 py-1 flex-1 min-w-24" style={inputStyle} />
                              <button onClick={() => saveEdit(ev)} disabled={saving}
                                className="px-2 py-1 rounded-lg text-xs font-medium text-white"
                                style={{ background: '#1B3768', opacity: saving ? 0.6 : 1 }}>
                                {saving ? '…' : 'Salva'}
                              </button>
                              <button onClick={() => setEditingId(null)}
                                className="px-2 py-1 rounded-lg text-xs font-medium border"
                                style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }}>
                                Annulla
                              </button>
                            </div>
                          )
                        }

                        const isPausa = !ev.materia || ['pausa', 'pranzo', 'caffè', 'cena', 'break'].some(
                          p => ev.materia?.toLowerCase().includes(p)
                        )
                        return (
                          <div key={ev.id} className="group relative flex flex-col px-2.5 py-1.5 rounded-lg text-xs leading-tight"
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
                            {canManage && (
                              <div className="absolute -top-1.5 -right-1.5 hidden group-hover:flex gap-0.5">
                                <button onClick={() => startEdit(ev)}
                                  className="p-0.5 rounded bg-white shadow-sm border transition hover:bg-blue-50"
                                  style={{ borderColor: 'rgba(27,55,104,0.15)' }}
                                  title="Modifica">
                                  <Edit2 size={10} style={{ color: '#1B3768' }} />
                                </button>
                                <button onClick={() => deleteEvento(ev.id)}
                                  className="p-0.5 rounded bg-white shadow-sm border transition hover:bg-red-50"
                                  style={{ borderColor: 'rgba(27,55,104,0.15)' }}
                                  title="Elimina">
                                  <Trash2 size={10} style={{ color: '#DC2626' }} />
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* + Aggiungi fascia */}
                      {canManage && (
                        addingFasciaDate === iso ? (
                          <div className="flex flex-wrap gap-1.5 items-center rounded-lg px-2.5 py-1.5 w-full"
                            style={{ background: 'rgba(30,184,229,0.06)', border: '1px dashed rgba(30,184,229,0.3)' }}>
                            <input type="text" placeholder="Materia" value={newFascia.materia}
                              onChange={e => setNewFascia(p => ({ ...p, materia: e.target.value }))}
                              className="rounded-lg border text-xs px-2 py-1 flex-1 min-w-24" style={inputStyle} />
                            <input type="time" value={newFascia.ora_inizio}
                              onChange={e => setNewFascia(p => ({ ...p, ora_inizio: e.target.value }))}
                              className="rounded-lg border text-xs px-2 py-1" style={inputStyle} />
                            <input type="time" value={newFascia.ora_fine}
                              onChange={e => setNewFascia(p => ({ ...p, ora_fine: e.target.value }))}
                              className="rounded-lg border text-xs px-2 py-1" style={inputStyle} />
                            <input type="text" placeholder="Note (opzionale)" value={newFascia.note}
                              onChange={e => setNewFascia(p => ({ ...p, note: e.target.value }))}
                              className="rounded-lg border text-xs px-2 py-1 flex-1 min-w-24" style={inputStyle} />
                            <button onClick={() => addFascia(iso)} disabled={saving}
                              className="px-2 py-1 rounded-lg text-xs font-medium text-white"
                              style={{ background: '#1B3768', opacity: saving ? 0.6 : 1 }}>
                              {saving ? '…' : 'Aggiungi'}
                            </button>
                            <button onClick={() => setAddingFasciaDate(null)}
                              className="px-2 py-1 rounded-lg text-xs font-medium border"
                              style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }}>
                              Annulla
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => { const last = fasce[fasce.length - 1]; setAddingFasciaDate(iso); setNewFascia({ materia: '', ora_inizio: last ? formatTime(last.ora_fine) : '', ora_fine: '', note: '', location: fasce[0]?.location ?? '' }) }}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border transition hover:bg-gray-50"
                            style={{ borderColor: 'rgba(27,55,104,0.15)', color: 'rgba(27,55,104,0.5)' }}>
                            <Plus size={10} /> Aggiungi fascia
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* + Aggiungi giornata */}
      {canManage && (
        <div>
          {addingGiorno ? (
            <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'rgba(27,55,104,0.15)', background: 'rgba(255,255,255,0.8)' }}>
              <p className="text-xs font-semibold" style={{ color: '#1B3768' }}>Nuova giornata</p>
              <div className="flex flex-wrap gap-2">
                <input type="date" value={newGiorno.data} onChange={e => setNewGiorno(p => ({ ...p, data: e.target.value }))}
                  className="rounded-lg border text-xs px-2 py-1" style={inputStyle} />
                <input type="text" placeholder="Materia" value={newGiorno.materia} onChange={e => setNewGiorno(p => ({ ...p, materia: e.target.value }))}
                  className="rounded-lg border text-xs px-2 py-1 flex-1 min-w-24" style={inputStyle} />
                <input type="time" value={newGiorno.ora_inizio} onChange={e => setNewGiorno(p => ({ ...p, ora_inizio: e.target.value }))}
                  className="rounded-lg border text-xs px-2 py-1" style={inputStyle} />
                <input type="time" value={newGiorno.ora_fine} onChange={e => setNewGiorno(p => ({ ...p, ora_fine: e.target.value }))}
                  className="rounded-lg border text-xs px-2 py-1" style={inputStyle} />
                <input type="text" placeholder="Sede (opzionale, es. Roma)" value={newGiorno.location} onChange={e => setNewGiorno(p => ({ ...p, location: e.target.value }))}
                  className="rounded-lg border text-xs px-2 py-1 flex-1 min-w-28" style={inputStyle} />
              </div>
              <div className="flex gap-2">
                <button onClick={addGiorno} disabled={saving}
                  className="px-3 py-1 rounded-lg text-xs font-medium text-white transition"
                  style={{ background: '#1B3768', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Salvataggio…' : 'Aggiungi'}
                </button>
                <button onClick={() => setAddingGiorno(false)}
                  className="px-3 py-1 rounded-lg text-xs font-medium border transition hover:bg-gray-50"
                  style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }}>
                  Annulla
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingGiorno(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition hover:bg-gray-50"
              style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }}>
              <Plus size={12} /> Aggiungi giornata
            </button>
          )}
        </div>
      )}
    </div>
  )
}
