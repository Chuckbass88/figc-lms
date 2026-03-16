'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle, ChevronDown, Loader2 } from 'lucide-react'

interface Group { id: string; name: string }

interface Props {
  courseId: string
  groups: Group[]
}

export default function NuovoTaskForm({ courseId, groups }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [groupId, setGroupId] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function reset() {
    setOpen(false)
    setTitle('')
    setDescription('')
    setDueDate('')
    setGroupId('')
  }

  async function crea() {
    if (!title.trim()) return
    setLoading(true)
    await fetch('/api/task/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, groupId: groupId || null, title: title.trim(), description: description.trim() || null, dueDate: dueDate || null }),
    })
    setLoading(false)
    reset()
    router.refresh()
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition text-left"
      >
        <PlusCircle size={16} className="text-blue-600 flex-shrink-0" />
        <span className="font-semibold text-gray-900 text-sm">Nuovo task</span>
        <ChevronDown size={14} className={`ml-auto text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-gray-100 space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Titolo <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Es. Analisi tattica Lezione 3"
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Descrizione / istruzioni
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descrivi cosa deve svolgere il corsista..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Scadenza
              </label>
              <input
                type="date"
                value={dueDate}
                min={today}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Destinatari
              </label>
              <select
                value={groupId}
                onChange={e => setGroupId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Tutto il corso</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={reset}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              Annulla
            </button>
            <button
              onClick={crea}
              disabled={!title.trim() || loading}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition"
              style={{ backgroundColor: '#003DA5' }}
            >
              {loading && <Loader2 size={13} className="animate-spin" />}
              Crea task
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
