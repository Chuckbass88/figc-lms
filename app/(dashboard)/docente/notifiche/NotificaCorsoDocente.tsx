'use client'

import { useState } from 'react'
import { Send, Loader2, CheckCircle, BookOpen } from 'lucide-react'

interface Course { id: string; name: string; status: string }

export default function NotificaCorsoDocente({ courses }: { courses: Course[] }) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number } | null>(null)
  const [error, setError] = useState('')

  async function send() {
    if (!courseId || !title.trim() || !message.trim()) return
    setSending(true)
    setError('')
    setResult(null)
    const res = await fetch('/api/notifiche/invia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: 'course', courseId, title: title.trim(), message: message.trim() }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Errore durante l\'invio')
    } else {
      setResult({ sent: data.sent })
      setTitle('')
      setMessage('')
    }
    setSending(false)
  }

  if (courses.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <BookOpen size={32} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Nessun corso assegnato. Non puoi inviare notifiche.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
      {/* Selezione corso */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Corso destinatario</label>
        <select
          value={courseId}
          onChange={e => setCourseId(e.target.value)}
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1.5">La notifica sarà inviata a tutti i corsisti iscritti al corso selezionato.</p>
      </div>

      {/* Titolo */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Titolo *</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="es. Aggiornamento materiali lezione 3"
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Messaggio */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Messaggio *</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Scrivi il messaggio per i corsisti..."
          rows={5}
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <CheckCircle size={16} />
          <span>Notifica inviata a <strong>{result.sent}</strong> {result.sent === 1 ? 'corsista' : 'corsisti'}.</span>
        </div>
      )}

      <button
        onClick={send}
        disabled={sending || !title.trim() || !message.trim() || !courseId}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 hover:opacity-90 transition"
        style={{ backgroundColor: '#003DA5' }}
      >
        {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        {sending ? 'Invio in corso...' : 'Invia notifica'}
      </button>
    </div>
  )
}
