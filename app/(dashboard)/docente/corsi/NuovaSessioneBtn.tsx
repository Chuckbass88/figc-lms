'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  courseId: string
  courseName: string
}

export default function NuovaSessioneBtn({ courseId, courseName }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  function reset() {
    setOpen(false)
    setTitle('')
    setDate('')
  }

  async function crea() {
    if (!title.trim() || !date) return
    setLoading(true)
    await supabase.from('course_sessions').insert({
      course_id: courseId,
      title: title.trim(),
      session_date: date,
    })
    setLoading(false)
    reset()
    router.refresh()
  }

  // Data minima = oggi
  const today = new Date().toISOString().split('T')[0]

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition flex-shrink-0"
      >
        <PlusCircle size={12} /> Sessione
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-900 text-sm">Nuova sessione</h3>
              <button onClick={reset} className="text-gray-400 hover:text-gray-600 transition">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-5 truncate">{courseName}</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Titolo sessione
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && crea()}
                  placeholder="Es. Lezione 3 — Pressing alto"
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Data
                </label>
                <input
                  type="date"
                  value={date}
                  min={today}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={reset}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                Annulla
              </button>
              <button
                onClick={crea}
                disabled={!title.trim() || !date || loading}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition"
                style={{ backgroundColor: '#003DA5' }}
              >
                {loading && <Loader2 size={13} className="animate-spin" />}
                Crea sessione
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
