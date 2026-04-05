'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Calendar, Check, X, Trash2, Loader2, Users, Download, Pencil, Award, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Student { id: string; full_name: string }
interface Attendance { student_id: string; present: boolean }
interface Session {
  id: string
  title: string
  session_date: string
  attendances: Attendance[]
}

interface Props {
  courseId: string
  courseName: string
  students: Student[]
  initialSessions: Session[]
}

export default function PresenzeClient({ courseId, courseName, students, initialSessions }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [sessions, setSessions] = useState(initialSessions)
  const [activeSession, setActiveSession] = useState<string | null>(
    initialSessions.length > 0 ? initialSessions[0].id : null
  )
  const [showNewForm, setShowNewForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [editingSession, setEditingSession] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDate, setEditDate] = useState('')

  const current = sessions.find(s => s.id === activeSession)

  function getAttendance(session: Session, studentId: string): boolean {
    return session.attendances.find(a => a.student_id === studentId)?.present ?? false
  }

  async function createSession() {
    if (!newTitle.trim()) return
    setCreating(true)
    const { data, error } = await supabase
      .from('course_sessions')
      .insert({ course_id: courseId, title: newTitle.trim(), session_date: newDate })
      .select('id, title, session_date')
      .single()

    if (!error && data) {
      // Pre-popola le presenze come assenti
      const attendanceRows = students.map(s => ({
        session_id: data.id, student_id: s.id, present: false
      }))
      if (attendanceRows.length > 0) {
        await supabase.from('attendances').insert(attendanceRows)
      }
      const newSession: Session = { ...data, attendances: students.map(s => ({ student_id: s.id, present: false })) }
      setSessions(prev => [newSession, ...prev])
      setActiveSession(data.id)
      setNewTitle('')
      setNewDate(new Date().toISOString().split('T')[0])
      setShowNewForm(false)
    }
    setCreating(false)
  }

  async function togglePresence(sessionId: string, studentId: string, current: boolean) {
    setSaving(`${sessionId}-${studentId}`)
    await supabase
      .from('attendances')
      .upsert({ session_id: sessionId, student_id: studentId, present: !current }, { onConflict: 'session_id,student_id' })

    setSessions(prev => prev.map(s => s.id !== sessionId ? s : {
      ...s,
      attendances: s.attendances.map(a =>
        a.student_id === studentId ? { ...a, present: !current } : a
      )
    }))
    setSaving(null)
  }

  async function saveSession(sessionId: string) {
    if (!editTitle.trim()) return
    const { error } = await supabase
      .from('course_sessions')
      .update({ title: editTitle.trim(), session_date: editDate })
      .eq('id', sessionId)
    if (!error) {
      setSessions(prev => prev.map(s => s.id !== sessionId ? s : {
        ...s,
        title: editTitle.trim(),
        session_date: editDate,
      }))
    }
    setEditingSession(null)
  }

  async function markAll(present: boolean) {
    if (!current) return
    setSaving('all')
    const rows = students.map(s => ({
      session_id: current.id, student_id: s.id, present,
    }))
    await supabase.from('attendances').upsert(rows, { onConflict: 'session_id,student_id' })
    setSessions(prev => prev.map(s => s.id !== current.id ? s : {
      ...s,
      attendances: s.attendances.map(a => ({ ...a, present })),
    }))
    setSaving(null)
  }

  async function deleteSession(sessionId: string) {
    if (!confirm('Eliminare questa sessione e tutte le presenze?')) return
    await supabase.from('course_sessions').delete().eq('id', sessionId)
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    setActiveSession(prev => prev === sessionId ? (sessions[0]?.id ?? null) : prev)
  }

  const presentCount = current
    ? current.attendances.filter(a => a.present).length
    : 0

  function exportCSV() {
    const sorted = [...sessions].sort(
      (a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
    )
    const headers = [
      'Corsista',
      ...sorted.map(s =>
        new Date(s.session_date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
        ' - ' + s.title
      ),
      'Presenze', 'Totale', '%',
    ]
    const rows = students.map(student => {
      const present = sorted.filter(s =>
        s.attendances.find(a => a.student_id === student.id)?.present
      ).length
      const total = sorted.length
      return [
        student.full_name,
        ...sorted.map(s => s.attendances.find(a => a.student_id === student.id)?.present ? 'P' : 'A'),
        present, total, total > 0 ? `${Math.round((present / total) * 100)}%` : '—',
      ]
    })
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `presenze_${courseName.replace(/\s+/g, '_')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push(`/docente/corsi/${courseId}`)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3"
        >
          <ArrowLeft size={15} /> {courseName}
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Registro Presenze</h2>
            <p className="text-gray-500 text-sm mt-1">{sessions.length} {sessions.length === 1 ? 'sessione' : 'sessioni'}</p>
          </div>
          <div className="flex items-center gap-2">
            {sessions.length > 0 && (
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition"
              >
                <Download size={14} /> CSV
              </button>
            )}
            <button
              onClick={() => setShowNewForm(v => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition"
              style={{ backgroundColor: '#1565C0' }}
            >
              <Plus size={15} /> Nuova sessione
            </button>
          </div>
        </div>
      </div>

      {/* Form nuova sessione */}
      {showNewForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <p className="font-semibold text-gray-800 text-sm">Nuova sessione</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Titolo (es. Lezione 1 — Tattica)"
              className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowNewForm(false)}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              Annulla
            </button>
            <button
              onClick={createSession}
              disabled={creating || !newTitle.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60 hover:opacity-90 transition"
              style={{ backgroundColor: '#1565C0' }}
            >
              {creating && <Loader2 size={13} className="animate-spin" />}
              Crea sessione
            </button>
          </div>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Calendar size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Nessuna sessione creata.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Lista sessioni */}
          <div className="space-y-2">
            {sessions.map(s => {
              const present = s.attendances.filter(a => a.present).length
              const isActive = s.id === activeSession
              const isEditing = editingSession === s.id

              if (isEditing) {
                return (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-xl border border-blue-300 bg-blue-50 shadow-sm space-y-2"
                    onClick={e => e.stopPropagation()}
                  >
                    <p className="text-xs font-semibold text-blue-800 mb-1">Modifica sessione</p>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      placeholder="Titolo sessione"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="date"
                      value={editDate}
                      onChange={e => setEditDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingSession(null)}
                        className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition"
                      >
                        Annulla
                      </button>
                      <button
                        onClick={() => saveSession(s.id)}
                        disabled={!editTitle.trim()}
                        className="flex-1 px-2 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-60 hover:opacity-90 transition"
                        style={{ backgroundColor: '#1565C0' }}
                      >
                        Salva
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={s.id}
                  onClick={() => setActiveSession(s.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    isActive
                      ? 'border-blue-300 bg-blue-50 shadow-sm'
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                        {s.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(s.session_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setEditingSession(s.id)
                          setEditTitle(s.title)
                          setEditDate(s.session_date)
                        }}
                        className="p-1 rounded text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); deleteSession(s.id) }}
                        className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Users size={11} className="text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {present}/{s.attendances.length} presenti
                    </span>
                    <div className="flex-1 h-1 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all"
                        style={{ width: s.attendances.length > 0 ? `${(present / s.attendances.length) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Registro */}
          {current && (
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{current.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(current.session_date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/docente/corsi/${courseId}/presenze/foglio/${current.id}`}
                      target="_blank"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-indigo-700 hover:bg-indigo-50 border border-gray-200 transition"
                    >
                      <FileText size={12} /> Foglio firme
                    </Link>
                    <span className="text-sm font-semibold text-gray-700">
                      {presentCount}/{students.length} presenti
                    </span>
                  </div>
                </div>
                {students.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => markAll(true)}
                      disabled={saving === 'all'}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-100 text-green-700 hover:bg-green-200 transition disabled:opacity-50"
                    >
                      {saving === 'all' ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                      Tutti presenti
                    </button>
                    <button
                      onClick={() => markAll(false)}
                      disabled={saving === 'all'}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition disabled:opacity-50"
                    >
                      <X size={11} /> Tutti assenti
                    </button>
                  </div>
                )}
              </div>
              <div className="divide-y divide-gray-50">
                {students.map(student => {
                  const isPresent = getAttendance(current, student.id)
                  const isSaving = saving === `${current.id}-${student.id}`
                  return (
                    <div key={student.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: '#1565C0' }}>
                        {student.full_name.charAt(0)}
                      </div>
                      <Link href={`/docente/corsisti/${student.id}`} className="flex-1 text-sm font-medium text-gray-900 hover:text-blue-700 transition truncate">{student.full_name}</Link>
                      <button
                        onClick={() => togglePresence(current.id, student.id, isPresent)}
                        disabled={isSaving}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 ${
                          isPresent
                            ? 'bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600'
                            : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700'
                        }`}
                      >
                        {isSaving ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : isPresent ? (
                          <><Check size={12} /> Presente</>
                        ) : (
                          <><X size={12} /> Assente</>
                        )}
                      </button>
                    </div>
                  )
                })}
                {students.length === 0 && (
                  <p className="px-5 py-6 text-sm text-gray-400 text-center">Nessun corsista iscritto al corso.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Riepilogo idoneità */}
      {sessions.length > 0 && students.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <Award size={15} className="text-indigo-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Riepilogo Idoneità</h3>
            <span className="ml-auto text-xs text-gray-400">
              {(() => {
                const idonei = students.filter(s => {
                  const present = sessions.filter(sess =>
                    sess.attendances.find(a => a.student_id === s.id)?.present
                  ).length
                  return sessions.length > 0 && Math.round((present / sessions.length) * 100) >= 75
                }).length
                return `${idonei}/${students.length} idonei`
              })()}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {[...students]
              .map(s => {
                const present = sessions.filter(sess =>
                  sess.attendances.find(a => a.student_id === s.id)?.present
                ).length
                const total = sessions.length
                const pct = Math.round((present / total) * 100)
                return { ...s, present, total, pct }
              })
              .sort((a, b) => b.pct - a.pct)
              .map(s => {
                const idoneo = s.pct >= 75
                return (
                  <div key={s.id} className="px-5 py-3 flex items-center gap-4">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: '#1565C0' }}>
                      {s.full_name.charAt(0)}
                    </div>
                    <Link href={`/docente/corsisti/${s.id}`} className="flex-1 text-sm font-medium text-gray-900 hover:text-blue-700 transition truncate">{s.full_name}</Link>
                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                      <div
                        className={`h-full rounded-full ${s.pct >= 75 ? 'bg-green-500' : s.pct >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                        style={{ width: `${s.pct}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold w-9 text-right flex-shrink-0 ${s.pct >= 75 ? 'text-green-700' : s.pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                      {s.pct}%
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${idoneo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {idoneo ? 'Idoneo' : 'Non idoneo'}
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
