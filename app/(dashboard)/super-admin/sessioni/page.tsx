import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Calendar, MapPin, Users, CalendarCheck, CalendarClock } from 'lucide-react'

export default async function SuperAdminSessioniPage() {
  const supabase = await createClient()

  const { data: sessionsRaw } = await supabase
    .from('course_sessions')
    .select(`
      id, title, session_date,
      courses(id, name, location, course_enrollments(id, status))
    `)
    .order('session_date', { ascending: false })

  type SessionRow = {
    id: string
    title: string
    session_date: string
    courses: {
      id: string
      name: string
      location: string | null
      course_enrollments: { id: string; status: string }[]
    } | null
  }

  const sessions = (sessionsRaw ?? []) as unknown as SessionRow[]
  const today = new Date().toISOString().split('T')[0]

  // Presenze effettive per le sessioni passate
  const pastSessionIds = sessions.filter(s => s.session_date < today).map(s => s.id)
  const { data: allAttendances } = pastSessionIds.length > 0
    ? await supabase
        .from('attendances')
        .select('session_id, present')
        .in('session_id', pastSessionIds)
    : { data: [] }

  const attendanceBySession = new Map<string, { present: number; total: number }>()
  for (const a of allAttendances ?? []) {
    const existing = attendanceBySession.get(a.session_id) ?? { present: 0, total: 0 }
    existing.total++
    if (a.present) existing.present++
    attendanceBySession.set(a.session_id, existing)
  }

  const upcoming = sessions
    .filter(s => s.session_date >= today)
    .sort((a, b) => a.session_date.localeCompare(b.session_date))

  const past = sessions
    .filter(s => s.session_date < today)
    .sort((a, b) => b.session_date.localeCompare(a.session_date))

  function SessionRow({ s }: { s: SessionRow }) {
    const course = s.courses
    const activeStudents = course?.course_enrollments?.filter(e => e.status === 'active').length ?? 0
    const date = new Date(s.session_date)
    const isToday = s.session_date === today
    const isPast = s.session_date < today
    const att = isPast ? attendanceBySession.get(s.id) : undefined
    const pct = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : null

    return (
      <Link
        href={`/super-admin/corsi/${course?.id}/presenze`}
        className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition group"
      >
        <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${isToday ? 'text-white' : 'bg-gray-100'}`}
          style={isToday ? { backgroundColor: '#1565C0' } : {}}>
          <span className={`text-sm font-black leading-none ${isToday ? 'text-white' : 'text-gray-700'}`}>
            {date.getDate()}
          </span>
          <span className={`text-[9px] font-semibold uppercase ${isToday ? 'text-blue-200' : 'text-gray-400'}`}>
            {date.toLocaleDateString('it-IT', { month: 'short' })}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition truncate">{s.title}</p>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-xs text-blue-600 truncate">{course?.name ?? '—'}</span>
            {course?.location && (
              <span className="text-xs text-gray-400 flex items-center gap-0.5 flex-shrink-0">
                <MapPin size={9} /> {course.location}
              </span>
            )}
            <span className="text-xs text-gray-400">
              {date.toLocaleDateString('it-IT', { weekday: 'long' })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {pct !== null && att ? (
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-bold ${pct >= 75 ? 'text-green-700' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                {pct}%
              </span>
              <span className="text-xs text-gray-400">{att.present}/{att.total}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Users size={11} /> {activeStudents}
            </div>
          )}
        </div>
      </Link>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agenda sessioni</h2>
          <p className="text-gray-500 text-sm mt-1">{sessions.length} sessioni totali in tutti i corsi</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 flex-shrink-0">
          <span className="flex items-center gap-1.5">
            <CalendarClock size={13} className="text-blue-500" /> {upcoming.length} prossime
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarCheck size={13} className="text-gray-400" /> {past.length} passate
          </span>
        </div>
      </div>

      {sessions.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Calendar size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Nessuna sessione registrata.</p>
        </div>
      )}

      {/* Prossime */}
      {upcoming.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <CalendarClock size={15} className="text-blue-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Prossime sessioni</h3>
            <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {upcoming.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {upcoming.map(s => <SessionRow key={s.id} s={s} />)}
          </div>
        </div>
      )}

      {/* Passate */}
      {past.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <CalendarCheck size={15} className="text-gray-400" />
            <h3 className="font-semibold text-gray-900 text-sm">Sessioni passate</h3>
            <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
              {past.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {past.slice(0, 30).map(s => <SessionRow key={s.id} s={s} />)}
            {past.length > 30 && (
              <div className="px-5 py-3 text-xs text-gray-400 text-center">
                + {past.length - 30} sessioni precedenti
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
