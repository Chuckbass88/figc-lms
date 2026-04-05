'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2, Check, X, AlertTriangle } from 'lucide-react'

interface Props {
  taskId: string
  courseId: string
  hasExisting: boolean
}

export default function SubmitTaskForm({ taskId, courseId, hasExisting }: Props) {
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function submit() {
    setShowConfirm(false)
    setLoading(true)
    setError(null)

    const fd = new FormData()
    fd.append('task_id', taskId)
    fd.append('notes', notes)
    if (file) fd.append('file', file)

    const res = await fetch('/api/task/submit', { method: 'POST', body: fd })
    const json = await res.json()

    setLoading(false)

    if (!res.ok) {
      setError(json.error ?? 'Errore durante l\'invio. Riprova.')
      return
    }

    setSaved(true)
    router.refresh()
    setTimeout(() => router.push(`/studente/corsi/${courseId}/task`), 1500)
  }

  if (saved) {
    return (
      <div className="flex items-center gap-2 text-sm font-semibold text-green-700 bg-green-50 rounded-xl px-4 py-3">
        <Check size={15} /> Consegna inviata con successo!
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
            Note / commento
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Descrivi il lavoro svolto, aggiungi note per il docente..."
            rows={4}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
            Allegato (opzionale)
          </label>
          {file ? (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Upload size={14} className="text-blue-600 flex-shrink-0" />
              <span className="text-sm text-blue-800 font-medium truncate flex-1">{file.name}</span>
              <button
                onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }}
                className="text-gray-400 hover:text-red-500 transition flex-shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 transition"
            >
              <Upload size={14} /> Seleziona file
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <button
          onClick={() => setShowConfirm(true)}
          disabled={loading || (!notes.trim() && !file)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition"
          style={{ backgroundColor: '#1565C0' }}
        >
          {loading ? (
            <><Loader2 size={14} className="animate-spin" /> Caricamento...</>
          ) : (
            <><Check size={14} /> {hasExisting ? 'Aggiorna consegna' : 'Invia consegna'}</>
          )}
        </button>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}
      </div>

      {/* Modal di conferma */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle size={16} className="text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {hasExisting ? 'Aggiornare la consegna?' : 'Inviare la consegna?'}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  {hasExisting
                    ? 'Stai per aggiornare la consegna già inviata. Sei sicuro di voler procedere?'
                    : 'Una volta inviata, la consegna sarà visibile al docente. Sei sicuro di voler procedere?'
                  }
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Annulla
              </button>
              <button
                onClick={submit}
                className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition"
                style={{ backgroundColor: '#1565C0' }}
              >
                {hasExisting ? 'Sì, aggiorna' : 'Sì, invia'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
