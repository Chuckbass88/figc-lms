// components/programma/ProgrammaPresenze.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import type { CorsoEvento, CorsoPresenza } from '@/lib/types'

interface Student { id: string; full_name: string }

interface Props {
  corsoId: string
  eventi: CorsoEvento[]
  studenti: Student[]
  canEdit: boolean  // false per studenti, true per docenti/admin
}

const DOW_IT  = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
const MONTH_IT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']

function formatDateLabel(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return `${DOW_IT[d.getDay()]} ${d.getDate()} ${MONTH_IT[d.getMonth()]} ${d.getFullYear()}`
}

export default function ProgrammaPresenze({ corsoId, eventi, studenti, canEdit }: Props) {
  // Date uniche dal calendario
  const dates = [...new Set(eventi.map(e => e.data))].sort()

  const [selectedDate, setSelectedDate] = useState<string>(dates[0] ?? '')
  const [presenze, setPresenze] = useState<CorsoPresenza[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [noteEditing, setNoteEditing] = useState<string | null>(null)
  const [noteValue, setNoteValue] = useState('')

  const fetchPresenze = useCallback(async (data: string) => {
    if (!data) return
    setLoading(true)
    const res = await fetch(`/api/corso/${corsoId}/presenze?data=${data}`)
    const json = await res.json()
    setPresenze(json.presenze ?? [])
    setLoading(false)
  }, [corsoId])

  useEffect(() => { fetchPresenze(selectedDate) }, [selectedDate, fetchPresenze])

  function getPresenza(studentId: string): CorsoPresenza | undefined {
    return presenze.find(p => p.student_id === studentId)
  }

  async function toggle(studentId: string, intent: boolean) {
    if (!canEdit) return
    const current = getPresenza(studentId)
    const newPresent = current ? !current.present : intent
    setSaving(studentId)
    const res = await fetch(`/api/corso/${corsoId}/presenze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: studentId,
        data: selectedDate,
        present: newPresent,
        note_assenza: newPresent ? null : (current?.note_assenza ?? null),
      }),
    })
    const json = await res.json()
    if (json.presenza) {
      setPresenze(prev => {
        const idx = prev.findIndex(p => p.student_id === studentId)
        return idx >= 0
          ? prev.map((p, i) => i === idx ? json.presenza : p)
          : [...prev, json.presenza]
      })
    }
    setSaving(null)
  }

  async function saveNote(studentId: string) {
    const current = getPresenza(studentId)
    setSaving(studentId + '-note')
    await fetch(`/api/corso/${corsoId}/presenze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: studentId,
        data: selectedDate,
        present: current?.present ?? false,
        note_assenza: noteValue.trim() || null,
      }),
    })
    setPresenze(prev => prev.map(p =>
      p.student_id === studentId ? { ...p, note_assenza: noteValue.trim() || null } : p
    ))
    setSaving(null)
    setNoteEditing(null)
  }

  async function markAll(present: boolean) {
    if (!canEdit) return
    setSaving('all')
    const results = await Promise.allSettled(studenti.map(s =>
      fetch(`/api/corso/${corsoId}/presenze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: s.id, data: selectedDate, present, note_assenza: null }),
      })
    ))
    const anyFailed = results.some(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok))
    await fetchPresenze(selectedDate)
    setSaving(null)
    if (anyFailed) {
      // Could surface error, for now just re-fetch so UI is consistent
      console.warn('Some presenze could not be saved')
    }
  }

  if (dates.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed p-12 text-center"
        style={{ borderColor: 'rgba(27,55,104,0.15)' }}>
        <p className="text-sm" style={{ color: 'rgba(27,55,104,0.4)' }}>
          Nessuna giornata nel programma. Applica un template prima di registrare le presenze.
        </p>
      </div>
    )
  }

  const currentIdx = dates.indexOf(selectedDate)
  const presentiCount = presenze.filter(p => p.present).length
  const assentiCount  = presenze.filter(p => !p.present).length

  return (
    <div className="space-y-4" id="programma-presenze">
      {/* Selettore data */}
      <div className="flex items-center gap-2">
        <button disabled={currentIdx <= 0}
          onClick={() => setSelectedDate(dates[currentIdx - 1])}
          className="p-1.5 rounded-lg disabled:opacity-30 transition hover:bg-gray-100">
          <ChevronLeft size={16} style={{ color: '#1B3768' }} />
        </button>
        <select
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="flex-1 text-sm rounded-xl px-3 py-2 border bg-white focus:outline-none"
          style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }}>
          {dates.map(d => (
            <option key={d} value={d}>{formatDateLabel(d)}</option>
          ))}
        </select>
        <button disabled={currentIdx >= dates.length - 1}
          onClick={() => setSelectedDate(dates[currentIdx + 1])}
          className="p-1.5 rounded-lg disabled:opacity-30 transition hover:bg-gray-100">
          <ChevronRight size={16} style={{ color: '#1B3768' }} />
        </button>
      </div>

      {/* Summary + azioni globali */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-xs">
          <span className="font-semibold" style={{ color: '#16a34a' }}>✓ {presentiCount} presenti</span>
          <span className="font-semibold" style={{ color: '#dc2626' }}>✗ {assentiCount} assenti</span>
          <span style={{ color: 'rgba(27,55,104,0.4)' }}>
            {studenti.length - presenze.length} non registrati
          </span>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button onClick={() => markAll(true)}
              disabled={saving === 'all'}
              className="text-xs px-2.5 py-1 rounded-lg font-medium transition"
              style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.2)' }}>
              Tutti presenti
            </button>
            <button onClick={() => markAll(false)}
              disabled={saving === 'all'}
              className="text-xs px-2.5 py-1 rounded-lg font-medium transition"
              style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.15)' }}>
              Tutti assenti
            </button>
          </div>
        )}
      </div>

      {/* Lista studenti */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={20} className="animate-spin" style={{ color: '#1EB8E5' }} />
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(27,55,104,0.1)' }}>
          {studenti.map((s, i) => {
            const p = getPresenza(s.id)
            const isPresent = p?.present ?? null  // null = non ancora registrato
            const isSavingThis = saving === s.id
            const editingNote = noteEditing === s.id

            return (
              <div key={s.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  borderBottom: i < studenti.length - 1 ? '1px solid rgba(27,55,104,0.06)' : 'none',
                  background: isPresent === false ? 'rgba(220,38,38,0.03)' : 'white',
                }}>
                {/* Avatar */}
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: isPresent === true ? '#16a34a' : isPresent === false ? '#dc2626' : 'rgba(27,55,104,0.2)' }}>
                  {s.full_name.charAt(0)}
                </div>

                {/* Nome */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#1B3768' }}>{s.full_name}</p>
                  {p?.note_assenza && !editingNote && (
                    <p className="text-xs truncate" style={{ color: 'rgba(220,38,38,0.7)' }}>
                      📝 {p.note_assenza}
                    </p>
                  )}
                  {editingNote && (
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        autoFocus
                        value={noteValue}
                        onChange={e => setNoteValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveNote(s.id); if (e.key === 'Escape') setNoteEditing(null) }}
                        placeholder="Motivo assenza (opzionale)"
                        className="flex-1 text-xs rounded-lg px-2 py-1 border focus:outline-none"
                        style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }}
                      />
                      <button onClick={() => saveNote(s.id)}
                        className="text-xs px-2 py-1 rounded-lg text-white"
                        style={{ background: '#1EB8E5' }}>
                        OK
                      </button>
                      <button onClick={() => setNoteEditing(null)}
                        className="text-xs px-2 py-1 rounded-lg"
                        style={{ color: 'rgba(27,55,104,0.4)' }}>
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* Azioni */}
                {canEdit && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isSavingThis ? (
                      <Loader2 size={14} className="animate-spin" style={{ color: '#1EB8E5' }} />
                    ) : (
                      <>
                        <button onClick={() => toggle(s.id, true)}
                          disabled={saving === 'all'}
                          className="w-8 h-8 rounded-full flex items-center justify-center transition"
                          style={{
                            background: isPresent === true ? '#16a34a' : 'rgba(22,163,74,0.1)',
                            color: isPresent === true ? 'white' : '#16a34a',
                          }}
                          title="Presente">
                          <Check size={14} />
                        </button>
                        <button onClick={() => toggle(s.id, false)}
                          disabled={saving === 'all'}
                          className="w-8 h-8 rounded-full flex items-center justify-center transition"
                          style={{
                            background: isPresent === false ? '#dc2626' : 'rgba(220,38,38,0.08)',
                            color: isPresent === false ? 'white' : '#dc2626',
                          }}
                          title="Assente">
                          <X size={14} />
                        </button>
                        {isPresent === false && (
                          <button
                            onClick={() => { setNoteEditing(s.id); setNoteValue(p?.note_assenza ?? '') }}
                            className="text-xs px-2 py-1 rounded-lg transition"
                            style={{ color: 'rgba(27,55,104,0.4)', border: '1px solid rgba(27,55,104,0.1)' }}
                            title="Aggiungi nota assenza">
                            📝
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Read-only badge */}
                {!canEdit && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      background: isPresent === true ? 'rgba(22,163,74,0.1)' : isPresent === false ? 'rgba(220,38,38,0.08)' : 'rgba(27,55,104,0.06)',
                      color: isPresent === true ? '#16a34a' : isPresent === false ? '#dc2626' : 'rgba(27,55,104,0.4)',
                    }}>
                    {isPresent === true ? 'Presente' : isPresent === false ? 'Assente' : '—'}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
