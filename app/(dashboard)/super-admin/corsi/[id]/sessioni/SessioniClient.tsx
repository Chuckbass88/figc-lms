'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X, Calendar, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Session {
  id: string
  title: string
  session_date: string
  att: { present: number; total: number } | null
}

interface Props {
  courseId: string
  initialSessions: Session[]
}

export default function SessioniClient({ courseId, initialSessions }: Props) {
  const [sessions, setSessions] = useState(initialSessions)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDate, setEditDate] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleAdd() {
    if (!newTitle.trim() || !newDate) return
    setLoading(true)
    const { data, error } = await supabase
      .from('course_sessions')
      .insert({ course_id: courseId, title: newTitle.trim(), session_date: newDate })
      .select('id, title, session_date')
      .single()
    if (!error && data) {
      setSessions(prev =>
        [...prev, { ...data, att: null }].sort((a, b) => a.session_date.localeCompare(b.session_date))
      )
      setNewTitle('')
      setNewDate('')
      setAdding(false)
    }
    setLoading(false)
  }

  async function handleEdit(id: string) {
    if (!editTitle.trim() || !editDate) return
    setLoading(true)
    await supabase
      .from('course_sessions')
      .update({ title: editTitle.trim(), session_date: editDate })
      .eq('id', id)
    setSessions(prev =>
      prev
        .map(s => s.id === id ? { ...s, title: editTitle.trim(), session_date: editDate } : s)
        .sort((a, b) => a.session_date.localeCompare(b.session_date))
    )
    setEditingId(null)
    setLoading(false)
  }

  async function handleDelete(id: string) {
    setLoading(true)
    await supabase.from('course_sessions').delete().eq('id', id)
    setSessions(prev => prev.filter(s => s.id !== id))
    setDeletingId(null)
    setLoading(false)
  }

  function startEdit(s: Session) {
    setEditingId(s.id)
    setEditTitle(s.title)
    setEditDate(s.session_date)
    setDeletingId(null)
    setAdding(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {sessions.length} {sessions.length === 1 ? 'sessione' : 'sessioni'}
        </p>
        {!adding && (
          <button
            onClick={() => { setAdding(true); setEditingId(null); setDeletingId(null) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 transition"
            style={{ backgroundColor: '#003DA5' }}
          >
            <Plus size={15} /> Nuova sessione
          </button>
        )}
      </div>

      {/* Form aggiungi */}
      {adding && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-blue-800">Nuova sessione</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Titolo della sessione"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={loading || !newTitle.trim() || !newDate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition disabled:opacity-50"
            >
              <Check size={14} /> Salva
            </button>
            <button
              onClick={() => { setAdding(false); setNewTitle(''); setNewDate('') }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition"
            >
              <X size={14} /> Annulla
            </button>
          </div>
        </div>
      )}

      {/* Lista sessioni */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {sessions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Calendar size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Nessuna sessione ancora. Aggiungine una!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {sessions.map((s, idx) => (
              <div key={s.id} className="px-5 py-3.5">
                {editingId === s.id ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        autoFocus
                        className="px-3 py-1.5 text-sm rounded-lg border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="date"
                        value={editDate}
                        onChange={e => setEditDate(e.target.value)}
                        className="px-3 py-1.5 text-sm rounded-lg border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(s.id)}
                        disabled={loading || !editTitle.trim() || !editDate}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-white bg-green-600 hover:bg-green-700 transition disabled:opacity-50"
                      >
                        <Check size={12} /> Salva
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition"
                      >
                        <X size={12} /> Annulla
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-10 text-center">
                      <p className="text-base font-bold text-gray-900 leading-tight">
                        {new Date(s.session_date).toLocaleDateString('it-IT', { day: '2-digit' })}
                      </p>
                      <p className="text-xs text-gray-400 uppercase">
                        {new Date(s.session_date).toLocaleDateString('it-IT', { month: 'short' })}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{s.title}</p>
                      <p className="text-xs text-gray-400">Sessione {idx + 1}</p>
                    </div>
                    {s.att && s.att.total > 0 && (() => {
                      const pct = Math.round((s.att.present / s.att.total) * 100)
                      return (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Users size={11} className="text-gray-300" />
                          <span className={`text-xs font-bold ${pct >= 75 ? 'text-green-700' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                            {pct}%
                          </span>
                          <span className="text-xs text-gray-400">{s.att.present}/{s.att.total}</span>
                        </div>
                      )
                    })()}

                    {deletingId === s.id ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-red-600 font-medium">Eliminare?</span>
                        <button
                          onClick={() => handleDelete(s.id)}
                          disabled={loading}
                          className="px-2 py-1 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50"
                        >
                          Sì
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="px-2 py-1 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => startEdit(s)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition"
                          title="Modifica"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => { setDeletingId(s.id); setEditingId(null) }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition"
                          title="Elimina"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
