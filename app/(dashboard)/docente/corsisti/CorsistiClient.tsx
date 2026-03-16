'use client'

import { useState } from 'react'
import Link from 'next/link'
import { GraduationCap, TrendingUp, Search, ChevronRight, ClipboardCheck, ClipboardList } from 'lucide-react'

interface StudentWithAttendance {
  id: string
  full_name: string
  email: string
  pct: number | null
  att: { present: number; total: number } | null
  quizSuperati: number
  quizTotali: number
  taskConsegnati: number
  taskTotali: number
}

interface CourseGroup {
  courseId: string
  courseName: string
  totalSessions: number
  students: StudentWithAttendance[]
}

interface Props {
  courseGroups: CourseGroup[]
  totalStudents: number
}

export default function CorsistiClient({ courseGroups, totalStudents }: Props) {
  const [search, setSearch] = useState('')

  const query = search.toLowerCase().trim()

  const filteredGroups = courseGroups
    .map(group => ({
      ...group,
      students: query
        ? group.students.filter(
            s =>
              s.full_name.toLowerCase().includes(query) ||
              s.email.toLowerCase().includes(query)
          )
        : group.students,
    }))
    .filter(group => group.students.length > 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">I Miei Corsisti</h2>
          <p className="text-gray-500 text-sm mt-1">{totalStudents} corsisti totali nei tuoi corsi</p>
        </div>
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per nome o email..."
            className="pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-60"
          />
        </div>
      </div>

      {filteredGroups.map(({ courseId, courseName, totalSessions, students }) => (
        <div key={courseId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <GraduationCap size={18} className="text-blue-600" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{courseName}</h3>
              {totalSessions > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">{totalSessions} sessioni registrate</p>
              )}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-sm text-gray-400">{students.length} corsisti</span>
              <Link
                href={`/docente/corsi/${courseId}/presenze`}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Registro →
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {students.map(s => (
              <Link
                key={s.id}
                href={`/docente/corsisti/${s.id}`}
                className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition group"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: '#003DA5' }}
                >
                  {s.full_name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition truncate">{s.full_name}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-400 truncate">{s.email}</span>
                    {s.quizTotali > 0 && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <ClipboardCheck size={10} className="text-indigo-400" />
                        <span className="font-medium text-indigo-600">{s.quizSuperati}</span>/{s.quizTotali} quiz
                      </span>
                    )}
                    {s.taskTotali > 0 && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <ClipboardList size={10} className="text-amber-400" />
                        <span className="font-medium text-amber-600">{s.taskConsegnati}</span>/{s.taskTotali} task
                      </span>
                    )}
                  </div>
                </div>
                {s.pct !== null && s.att ? (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.pct >= 75 ? 'bg-green-500' : s.pct >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                        style={{ width: `${s.pct}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold w-9 text-right ${s.pct >= 75 ? 'text-green-700' : s.pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                      {s.pct}%
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${s.pct >= 75 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {s.pct >= 75 ? 'Idoneo' : 'A rischio'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-gray-300 flex-shrink-0">
                    <TrendingUp size={11} /> —
                  </div>
                )}
                <ChevronRight size={13} className="text-gray-300 group-hover:text-blue-400 transition flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      ))}

      {filteredGroups.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400">
            {query ? 'Nessun corsista trovato per questa ricerca.' : 'Nessun corsista nei tuoi corsi.'}
          </p>
        </div>
      )}
    </div>
  )
}
