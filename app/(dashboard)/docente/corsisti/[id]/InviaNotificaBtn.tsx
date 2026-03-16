'use client'

import { useState } from 'react'
import { Bell, Loader2, X, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  studentId: string
  studentName: string
}

export default function InviaNotificaBtn({ studentId, studentName }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  async function send() {
    if (!title.trim() || !message.trim()) return
    setSending(true)
    await supabase.from('notifications').insert({
      user_id: studentId,
      title: title.trim(),
      message: message.trim(),
      read: false,
    })
    setSending(false)
    setSent(true)
    setTimeout(() => {
      setSent(false)
      setOpen(false)
      setTitle('')
      setMessage('')
    }, 1500)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition"
      >
        <Bell size={13} /> Notifica
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Notifica a {studentName}</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Titolo notifica"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Messaggio..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                Annulla
              </button>
              <button
                onClick={send}
                disabled={sending || sent || !title.trim() || !message.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60 hover:opacity-90 transition"
                style={{ backgroundColor: sent ? '#16a34a' : '#003DA5' }}
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : sent ? '✓ Inviata' : <><Send size={13} /> Invia</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
