'use client'

import { useState } from 'react'
import { Bell, X, Loader2, Send } from 'lucide-react'

export default function NotificaCorso({ courseId, courseName }: { courseId: string; courseName: string }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function send() {
    if (!title.trim() || !message.trim()) return
    setSending(true)
    setError('')
    const res = await fetch('/api/notifiche/invia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: 'course', courseId, title: title.trim(), message: message.trim() }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Errore durante l\'invio')
    } else {
      setSent(true)
      setTitle('')
      setMessage('')
      setTimeout(() => { setSent(false); setOpen(false) }, 1500)
    }
    setSending(false)
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setSent(false); setError('') }}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition"
      >
        <Bell size={14} /> Notifica
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <p className="font-semibold text-gray-900 text-sm">Invia notifica</p>
                <p className="text-xs text-gray-400 mt-0.5">Ai corsisti iscritti a <span className="font-medium">{courseName}</span></p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Titolo *"
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Messaggio *"
                rows={4}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              {sent && <p className="text-sm text-green-600 font-medium">Notifica inviata!</p>}
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                Annulla
              </button>
              <button
                onClick={send}
                disabled={sending || !title.trim() || !message.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 hover:opacity-90 transition"
                style={{ backgroundColor: '#1565C0' }}
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {sending ? 'Invio...' : 'Invia'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
