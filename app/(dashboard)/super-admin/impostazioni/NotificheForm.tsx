'use client'

import { useState } from 'react'
import { Send, Loader2, Check } from 'lucide-react'

interface User { id: string; full_name: string; role: string }

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin', docente: 'Docente', studente: 'Corsista',
}

export default function NotificheForm({ users }: { users: User[] }) {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [target, setTarget] = useState('all')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  async function send() {
    if (!title.trim() || !message.trim()) return
    setSending(true)
    setResult(null)
    const res = await fetch('/api/notifiche/invia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, message, target }),
    })
    const data = await res.json()
    if (res.ok) {
      setResult({ ok: true, text: `Notifica inviata a ${data.sent} ${data.sent === 1 ? 'utente' : 'utenti'}.` })
      setTitle('')
      setMessage('')
      setTarget('all')
    } else {
      setResult({ ok: false, text: data.error ?? 'Errore durante l\'invio' })
    }
    setSending(false)
  }

  return (
    <div className="space-y-4">
      {/* Destinatario */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Destinatari</label>
        <select
          value={target}
          onChange={e => setTarget(e.target.value)}
          className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">Tutti gli utenti</option>
          <option value="docenti">Solo Docenti</option>
          <option value="studenti">Solo Corsisti</option>
          <optgroup label="Utente specifico">
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.full_name} ({ROLE_LABELS[u.role] ?? u.role})
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Titolo */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Titolo</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Es. Aggiornamento calendario"
          maxLength={100}
          className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Messaggio */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Messaggio</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Scrivi il messaggio da inviare..."
          rows={4}
          maxLength={500}
          className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/500</p>
      </div>

      {result && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${result.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {result.ok && <Check size={14} />}
          {result.text}
        </div>
      )}

      <button
        onClick={send}
        disabled={sending || !title.trim() || !message.trim()}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white text-sm font-semibold transition disabled:opacity-60 hover:opacity-90"
        style={{ backgroundColor: '#1565C0' }}
      >
        {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        {sending ? 'Invio in corso...' : 'Invia notifica'}
      </button>
    </div>
  )
}
