'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2, Check, X } from 'lucide-react'

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
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function submit() {
    if (!notes.trim() && !file) return
    setLoading(true)

    const fd = new FormData()
    fd.append('task_id', taskId)
    fd.append('notes', notes)
    if (file) fd.append('file', file)

    await fetch('/api/task/submit', { method: 'POST', body: fd })

    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
  }

  if (saved) {
    return (
      <div className="flex items-center gap-2 text-sm font-semibold text-green-700 bg-green-50 rounded-xl px-4 py-3">
        <Check size={15} /> Consegna inviata con successo!
      </div>
    )
  }

  return (
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
        onClick={submit}
        disabled={loading || (!notes.trim() && !file)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition"
        style={{ backgroundColor: '#003DA5' }}
      >
        {loading ? (
          <><Loader2 size={14} className="animate-spin" /> Caricamento...</>
        ) : (
          <><Check size={14} /> {hasExisting ? 'Aggiorna consegna' : 'Invia consegna'}</>
        )}
      </button>
    </div>
  )
}
