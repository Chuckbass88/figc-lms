'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Calendar, UserCheck, Search, ClipboardCheck, ClipboardList } from 'lucide-react'

interface CourseEnrollment {
  id: string
  status: string
  course: {
    id: string
    name: string
    description: string | null
    location: string | null
    start_date: string | null
    end_date: string | null
    status: string
    category: string | null
    instructors: string[]
  }
  att: { total: number; present: number } | null
  quizStats: { total: number; completed: number; passed: number } | null
  taskStats: { total: number; submitted: number } | null
}

export default function CorsiStudenteClient({ enrollments }: { enrollments: CourseEnrollment[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all')

  const filtered = enrollments.filter(e => {
    const matchSearch =
      e.course.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.course.location ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (e.course.category ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || e.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">I Miei Corsi</h2>
          <p className="text-gray-500 text-sm mt-1">{enrollments.length} {enrollments.length === 1 ? 'iscrizione' : 'iscrizioni'}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca corso..."
              className="pl-8 pr-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-44"
            />
          </div>
          <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
            {([['all', 'Tutti'], ['active', 'In Corso'], ['completed', 'Completati']] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setStatusFilter(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${statusFilter === val ? 'text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                style={statusFilter === val ? { backgroundColor: '#003DA5' } : {}}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map(enrollment => {
          const course = enrollment.course
          const att = enrollment.att
          const pct = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : null

          return (
            <div key={enrollment.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-start justify-between mb-3">
                <Link
                  href={`/studente/corsi/${course.id}`}
                  className="font-bold text-gray-900 text-lg hover:text-blue-700 transition leading-tight"
                >
                  {course.name}
                </Link>
                <div className="flex items-center gap-1.5 ml-2 flex-shrink-0 flex-wrap justify-end">
                  {course.category && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700">
                      {course.category}
                    </span>
                  )}
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    enrollment.status === 'active' ? 'bg-green-100 text-green-700' :
                    enrollment.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {enrollment.status === 'active' ? 'In Corso' : enrollment.status === 'completed' ? 'Completato' : 'Ritirato'}
                  </span>
                </div>
              </div>

              {course.description && (
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{course.description}</p>
              )}

              <div className="space-y-1.5 text-sm text-gray-600">
                {course.location && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-gray-400" />
                    <span>{course.location}</span>
                  </div>
                )}
                {course.start_date && (
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <span>
                      {new Date(course.start_date).toLocaleDateString('it-IT')}
                      {course.end_date && ` → ${new Date(course.end_date).toLocaleDateString('it-IT')}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Barra presenze */}
              {att && att.total > 0 && pct !== null && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Presenze</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pct >= 75 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {pct >= 75 ? 'Idoneo' : 'A rischio'}
                      </span>
                    </div>
                    <span className={`text-xs font-bold ${pct >= 75 ? 'text-green-700' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                      {pct}% ({att.present}/{att.total})
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Quiz/task mini-stats */}
              {(enrollment.quizStats || enrollment.taskStats) && (
                <div className="mt-3 flex items-center gap-4 flex-wrap border-t border-gray-100 pt-3">
                  {enrollment.quizStats && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <ClipboardCheck size={11} className="text-indigo-400" />
                      Quiz: <span className="font-semibold text-indigo-600">{enrollment.quizStats.completed}</span>/{enrollment.quizStats.total}
                      {enrollment.quizStats.passed > 0 && (
                        <span className="text-green-600 font-medium ml-0.5">· {enrollment.quizStats.passed} superati</span>
                      )}
                    </span>
                  )}
                  {enrollment.taskStats && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <ClipboardList size={11} className="text-amber-400" />
                      Task: <span className="font-semibold text-amber-600">{enrollment.taskStats.submitted}</span>/{enrollment.taskStats.total}
                    </span>
                  )}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between">
                <Link href={`/studente/corsi/${course.id}`} className="text-xs text-blue-600 hover:underline">
                  Vai al dettaglio →
                </Link>
                <Link href={`/studente/corsi/${course.id}/attestato`} className="text-xs text-gray-400 hover:text-gray-600 transition">
                  Attestato →
                </Link>
              </div>

              {course.instructors.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <UserCheck size={14} className="text-gray-400" />
                    <span className="text-xs text-gray-500">{course.instructors.join(', ')}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400">
              {enrollments.length === 0
                ? 'Non sei iscritto a nessun corso.'
                : 'Nessun corso corrisponde alla ricerca.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
