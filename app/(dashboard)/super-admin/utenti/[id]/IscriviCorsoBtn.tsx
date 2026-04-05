'use client'

import { useState } from 'react'
import { PlusCircle, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Course {
  id: string
  name: string
}

export default function IscriviCorsoBtn({ studentId, availableCourses }: { studentId: string; availableCourses: Course[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function iscrivi() {
    if (!selectedId) return
    setLoading(true)
    setError(null)
    const { error: dbError } = await supabase.from('course_enrollments').insert({
      course_id: selectedId,
      student_id: studentId,
      status: 'active',
      enrolled_at: new Date().toISOString(),
    })
    setLoading(false)
    if (dbError) {
      setError('Errore durante l\'iscrizione. Riprova.')
      return
    }
    setOpen(false)
    setSelectedId('')
    window.location.reload()
  }

  if (availableCourses.length === 0) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition hover:opacity-90"
        style={{ backgroundColor: '#1565C0' }}
      >
        <PlusCircle size={14} /> Iscrivi a corso
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Iscrivi corsista a corso</h3>
              <button onClick={() => { setOpen(false); setSelectedId('') }} className="text-gray-400 hover:text-gray-600 transition">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Seleziona un corso attivo a cui iscrivere il corsista.</p>
            {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-5 bg-white"
            >
              <option value="">Seleziona un corso...</option>
              {availableCourses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => { setOpen(false); setSelectedId('') }}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                Annulla
              </button>
              <button
                onClick={iscrivi}
                disabled={!selectedId || loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition"
                style={{ backgroundColor: '#1565C0' }}
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Iscrivi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
