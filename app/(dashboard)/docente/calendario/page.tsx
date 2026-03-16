import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Calendar, MapPin, Clock, BookOpen, Users, ClipboardCheck } from 'lucide-react'

function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
}
function isToday(d: string) {
  const today = new Date()
  const date = new Date(d)
  return date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
}
function isThisWeek(d: string) {
  const now = new Date()
  const date = new Date(d)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay() + 1)
  startOfWeek.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)
  return date >= startOfWeek && date <= endOfWeek
}

export default async function DocenteCalendario() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch corsi del docente
  const { data: myCoursesData } = await supabase
    .from('course_instructors')
    .select('course_id')
    .eq('instructor_id', user.id)

  const courseIds = (myCoursesData ?? []).map(r => r.course_id)

  // Sessioni di tutti i corsi
  const { data: sessionsRaw } = courseIds.length > 0
    ? await supabase
        .from('course_sessions')
        .select(`
          id, title, session_date, course_id,
          courses(id, name, location),
          attendances(student_id, present)
        `)
        .in('course_id', courseIds)
        .order('session_date', { ascending: true })
    : { data: [] }

  // Corsisti attivi per corso (per conteggio)
  const { data: enrollments } = courseIds.length > 0
    ? await supabase
        .from('course_enrollments')
        .select('course_id, student_id')
        .in('course_id', courseIds)
        .eq('status', 'active')
    : { data: [] }

  const enrollmentsByCourse = new Map<string, number>()
  for (const e of enrollments ?? []) {
    enrollmentsByCourse.set(e.course_id, (enrollmentsByCourse.get(e.course_id) ?? 0) + 1)
  }

  // Task con scadenza per i corsi del docente
  type TaskDeadline = { id: string; title: string; due_date: string; course_id: string; courses: { name: string } | null }
  const { data: taskDeadlinesRaw } = courseIds.length > 0
    ? await supabase
        .from('course_tasks')
        .select('id, title, due_date, course_id, courses(name)')
        .in('course_id', courseIds)
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })
    : { data: [] }

  const taskDeadlines = taskDeadlinesRaw as TaskDeadline[] ?? []

  // Submissions per task (per conteggio consegne)
  const taskIds = taskDeadlines.map(t => t.id)
  const { data: allSubs } = taskIds.length > 0
    ? await supabase.from('task_submissions').select('task_id, grade').in('task_id', taskIds)
    : { data: [] }
  type Sub = { task_id: string; grade: string | null }
  const subsByTask = new Map<string, Sub[]>()
  for (const s of allSubs as Sub[] ?? []) {
    if (!subsByTask.has(s.task_id)) subsByTask.set(s.task_id, [])
    subsByTask.get(s.task_id)!.push(s)
  }

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  type Session = {
    id: string
    title: string
    session_date: string
    course_id: string
    courses: { id: string; name: string; location: string | null } | null
    attendances: { student_id: string; present: boolean }[]
  }

  const sessions = (sessionsRaw ?? []) as unknown as Session[]

  type Event =
    | { kind: 'session'; date: string; data: Session }
    | { kind: 'task'; date: string; data: TaskDeadline }

  const allEvents: Event[] = [
    ...sessions.map(s => ({ kind: 'session' as const, date: s.session_date, data: s })),
    ...taskDeadlines.map(t => ({ kind: 'task' as const, date: t.due_date, data: t })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  const todayEvents = allEvents.filter(e => isToday(e.date))
  const thisWeekEvents = allEvents.filter(e => !isToday(e.date) && isThisWeek(e.date) && new Date(e.date) >= now)
  const upcomingEvents = allEvents.filter(e => !isThisWeek(e.date) && new Date(e.date) >= now)
  const pastSessions = [...sessions.filter(s => new Date(s.session_date) < now)].reverse()

  function TaskCard({ t }: { t: TaskDeadline }) {
    const subs = subsByTask.get(t.id) ?? []
    const pending = subs.filter(s => !s.grade).length
    const isOverdue = t.due_date < new Date().toISOString().split('T')[0]
    return (
      <Link
        href={`/docente/corsi/${t.course_id}/task/${t.id}`}
        className="flex items-start gap-4 bg-amber-50 rounded-xl border border-amber-200 shadow-sm p-4 hover:shadow-md transition"
      >
        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-center ${isOverdue ? 'bg-red-100' : 'bg-amber-100'}`}>
          <span className={`text-base font-black leading-none ${isOverdue ? 'text-red-600' : 'text-amber-700'}`}>
            {new Date(t.due_date).getDate()}
          </span>
          <span className={`text-[10px] font-semibold uppercase ${isOverdue ? 'text-red-400' : 'text-amber-500'}`}>
            {new Date(t.due_date).toLocaleDateString('it-IT', { month: 'short' })}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={12} className={isOverdue ? 'text-red-400' : 'text-amber-600'} />
            <p className="font-semibold text-gray-900 text-sm truncate">{t.title}</p>
          </div>
          <p className="text-xs text-amber-700 font-medium truncate mt-0.5">{t.courses?.name}</p>
          <p className="text-xs text-gray-400 mt-1">
            {subs.length} consegne{pending > 0 && <span className="text-red-500 font-semibold"> · {pending} da valutare</span>}
          </p>
        </div>
      </Link>
    )
  }

  function EventCard({ ev, past = false }: { ev: Event; past?: boolean }) {
    if (ev.kind === 'task') return <TaskCard t={ev.data as TaskDeadline} />
    return <SessionCard s={ev.data as Session} past={past} />
  }

  function SessionCard({ s, past = false }: { s: Session; past?: boolean }) {
    const presentCount = s.attendances.filter(a => a.present).length
    const totalCount = s.attendances.length
    const pct = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : null
    const enrolled = enrollmentsByCourse.get(s.course_id) ?? 0

    return (
      <Link
        href={`/docente/corsi/${s.course_id}/presenze`}
        className={`flex items-start gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition ${past ? 'opacity-70 hover:opacity-100' : ''}`}
      >
        {/* Data box */}
        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-center ${past ? 'bg-gray-100' : 'bg-blue-50'}`}>
          <span className={`text-base font-black leading-none ${past ? 'text-gray-500' : 'text-blue-700'}`}>
            {new Date(s.session_date).getDate()}
          </span>
          <span className={`text-[10px] font-semibold uppercase ${past ? 'text-gray-400' : 'text-blue-500'}`}>
            {new Date(s.session_date).toLocaleDateString('it-IT', { month: 'short' })}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{s.title}</p>
          <p className="text-xs text-blue-600 font-medium truncate mt-0.5">{s.courses?.name}</p>
          <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-1.5">
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {formatDateShort(s.session_date)}
            </span>
            {s.courses?.location && (
              <span className="flex items-center gap-1">
                <MapPin size={10} />
                {s.courses.location}
              </span>
            )}
            {enrolled > 0 && (
              <span className="flex items-center gap-1">
                <Users size={10} />
                {enrolled} corsisti
              </span>
            )}
          </div>
        </div>

        {/* Presenze (solo passate) */}
        {past && pct !== null && (
          <div className="flex-shrink-0 self-center text-right">
            <span className={`text-sm font-bold ${pct >= 75 ? 'text-green-700' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
              {pct}%
            </span>
            <p className="text-xs text-gray-400">{presentCount}/{totalCount}</p>
          </div>
        )}
        {past && pct === null && (
          <span className="text-xs text-gray-400 flex-shrink-0 self-center">—</span>
        )}
      </Link>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <Calendar size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Nessuna sessione in calendario.</p>
          <Link href="/docente/corsi" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
            Vai ai miei corsi →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-7">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Calendario Sessioni</h2>
        <p className="text-gray-500 text-sm mt-1">{sessions.length} sessioni totali su {courseIds.length} {courseIds.length === 1 ? 'corso' : 'corsi'}</p>
      </div>

      {/* Oggi */}
      {todayEvents.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Oggi</h3>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              {todayEvents.length}
            </span>
          </div>
          <div className="space-y-3">
            {todayEvents.map((ev, i) => (
              <div key={ev.kind + i} className="relative">
                <div className="absolute -left-0 top-0 bottom-0 w-1 bg-green-500 rounded-l-xl" />
                <div className="pl-1"><EventCard ev={ev} /></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Questa settimana */}
      {thisWeekEvents.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Questa settimana</h3>
          </div>
          <div className="space-y-3">
            {thisWeekEvents.map((ev, i) => <EventCard key={ev.kind + i} ev={ev} />)}
          </div>
        </section>
      )}

      {/* Prossimi */}
      {upcomingEvents.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Prossimi</h3>
          </div>
          <div className="space-y-3">
            {upcomingEvents.map((ev, i) => <EventCard key={ev.kind + i} ev={ev} />)}
          </div>
        </section>
      )}

      {/* Storico */}
      {pastSessions.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-gray-200 flex-shrink-0" />
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Storico</h3>
          </div>
          <div className="space-y-3">
            {pastSessions.slice(0, 15).map(s => <SessionCard key={s.id} s={s} past />)}
          </div>
          {pastSessions.length > 15 && (
            <p className="text-xs text-gray-400 text-center mt-3">
              + {pastSessions.length - 15} sessioni precedenti
            </p>
          )}
        </section>
      )}

      <div className="flex items-center justify-center">
        <Link href="/docente/corsi" className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
          <BookOpen size={12} /> Vai ai miei corsi
        </Link>
      </div>
    </div>
  )
}
