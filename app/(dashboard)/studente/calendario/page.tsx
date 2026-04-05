import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Calendar, MapPin, ClipboardCheck, ClipboardList, Zap, BookOpen } from 'lucide-react'
import CalendarioVisuale, { type CalEvent } from '@/components/calendario/CalendarioVisuale'
import type { Reminder } from '@/app/actions/reminders'

// ── helpers ────────────────────────────────────────────────────────────────
function toDateStr(d: Date) { return d.toISOString().split('T')[0] }
function isToday(dateStr: string) { return dateStr === toDateStr(new Date()) }
function isThisWeek(dateStr: string) {
  const now   = new Date()
  const start = new Date(now); start.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1)); start.setHours(0,0,0,0)
  const end   = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999)
  const d     = new Date(dateStr + 'T12:00:00')
  return d >= start && d <= end
}
function localDate(iso: string) { return new Date(iso + 'T12:00:00') }
function formatShort(dateStr: string) {
  return localDate(dateStr).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

// ── types ─────────────────────────────────────────────────────────────────
type Session = {
  id: string; title: string; session_date: string; course_id: string
  courses: { id: string; name: string; location: string | null } | null
}
type TaskDeadline = { id: string; title: string; due_date: string; course_id: string; courses: { name: string } | null }
type CourseQuiz   = { id: string; title: string; course_id: string; available_from: string | null; available_until: string | null; courses: { name: string } | null }
type AnyEvent =
  | { kind: 'session'; date: string; data: Session; available: true }
  | { kind: 'task';    date: string; data: TaskDeadline; available: true }
  | { kind: 'quiz';    date: string; data: CourseQuiz; available: boolean }

// ── main ──────────────────────────────────────────────────────────────────
export default async function StudenteCalendario() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: remindersRaw } = await supabase
    .from('user_reminders')
    .select('id, user_id, date, time, title, note, color, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
  const reminders = (remindersRaw ?? []) as Reminder[]

  const { data: enrollments } = await supabase
    .from('course_enrollments').select('course_id').eq('student_id', user.id).eq('status', 'active')
  const courseIds = (enrollments ?? []).map(e => e.course_id)

  const [{ data: sessionsRaw }, { data: taskRaw }, { data: quizzesRaw }] = await Promise.all([
    courseIds.length > 0
      ? supabase.from('course_sessions')
          .select('id, title, session_date, course_id, courses(id, name, location)')
          .in('course_id', courseIds).order('session_date', { ascending: true })
      : { data: [] },
    courseIds.length > 0
      ? supabase.from('course_tasks')
          .select('id, title, due_date, course_id, courses(name)')
          .in('course_id', courseIds).not('due_date', 'is', null).order('due_date', { ascending: true })
      : { data: [] },
    courseIds.length > 0
      ? supabase.from('course_quizzes')
          .select('id, title, course_id, available_from, available_until, courses(name)')
          .in('course_id', courseIds).order('available_from', { ascending: true })
      : { data: [] },
  ])

  const sessions = (sessionsRaw ?? []) as unknown as Session[]
  const allTasks = (taskRaw    ?? []) as unknown as TaskDeadline[]
  const quizzes  = ((quizzesRaw ?? []) as unknown as CourseQuiz[]).filter(q => q.available_from || q.available_until)

  // Filtra task non ancora consegnate
  const sessionIds = sessions.map(s => s.id)
  const { data: myAttendances } = sessionIds.length > 0
    ? await supabase.from('attendances').select('session_id, present').in('session_id', sessionIds).eq('student_id', user.id)
    : { data: [] }
  const attendanceMap = new Map<string, boolean>()
  for (const a of myAttendances ?? []) attendanceMap.set(a.session_id, a.present)

  const taskIds = allTasks.map(t => t.id)
  const { data: mySubmissions } = taskIds.length > 0
    ? await supabase.from('task_submissions').select('task_id').eq('student_id', user.id).in('task_id', taskIds)
    : { data: [] }
  const submittedIds = new Set((mySubmissions ?? []).map(s => s.task_id))
  const pendingTasks = allTasks.filter(t => !submittedIds.has(t.id))

  const nowIso   = new Date().toISOString()
  const todayStr = toDateStr(new Date())
  const in7days  = toDateStr(new Date(Date.now() + 7 * 86400000))

  const allEvents: AnyEvent[] = [
    ...sessions.map(s      => ({ kind: 'session' as const, date: s.session_date, data: s,  available: true as const })),
    ...pendingTasks.map(t  => ({ kind: 'task'    as const, date: t.due_date,      data: t,  available: true as const })),
    ...quizzes.map(q       => ({
      kind: 'quiz' as const, date: (q.available_from ?? q.available_until)!.split('T')[0], data: q,
      available: !q.available_from || q.available_from <= nowIso,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  const next7Events    = allEvents.filter(e => e.date >= todayStr && e.date <= in7days)
  const todayEvents    = allEvents.filter(e => isToday(e.date))
  const thisWeekEvents = allEvents.filter(e => !isToday(e.date) && isThisWeek(e.date) && e.date >= todayStr)
  const upcomingEvents = allEvents.filter(e => !isThisWeek(e.date) && e.date > in7days)
  const pastSessions   = [...sessions.filter(s => s.session_date < todayStr)].reverse()

  const calEvents: CalEvent[] = [
    ...sessions.map(s     => ({ id: s.id, kind: 'session' as const, date: s.session_date, title: s.title, courseName: s.courses?.name ?? '', href: `/studente/corsi/${s.courses?.id ?? s.course_id}` })),
    ...pendingTasks.map(t => ({ id: t.id, kind: 'task'    as const, date: t.due_date,      title: t.title, courseName: t.courses?.name ?? '', href: `/studente/corsi/${t.course_id}/task/${t.id}` })),
    ...quizzes.map(q => {
      const av = !q.available_from || q.available_from <= nowIso
      return { id: q.id, kind: 'quiz' as const, date: (q.available_from ?? q.available_until)!.split('T')[0], title: q.title, courseName: q.courses?.name ?? '', href: `/studente/corsi/${q.course_id}/quiz/${q.id}`, available: av }
    }),
  ]

  if (sessions.length === 0 && pendingTasks.length === 0 && quizzes.length === 0) {
    return (
      <div className="max-w-3xl mx-auto mt-16 text-center">
        <Calendar size={40} className="text-gray-200 mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Nessuna sessione o scadenza in calendario.</p>
        <Link href="/studente/corsi" className="text-sm text-blue-600 hover:underline mt-3 inline-block">Vai ai miei corsi →</Link>
      </div>
    )
  }

  // ── sub-components ──────────────────────────────────────────────────────
  function AgendaDateHeader({ dateStr }: { dateStr: string }) {
    const d   = localDate(dateStr)
    const isTodayDate = dateStr === todayStr
    return (
      <div className="flex items-center gap-3 pt-5 pb-2 px-1 first:pt-0">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
          isTodayDate ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
        }`}>{d.getDate()}</div>
        <div>
          <p className={`text-sm font-semibold capitalize ${isTodayDate ? 'text-blue-700' : 'text-gray-700'}`}>
            {d.toLocaleDateString('it-IT', { weekday: 'long' })}
            {isTodayDate && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">Oggi</span>}
          </p>
          <p className="text-xs text-gray-400">{d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>
    )
  }

  function AgendaRow({ ev }: { ev: AnyEvent }) {
    const isSession = ev.kind === 'session'; const isTask = ev.kind === 'task'; const isQuiz = ev.kind === 'quiz'
    const s = ev.data as Session; const t = ev.data as TaskDeadline; const q = ev.data as CourseQuiz
    const isUnavailable = isQuiz && !ev.available
    const isOverdue     = isTask && ev.date < todayStr

    const href  = isSession ? `/studente/corsi/${s.courses?.id ?? s.course_id}` : isTask ? `/studente/corsi/${t.course_id}/task/${t.id}` : `/studente/corsi/${q.course_id}/quiz/${q.id}`
    const name  = isSession ? s.courses?.name : isTask ? t.courses?.name : q.courses?.name
    const color = isSession ? 'bg-blue-500' : isTask ? isOverdue ? 'bg-red-500' : 'bg-amber-500' : isUnavailable ? 'bg-gray-300' : 'bg-purple-500'
    const badge = isSession ? 'bg-blue-50 text-blue-700 border-blue-100' : isTask ? isOverdue ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100' : isUnavailable ? 'bg-gray-50 text-gray-400 border-gray-100' : 'bg-purple-50 text-purple-700 border-purple-100'

    const attended    = isSession ? attendanceMap.get(s.id) : undefined
    const hasAtt      = isSession ? attendanceMap.has(s.id) : false
    const isPastSess  = isSession && ev.date < todayStr

    const row = (
      <div className="flex items-center gap-4 py-3 px-4 rounded-xl group-hover:bg-gray-50 transition-colors">
        <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${color}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-700 transition-colors">{ev.data.title}</p>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-xs text-gray-400 truncate">{name}</span>
            {isSession && s.courses?.location && (
              <span className="flex items-center gap-0.5 text-xs text-gray-400"><MapPin size={10} />{s.courses.location}</span>
            )}
            {isTask && isOverdue && <span className="text-xs text-red-500 font-medium">Scaduta</span>}
            {isQuiz && isUnavailable && q.available_from && (
              <span className="text-xs text-amber-500">
                Apre {new Date(q.available_from).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
        {isPastSess && hasAtt && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${attended ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
            {attended ? 'Presente' : 'Assente'}
          </span>
        )}
        {isPastSess && !hasAtt && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 bg-gray-50 text-gray-400 border-gray-100">Non rilevata</span>
        )}
        {!isPastSess && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${badge}`}>
            {isSession ? 'Sessione' : isTask ? 'Task' : isUnavailable ? 'In arrivo' : 'Quiz'}
          </span>
        )}
      </div>
    )

    if (isUnavailable) return <div className="group">{row}</div>
    return <Link href={href} className="group block">{row}</Link>
  }

  function groupByDate(evs: AnyEvent[]) {
    const map = new Map<string, AnyEvent[]>()
    for (const ev of evs) {
      if (!map.has(ev.date)) map.set(ev.date, [])
      map.get(ev.date)!.push(ev)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }

  function AgendaSection({ events, label, dot }: { events: AnyEvent[]; label: string; dot: string }) {
    if (events.length === 0) return null
    const grouped = groupByDate(events)
    return (
      <div>
        <div className="flex items-center gap-2 mb-1 px-1">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
          <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{label}</h3>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {grouped.map(([dateStr, evs]) => (
            <div key={dateStr} className="px-2 border-b border-gray-50 last:border-b-0">
              <AgendaDateHeader dateStr={dateStr} />
              <div className="pb-2 space-y-0.5">
                {evs.map((ev, i) => <AgendaRow key={ev.kind + i} ev={ev} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Il Mio Calendario</h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {sessions.length} sessioni · {pendingTasks.length} task da consegnare · {quizzes.length} quiz pianificati
          </p>
        </div>
        <Link href="/studente/corsi" className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
          <BookOpen size={12} />Vai ai corsi
        </Link>
      </div>

      {/* ── Widget prossimi 7 giorni ── */}
      {next7Events.length > 0 && (
        <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-orange-50 border-b border-orange-100 flex items-center gap-2">
            <Zap size={13} className="text-orange-500" />
            <h3 className="text-sm font-semibold text-orange-900">Prossimi 7 giorni</h3>
            <span className="ml-auto text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full font-semibold">{next7Events.length}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {next7Events.map((ev, i) => {
              const isSession = ev.kind === 'session'; const isTask = ev.kind === 'task'; const isQuiz = ev.kind === 'quiz'
              const s = ev.data as Session; const t = ev.data as TaskDeadline; const q = ev.data as CourseQuiz
              const isUnavailable = isQuiz && !ev.available
              const href = isUnavailable ? '#' : isSession ? `/studente/corsi/${s.courses?.id ?? s.course_id}` : isTask ? `/studente/corsi/${t.course_id}/task/${t.id}` : `/studente/corsi/${q.course_id}/quiz/${q.id}`
              const name = isSession ? s.courses?.name : isTask ? t.courses?.name : q.courses?.name
              const dot  = isSession ? 'bg-blue-500' : isTask ? 'bg-amber-500' : isUnavailable ? 'bg-gray-300' : 'bg-purple-500'
              const badge = isSession ? 'bg-blue-50 text-blue-700' : isTask ? 'bg-amber-50 text-amber-700' : isUnavailable ? 'bg-gray-50 text-gray-400' : 'bg-purple-50 text-purple-700'
              const daysLeft = Math.round((localDate(ev.date).getTime() - new Date().setHours(0,0,0,0)) / 86400000)

              const content = (
                <div className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors group">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition-colors truncate">{ev.data.title}</p>
                    <p className="text-xs text-gray-400 truncate">{name} · {formatShort(ev.date)}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${badge}`}>
                    {isSession ? 'Sessione' : isTask ? 'Task' : isUnavailable ? 'In arrivo' : 'Quiz'}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    daysLeft === 0 ? 'bg-green-100 text-green-700' : daysLeft === 1 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                  }`}>{daysLeft === 0 ? 'Oggi' : daysLeft === 1 ? 'Domani' : `${daysLeft}g`}</span>
                </div>
              )
              return isUnavailable
                ? <div key={i}>{content}</div>
                : <Link key={i} href={href}>{content}</Link>
            })}
          </div>
        </div>
      )}

      {/* ── Calendario visuale ── */}
      <CalendarioVisuale events={calEvents} initialReminders={reminders} />

      {/* ── Agenda ── */}
      <div className="space-y-6">
        <AgendaSection events={todayEvents}    label="Oggi"            dot="bg-green-500" />
        <AgendaSection events={thisWeekEvents} label="Questa settimana" dot="bg-blue-400" />
        <AgendaSection events={upcomingEvents} label="Prossimi"        dot="bg-gray-300" />

        {pastSessions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-1 px-1">
              <span className="w-2 h-2 rounded-full flex-shrink-0 bg-gray-200" />
              <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Storico sessioni</h3>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {groupByDate(pastSessions.slice(0, 10).map(s => ({ kind: 'session' as const, date: s.session_date, data: s, available: true as const }))).map(([dateStr, evs]) => (
                <div key={dateStr} className="px-2 border-b border-gray-50 last:border-b-0">
                  <AgendaDateHeader dateStr={dateStr} />
                  <div className="pb-2 space-y-0.5">
                    {evs.map((ev, i) => <AgendaRow key={i} ev={ev} />)}
                  </div>
                </div>
              ))}
              {pastSessions.length > 10 && (
                <p className="text-xs text-gray-400 text-center py-3">+ {pastSessions.length - 10} sessioni precedenti</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
