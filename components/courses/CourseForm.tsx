'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Course } from '@/lib/types'

const CATEGORY_OPTIONS = [
  { value: '', label: 'Nessuna categoria' },
  { value: 'UEFA Pro', label: 'UEFA Pro' },
  { value: 'UEFA A', label: 'UEFA A' },
  { value: 'Licenza D', label: 'Licenza D' },
  { value: 'UEFA C', label: 'UEFA C' },
  { value: 'UEFA GK A', label: 'UEFA GK A' },
  { value: 'UEFA GK B', label: 'UEFA GK B' },
  { value: 'UEFA GK C', label: 'UEFA GK C' },
  { value: 'UEFA Fitness A', label: 'UEFA Fitness A' },
  { value: 'UEFA Fitness B', label: 'UEFA Fitness B' },
  { value: 'Allenatore Giovani', label: 'Allenatore Giovani' },
  { value: 'Allenatore Base', label: 'Allenatore Base' },
]

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Bozza' },
  { value: 'active', label: 'Attivo' },
  { value: 'completed', label: 'Completato' },
]

export default function CourseForm({ course }: { course?: Course }) {
  const router = useRouter()
  const isEdit = !!course

  const [form, setForm] = useState({
    name: course?.name ?? '',
    description: course?.description ?? '',
    location: course?.location ?? '',
    start_date: course?.start_date ?? '',
    end_date: course?.end_date ?? '',
    status: course?.status ?? 'active',
    category: course?.category ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Il nome del corso è obbligatorio.')
      return
    }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: form.status as 'active' | 'completed' | 'draft',
      category: form.category || null,
    }

    const { error: dbError } = isEdit
      ? await supabase.from('courses').update(payload).eq('id', course.id)
      : await supabase.from('courses').insert(payload)

    if (dbError) {
      setError('Errore durante il salvataggio: ' + dbError.message)
      setLoading(false)
      return
    }

    router.push('/super-admin/corsi')
    router.refresh()
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/super-admin/corsi')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-4"
        >
          <ArrowLeft size={15} />
          Torna ai corsi
        </button>
        <h2 className="text-2xl font-bold text-gray-900">
          {isEdit ? `Modifica: ${course.name}` : 'Nuovo corso'}
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          {isEdit ? 'Modifica le informazioni del corso.' : 'Compila i dati per creare un nuovo corso.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">

        {/* Sezione: Informazioni base */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Informazioni base</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nome corso <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Es. Corso UEFA B — Roma 2024"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrizione</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={4}
              placeholder="Descrizione del percorso formativo..."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Sede</label>
            <input
              type="text"
              value={form.location}
              onChange={e => set('location', e.target.value)}
              placeholder="Es. Roma — Centro Tecnico Federale"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria / Livello</label>
            <select
              value={form.category}
              onChange={e => set('category', e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {CATEGORY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sezione: Date e stato */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Date e stato</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Data inizio</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Data fine</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => set('end_date', e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Stato</label>
            <div className="flex gap-3">
              {STATUS_OPTIONS.map(o => (
                <label
                  key={o.value}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium cursor-pointer transition ${
                    form.status === o.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={o.value}
                    checked={form.status === o.value}
                    onChange={() => set('status', o.value)}
                    className="sr-only"
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer form */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex items-center justify-between gap-3">
          {error && (
            <p className="text-sm text-red-600 flex-1">{error}</p>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              type="button"
              onClick={() => router.push('/super-admin/corsi')}
              className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition disabled:opacity-60"
              style={{ backgroundColor: '#1565C0' }}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Salva modifiche' : 'Crea corso'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
