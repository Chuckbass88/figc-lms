import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Calendar, MapPin, Clock, BookOpen, ClipboardCheck } from 'lucide-react'

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

export default async function StudenteCalendario() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch enrollments attivi
  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select('course_id')
    .eq('student_id', user.id)
    .eq('status', 'active')

  const courseIds = (enrollments ?? []).map(e => e.course_id)

  // Sessioni di tutti i corsi iscritti
  const { data: sessionsRaw } = courseIds.length > 0
    ? await supabase
        .from('course_sessions')
        .select('id, title, session_date, course_id, courses(id, name, location)')
        .in('course_id', courseIds)
        .order('session_date', { ascending: true })
    : { data: [] }

  // Presenze dello studente per segnare sessioni già rilevate
  const sessionIds = (sessionsRaw ?? []).map(s => s.id)
  const { data: attendances } = sessionIds.length > 0
    ? await supabase
        .from('attendances')
        .select('session_id, present')
        .in('session_id', sessionIds)
        .eq('student_id', user.id)
    : { data: [] }

  const attendanceMap = new Map<string, boolean>()
  for (const a of attendances ?? []) {
    attendanceMap.set(a.session_id, a.present)
  }

  // Task con scadenza (non ancora consegnati)
  const { data: taskDeadlines } = courseIds.length > 0
    ? await supabase
        .from('course_tasks')
        .select('id, title, due_date, course_id, courses(name)')
        .in('course_id', courseIds)
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })
    : { data: [] }

  const { data: mySubmissions } = taskDeadlines && taskDeadlines.length > 0
    ? await supabase
        .from('task_submissions')
        .select('task_id')
        .eq('student_id', user.id)
        .in('task_id', taskDeadlines.map(t => t.id))
    : { data: [] }

  const submittedIds = new Set((mySubmissions ?? []).map(s => s.task_id))
  type TaskDeadline = { id: string; title: string; due_date: string; course_id: string; courses: { name: string } | null }
  const pendingTasks = (taskDeadlines as TaskDeadline[] ?? []).filter(t => !submittedIds.has(t.id))

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  type Session = {
    id: string
    title: string
    session_date: string
    course_id: string
    courses: { id: string; name: string; location: string | null } | null
  }

  const sessions = (sessionsRaw ?? []) as unknown as Session[]

  const todaySessions = sessions.filter(s => isToday(s.session_date))
  const thisWeekSessions = sessions.filter(s => !isToday(s.session_date) && isThisWeek(s.session_date) && new Date(s.session_date) >= now)
  const upcomingSessions = sessions.filter(s => !isThisWeek(s.session_date) && new Date(s.session_date) >= now)

  function SessionCard({ s, past = false }: { s: Session; past?: boolean }) {
    const attended = attendanceMap.get(s.id)
    const hasAttendance = attendanceMap.has(s.id)

    return (
      <Link
        href={`/studente/corsi/${s.courses?.id ?? s.course_id}`}
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
          </div>
        </div>

        {/* Badge presenza (solo passate) */}
        {past && hasAttendance && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 self-center ${
            attended ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
          }`}>
            {attended ? 'Presente' : 'Assente'}
          </span>
        )}
        {past && !hasAttendance && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 self-center bg-gray-100 text-gray-400">
            Non rilevata
          </span>
        )}
      </Link>
    )
  }

  // Unify sessions + task deadlines into a single event list per section
  type Event =
    | { kind: 'session'; date: string; data: Session }
    | { kind: 'task'; date: string; data: TaskDeadline }

  function makeEvents(): Event[] {
    const evs: Event[] = [
      ...sessions.map(s => ({ kind: 'session' as const, date: s.session_date, data: s })),
      ...pendingTasks.map(t => ({ kind: 'task' as const, date: t.due_date, data: t })),
    ]
    return evs.sort((a, b) => a.date.localeCompare(b.date))
  }

  const allEvents = makeEvents()
  const todayEvents = allEvents.filter(e => isToday(e.date))
  const thisWeekEvents = allEvents.filter(e => !isToday(e.date) && isThisWeek(e.date) && new Date(e.date) >= now)
  const upcomingEvents = allEvents.filter(e => !isThisWeek(e.date) && new Date(e.date) >= now)
  const pastSessions = [...sessions.filter(s => new Date(s.session_date) < now)].reverse()

  function TaskCard({ t }: { t: TaskDeadline }) {
    const isOverdue = t.due_date < new Date().toISOString().split('T')[0]
    return (
      <Link
        href={`/studente/corsi/${t.course_id}/task/${t.id}`}
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
          <p className={`text-xs mt-1 ${isOverdue ? 'text-red-500 font-semibold' : 'text-amber-600'}`}>
            {isOverdue ? 'Scadenza superata — consegna comunque' : 'Scadenza task'}
          </p>
        </div>
      </Link>
    )
  }

  function EventCard({ ev, past = false }: { ev: Event; past?: boolean }) {
    if (ev.kind === 'task') return <TaskCard t={ev.data as TaskDeadline} />
    return <SessionCard s={ev.data as Session} past={past} />
  }

  if (sessions.length === 0 && pendingTasks.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <Calendar size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Nessuna sessione o scadenza task in calendario.</p>
          <Link href="/studente/corsi" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
            Vai ai miei corsi →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-7">

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

      {/* Sessioni passate */}
      {pastSessions.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-gray-200 flex-shrink-0" />
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Storico</h3>
          </div>
          <div className="space-y-3">
            {pastSessions.slice(0, 10).map(s => <SessionCard key={s.id} s={s} past />)}
          </div>
          {pastSessions.length > 10 && (
            <p className="text-xs text-gray-400 text-center mt-3">
              + {pastSessions.length - 10} sessioni precedenti
            </p>
          )}
        </section>
      )}

      {/* Link ai corsi */}
      <div className="flex items-center justify-center">
        <Link href="/studente/corsi" className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
          <BookOpen size={12} /> Vai ai miei corsi
        </Link>
      </div>
    </div>
  )
}
