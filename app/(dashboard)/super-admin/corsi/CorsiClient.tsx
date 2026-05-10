'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Calendar, Users, Pencil, Trash2, Plus, Eye, Search, ChevronRight, BookOpen, BookTemplate } from 'lucide-react'
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
  completed: 'bg-gray-100 text-gray-500',
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

  const availableCategories = Array.from(new Set(initialCourses.map(c => c.category).filter(Boolean))) as string[]

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
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

  function fmt(d: string | null | undefined) {
    if (!d) return null
    return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: '2-digit' })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestione Corsi</h2>
          <p className="text-gray-500 text-sm mt-0.5">{courses.length} corsi nel sistema</p>
        </div>
        <button
          onClick={() => router.push('/super-admin/corsi/nuovo')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold shadow-sm transition hover:opacity-90"
          style={{ backgroundColor: '#1EB8E5' }}
        >
          <Plus size={15} /> Nuovo corso
        </button>
      </div>

      {/* Sub-nav: Tutti i corsi / Template */}
      <div className="flex gap-1.5">
        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: '#1B3768' }}>
          <BookOpen size={14} /> Tutti i corsi
        </span>
        <Link href="/super-admin/corsi/template"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition">
          <BookTemplate size={14} /> Template corsi
        </Link>
      </div>

      {/* Filtri */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per nome o sede..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 bg-white"
            style={{ '--tw-ring-color': '#1EB8E5' } as React.CSSProperties}
          />
        </div>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
          {STATUS_FILTERS.map(f => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${statusFilter === f.value ? 'text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              style={statusFilter === f.value ? { backgroundColor: '#1B3768' } : {}}>
              {f.label}
            </button>
          ))}
        </div>
        {availableCategories.length > 0 && (
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none text-gray-700">
            <option value="all">Tutte le categorie</option>
            {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        )}
      </div>

      {/* Lista corsi */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 mb-4">
              {courses.length === 0 ? 'Nessun corso presente.' : 'Nessun corso corrisponde ai filtri.'}
            </p>
            {courses.length === 0 && (
              <button onClick={() => router.push('/super-admin/corsi/nuovo')}
                className="px-4 py-2 rounded-xl text-white text-sm font-medium"
                style={{ backgroundColor: '#1EB8E5' }}>
                Crea il primo corso
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(course => {
              const activeStudents = course.course_enrollments?.filter(e => e.status === 'active').length ?? 0
              const instructors = course.course_instructors?.map(ci => ci.profiles?.full_name).filter(Boolean) ?? []
              const startFmt = fmt(course.start_date)
              const endFmt = fmt(course.end_date)

              return (
                <div key={course.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition cursor-pointer group"
                  onClick={() => router.push(`/super-admin/corsi/${course.id}`)}>

                  {/* Nome + categoria */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm truncate">{course.name}</span>
                      {course.category && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 flex-shrink-0">
                          {course.category}
                        </span>
                      )}
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[course.status]}`}>
                        {STATUS_LABELS[course.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                      {course.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={10} /> {course.location}
                        </span>
                      )}
                      {startFmt && (
                        <span className="flex items-center gap-1">
                          <Calendar size={10} /> {startFmt}{endFmt ? ` → ${endFmt}` : ''}
                        </span>
                      )}
                      {instructors.length > 0 && (
                        <span className="truncate hidden sm:block">{instructors.slice(0, 2).join(', ')}{instructors.length > 2 ? ` +${instructors.length - 2}` : ''}</span>
                      )}
                    </div>
                  </div>

                  {/* Corsisti */}
                  <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0 hidden sm:flex">
                    <Users size={12} className="text-gray-400" />
                    <span className="font-medium">{activeStudents}</span>
                  </div>

                  {/* Azioni */}
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={e => { e.stopPropagation(); router.push(`/super-admin/corsi/${course.id}/modifica`) }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-700">
                      <Pencil size={13} />
                    </button>
                    <button onClick={e => handleDelete(course.id, e)}
                      disabled={deletingId === course.id}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition text-gray-400 hover:text-red-500 disabled:opacity-50">
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <ChevronRight size={14} className="text-gray-300 flex-shrink-0 group-hover:text-gray-500 transition" />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
