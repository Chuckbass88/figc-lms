'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Calendar, Users, Pencil, Trash2, Plus, Layers, Eye, Search, CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Course } from '@/lib/types'

type CourseWithDetails = Course & {
  course_instructors: { instructor_id: string; profiles: { full_name: string } | null }[]
  course_enrollments: { id: string; status: string }[]
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Attivo', completed: 'Completato', draft: 'Bozza',
}
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  draft: 'bg-amber-100 text-amber-700',
}

const STATUS_FILTERS = [
  { value: 'all', label: 'Tutti' },
  { value: 'active', label: 'Attivi' },
  { value: 'draft', label: 'Bozze' },
  { value: 'completed', label: 'Completati' },
]

export default function CorsiClient({ initialCourses, sessionCountByCourse }: { initialCourses: CourseWithDetails[]; sessionCountByCourse: Record<string, number> }) {
  const router = useRouter()
  const [courses, setCourses] = useState(initialCourses)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Categorie presenti nei corsi caricati
  const availableCategories = Array.from(new Set(initialCourses.map(c => c.category).filter(Boolean))) as string[]

  async function handleDelete(id: string) {
    if (!confirm('Sei sicuro di voler eliminare questo corso?')) return
    setDeletingId(id)
    const supabase = createClient()
    await supabase.from('courses').delete().eq('id', id)
    setCourses(prev => prev.filter(c => c.id !== id))
    setDeletingId(null)
  }

  const filtered = courses.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.location ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    const matchCategory = categoryFilter === 'all' || c.category === categoryFilter
    return matchSearch && matchStatus && matchCategory
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestione Corsi</h2>
          <p className="text-gray-500 text-sm mt-1">{courses.length} corsi nel sistema</p>
        </div>
        <button
          onClick={() => router.push('/super-admin/corsi/nuovo')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium shadow-sm transition hover:opacity-90"
          style={{ backgroundColor: '#1565C0' }}
        >
          <Plus size={16} />
          Nuovo corso
        </button>
      </div>

      {/* Ricerca + filtri */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per nome o sede..."
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <div className="flex gap-1.5 bg-white border border-gray-200 rounded-xl p-1">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                statusFilter === f.value
                  ? 'text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              style={statusFilter === f.value ? { backgroundColor: '#1565C0' } : {}}
            >
              {f.label}
            </button>
          ))}
        </div>
        {availableCategories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
          >
            <option value="all">Tutte le categorie</option>
            {availableCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map(course => {
          const instructors = course.course_instructors
            ?.map(ci => ci.profiles?.full_name)
            .filter(Boolean) ?? []
          const activeStudents = course.course_enrollments
            ?.filter(e => e.status === 'active').length ?? 0
          const sessionsCount = sessionCountByCourse[course.id] ?? 0

          return (
            <div key={course.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-lg leading-tight">{course.name}</h3>
                <div className="flex items-center gap-1.5 ml-2 flex-shrink-0 flex-wrap justify-end">
                  {course.category && (
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-indigo-100 text-indigo-700">
                      {course.category}
                    </span>
                  )}
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[course.status]}`}>
                    {STATUS_LABELS[course.status]}
                  </span>
                </div>
              </div>

              {course.description && (
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{course.description}</p>
              )}

              <div className="space-y-1.5 text-sm text-gray-600 mb-4">
                {course.location && (
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                    <span>{course.location}</span>
                  </div>
                )}
                {course.start_date && (
                  <div className="flex items-center gap-2">
                    <Calendar size={13} className="text-gray-400 flex-shrink-0" />
                    <span>
                      {new Date(course.start_date).toLocaleDateString('it-IT')}
                      {course.end_date && ` → ${new Date(course.end_date).toLocaleDateString('it-IT')}`}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users size={13} className="text-gray-400 flex-shrink-0" />
                  <span>{activeStudents} corsisti iscritti</span>
                </div>
                {sessionsCount > 0 && (
                  <div className="flex items-center gap-2">
                    <CalendarDays size={13} className="text-gray-400 flex-shrink-0" />
                    <span>{sessionsCount} {sessionsCount === 1 ? 'sessione' : 'sessioni'}</span>
                  </div>
                )}
              </div>

              {instructors.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wide">Docenti</p>
                  <div className="flex flex-wrap gap-1.5">
                    {instructors.map(name => (
                      <span key={name} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => router.push(`/super-admin/corsi/${course.id}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
                >
                  <Eye size={12} />
                  Dettaglio
                </button>
                <button
                  onClick={() => router.push(`/super-admin/corsi/${course.id}/gestione`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 transition"
                >
                  <Users size={12} />
                  Partecipanti
                </button>
                <button
                  onClick={() => router.push(`/super-admin/corsi/${course.id}/gruppi`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition"
                >
                  <Layers size={12} />
                  Gruppi
                </button>
                <button
                  onClick={() => router.push(`/super-admin/corsi/${course.id}/modifica`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
                >
                  <Pencil size={12} />
                  Modifica
                </button>
                <button
                  onClick={() => handleDelete(course.id)}
                  disabled={deletingId === course.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                >
                  <Trash2 size={12} />
                  Elimina
                </button>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400 mb-4">
              {courses.length === 0 ? 'Nessun corso presente.' : 'Nessun corso corrisponde ai filtri.'}
            </p>
            {courses.length === 0 && (
              <button
                onClick={() => router.push('/super-admin/corsi/nuovo')}
                className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: '#1565C0' }}
              >
                Crea il primo corso
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
