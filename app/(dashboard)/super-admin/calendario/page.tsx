import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Zap, BookOpen, Users } from 'lucide-react'
import CalendarioVisuale, { type CalEvent } from '@/components/calendario/CalendarioVisuale'
import type { Reminder } from '@/app/actions/reminders'

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

type Session  = { id: string; title: string; session_date: string; course_id: string; courses: { id: string; name: string } | null }
type TaskItem = { id: string; title: string; due_date: string; course_id: string; courses: { name: string } | null }
type QuizItem = { id: string; title: string; course_id: string; available_from: string | null; available_until: string | null; courses: { name: string } | null }
type AnyEvent =
  | { kind: 'session'; date: string; data: Session }
  | { kind: 'task';    date: string; data: TaskItem }
  | { kind: 'quiz';    date: string; data: QuizItem }

export default async function SuperAdminCalendario() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: remindersRaw } = await supabase
    .from('user_reminders')
    .select('id, user_id, date, time, title, note, color, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
  const reminders = (remindersRaw ?? []) as Reminder[]

  const [{ data: sessionsRaw }, { data: taskRaw }, { data: quizzesRaw }, { data: enrollmentsRaw }] = await Promise.all([
    supabase.from('course_sessions')
      .select('id, title, session_date, course_id, courses(id, name)')
      .order('session_date', { ascending: true }),
    supabase.from('course_tasks')
      .select('id, title, due_date, course_id, courses(name)')
      .not('due_date', 'is', null).order('due_date', { ascending: true }),
    supabase.from('course_quizzes')
      .select('id, title, course_id, available_from, available_until, courses(name)')
      .order('available_from', { ascending: true }),
    supabase.from('course_enrollments').select('course_id').eq('status', 'active'),
  ])

  const sessions = (sessionsRaw ?? []) as unknown as Session[]
  const tasks    = (taskRaw    ?? []) as unknown as TaskItem[]
  const quizzes  = ((quizzesRaw ?? []) as unknown as QuizItem[]).filter(q => q.available_from || q.available_until)

  const enrollCount = new Map<string, number>()
  for (const e of enrollmentsRaw ?? []) enrollCount.set(e.course_id, (enrollCount.get(e.course_id) ?? 0) + 1)

  const todayStr = toDateStr(new Date())
  const in7days  = toDateStr(new Date(Date.now() + 7 * 86400000))

  const allEvents: AnyEvent[] = [
    ...sessions.map(s  => ({ kind: 'session' as const, date: s.session_date, data: s })),
    ...tasks.map(t     => ({ kind: 'task'    as const, date: t.due_date,      data: t })),
    ...quizzes.map(q   => ({ kind: 'quiz'    as const, date: (q.available_from ?? q.available_until)!.split('T')[0], data: q })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  const next7Events    = allEvents.filter(e => e.date >= todayStr && e.date <= in7days)
  const todayEvents    = allEvents.filter(e => isToday(e.date))
  const thisWeekEvents = allEvents.filter(e => !isToday(e.date) && isThisWeek(e.date) && e.date >= todayStr)
  const upcomingEvents = allEvents.filter(e => !isThisWeek(e.date) && e.date > in7days)
  const pastSessions   = [...sessions.filter(s => s.session_date < todayStr)].reverse()

  const calEvents: CalEvent[] = [
    ...sessions.map(s  => ({ id: s.id, kind: 'session' as const, date: s.session_date, title: s.title, courseName: s.courses?.name ?? '', href: `/super-admin/corsi/${s.course_id}/sessioni` })),
    ...tasks.map(t     => ({ id: t.id, kind: 'task'    as const, date: t.due_date,      title: t.title, courseName: t.courses?.name ?? '', href: `/super-admin/corsi/${t.course_id}/task/${t.id}` })),
    ...quizzes.map(q   => ({ id: q.id, kind: 'quiz'    as const, date: (q.available_from ?? q.available_until)!.split('T')[0], title: q.title, courseName: q.courses?.name ?? '', href: `/super-admin/corsi/${q.course_id}/quiz/${q.id}`, available: true })),
  ]

  function AgendaDateHeader({ dateStr }: { dateStr: string }) {
    const d = localDate(dateStr)
    const isT = dateStr === todayStr
    return (
      <div className="flex items-center gap-3 pt-5 pb-2 px-1 first:pt-0">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${isT ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{d.getDate()}</div>
        <div>
          <p className={`text-sm font-semibold capitalize ${isT ? 'text-blue-700' : 'text-gray-700'}`}>
            {d.toLocaleDateString('it-IT', { weekday: 'long' })}
            {isT && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">Oggi</span>}
          </p>
          <p className="text-xs text-gray-400">{d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>
    )
  }

  function AgendaRow({ ev }: { ev: AnyEvent }) {
    const isSession = ev.kind === 'session'; const isTask = ev.kind === 'task'; const isQuiz = ev.kind === 'quiz'
    const s = ev.data as Session; const t = ev.data as TaskItem; const q = ev.data as QuizItem
    const href  = isSession ? `/super-admin/corsi/${s.course_id}/sessioni` : isTask ? `/super-admin/corsi/${t.course_id}/task/${t.id}` : `/super-admin/corsi/${q.course_id}/quiz/${q.id}`
    const name  = isSession ? s.courses?.name : isTask ? t.courses?.name : q.courses?.name
    const color = isSession ? 'bg-blue-500' : isTask ? 'bg-amber-500' : 'bg-purple-500'
    const badge = isSession ? 'bg-blue-50 text-blue-700 border-blue-100' : isTask ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-purple-50 text-purple-700 border-purple-100'
    const enrolled = isSession ? (enrollCount.get(s.course_id) ?? 0) : 0
    return (
      <Link href={href} className="flex items-center gap-4 py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors group">
        <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${color}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-700 transition-colors">{ev.data.title}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-gray-400 truncate">{name}</span>
            {isSession && enrolled > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-gray-400"><Users size={10} />{enrolled}</span>
            )}
            {isQuiz && q.available_from && (
              <span className="text-xs text-gray-400">Apre {new Date(q.available_from).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</span>
            )}
          </div>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${badge}`}>
          {isSession ? 'Sessione' : isTask ? 'Task' : 'Quiz'}
        </span>
      </Link>
    )
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
    return (
      <div>
        <div className="flex items-center gap-2 mb-1 px-1">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
          <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{label}</h3>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {groupByDate(events).map(([dateStr, evs]) => (
            <div key={dateStr} className="px-2 border-b border-gray-50 last:border-b-0">
              <AgendaDateHeader dateStr={dateStr} />
              <div className="pb-2 space-y-0.5">{evs.map((ev, i) => <AgendaRow key={ev.kind + i} ev={ev} />)}</div>
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
          <h2 className="text-xl font-bold text-gray-900">Calendario</h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {sessions.length} sessioni · {tasks.length} task · {quizzes.length} quiz pianificati
          </p>
        </div>
        <Link href="/super-admin/corsi" className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
          <BookOpen size={12} />Gestisci corsi
        </Link>
      </div>

      {/* Widget 7 giorni */}
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
              const s = ev.data as Session; const t = ev.data as TaskItem; const q = ev.data as QuizItem
              const href = isSession ? `/super-admin/corsi/${s.course_id}/sessioni` : isTask ? `/super-admin/corsi/${t.course_id}/task/${t.id}` : `/super-admin/corsi/${q.course_id}/quiz/${q.id}`
              const name = isSession ? s.courses?.name : isTask ? t.courses?.name : q.courses?.name
              const dot  = isSession ? 'bg-blue-500' : isTask ? 'bg-amber-500' : 'bg-purple-500'
              const badge = isSession ? 'bg-blue-50 text-blue-700' : isTask ? 'bg-amber-50 text-amber-700' : 'bg-purple-50 text-purple-700'
              const daysLeft = Math.round((localDate(ev.date).getTime() - new Date().setHours(0,0,0,0)) / 86400000)
              return (
                <Link key={i} href={href} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors group">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition-colors truncate">{ev.data.title}</p>
                    <p className="text-xs text-gray-400 truncate">{name} · {formatShort(ev.date)}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${badge}`}>
                    {isSession ? 'Sessione' : isTask ? 'Task' : 'Quiz'}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    daysLeft === 0 ? 'bg-green-100 text-green-700' : daysLeft === 1 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                  }`}>{daysLeft === 0 ? 'Oggi' : daysLeft === 1 ? 'Domani' : `${daysLeft}g`}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Calendario visuale */}
      <CalendarioVisuale events={calEvents} initialReminders={reminders} />

      {/* Agenda */}
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
              {groupByDate(pastSessions.slice(0, 15).map(s => ({ kind: 'session' as const, date: s.session_date, data: s }))).map(([dateStr, evs]) => (
                <div key={dateStr} className="px-2 border-b border-gray-50 last:border-b-0">
                  <AgendaDateHeader dateStr={dateStr} />
                  <div className="pb-2 space-y-0.5">{evs.map((ev, i) => <AgendaRow key={i} ev={ev} />)}</div>
                </div>
              ))}
              {pastSessions.length > 15 && (
                <p className="text-xs text-gray-400 text-center py-3">+ {pastSessions.length - 15} sessioni precedenti</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
