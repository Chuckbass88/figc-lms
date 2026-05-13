'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Send, Loader2, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface FeedbackMsg {
  id: string; content: string; created_at: string; sender_role: string
  sender: { full_name: string } | null
}

export default function FeedbackThread({
  submissionId,
  isValutato,
}: {
  submissionId: string
  isValutato: boolean
}) {
  const router = useRouter()
  const [thread, setThread] = useState<FeedbackMsg[]>([])
  const [loading, setLoading] = useState(true)
  const [msgInput, setMsgInput] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetch(`/api/task/feedback?submissionId=${submissionId}`)
      .then(r => r.json())
      .then(data => setThread(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [submissionId])

  async function sendMessage() {
    if (!msgInput.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/task/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, content: msgInput }),
      })
      if (res.ok) {
        const data = await res.json()
        setThread(prev => [...prev, data])
        setMsgInput('')
        router.refresh()
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare size={14} className="text-blue-600" />
        <p className="text-sm font-semibold text-gray-900">Messaggi con il docente</p>
        {loading && <Loader2 size={12} className="animate-spin text-gray-400 ml-auto" />}
      </div>

      {!loading && thread.length === 0 && (
        <div className="py-4 text-center">
          <Clock size={20} className="text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Nessun messaggio ancora.</p>
          <p className="text-xs text-gray-400 mt-0.5">Il docente potrà rispondere qui dopo aver revisionato il tuo lavoro.</p>
        </div>
      )}

      {thread.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {thread.map(msg => {
            const isDocente = ['docente', 'super_admin', 'admin'].includes(msg.sender_role)
            return (
              <div
                key={msg.id}
                className={`text-xs rounded-xl px-3 py-2 max-w-[90%] ${
                  isDocente ? 'bg-blue-50 text-blue-900' : 'bg-gray-100 text-gray-800 ml-auto'
                }`}
              >
                <p className="font-semibold mb-0.5">
                  {msg.sender?.full_name ?? (isDocente ? 'Docente' : 'Tu')}
                  <span className="ml-2 font-normal text-gray-400">
                    {new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </p>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            )
          })}
        </div>
      )}

      {!isValutato && (
        <div className="flex gap-2 pt-1 border-t border-gray-50">
          <textarea
            value={msgInput}
            onChange={e => setMsgInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Scrivi un messaggio al docente..."
            rows={2}
            className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            disabled={!msgInput.trim() || sending}
            className="self-end flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-white font-semibold disabled:opacity-50 transition"
            style={{ backgroundColor: '#1EB8E5' }}
          >
            {sending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
            Invia
          </button>
        </div>
      )}
    </div>
  )
}
