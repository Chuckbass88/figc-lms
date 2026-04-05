'use client'

import { useState } from 'react'
import { Loader2, UserMinus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function RimuoviIscrizioneBtn({
  studentId,
  courseId,
  courseName,
}: {
  studentId: string
  courseId: string
  courseName: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function rimuovi() {
    setLoading(true)
    setError(null)
    const { error: dbError } = await supabase
      .from('course_enrollments')
      .update({ status: 'dropped' })
      .eq('student_id', studentId)
      .eq('course_id', courseId)
    setLoading(false)
    if (dbError) {
      setError('Errore durante la rimozione. Riprova.')
      return
    }
    setOpen(false)
    window.location.reload()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Rimuovi iscrizione"
        className="p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition flex-shrink-0"
      >
        <UserMinus size={13} />
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">Rimuovi iscrizione</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Vuoi rimuovere l&apos;iscrizione al corso <span className="font-semibold text-gray-900">{courseName}</span>?
              Lo stato verrà impostato su &quot;Ritirato&quot;.
            </p>
            {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                Annulla
              </button>
              <button
                onClick={rimuovi}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-red-700 transition"
              >
                {loading && <Loader2 size={13} className="animate-spin" />}
                Rimuovi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
