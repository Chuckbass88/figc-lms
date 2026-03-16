import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatsCard from '@/components/dashboard/StatsCard'
import { Users, BookOpen, GraduationCap, UserCheck, Calendar, MapPin, AlertTriangle, ClipboardCheck } from 'lucide-react'
import NotificaRischioBtn from './NotificaRischioBtn'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-gray-100 text-gray-500',
  draft: 'bg-amber-100 text-amber-700',
}
const STATUS_LABELS: Record<string, string> = {
  active: 'Attivo', completed: 'Completato', draft: 'Bozza',
}
const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Admin', docente: 'Docente', studente: 'Corsista',
}
const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  docente: 'bg-blue-100 text-blue-700',
  studente: 'bg-green-100 text-green-700',
}

export default async function SuperAdminDashboard() {
  const supabase = await createClient()

  // Calcola inizio e fine settimana corrente
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(today)
  endOfWeek.setDate(today.getDate() + 7)

  const [
    { count: totalUsers },
    { count: totalCourses },
    { count: totalStudents },
    { count: totalDocenti },
    { data: recentCourses },
    { data: recentUsers },
    { data: upcomingSessions },
    { count: totalTasks },
    { count: totalSubmissions },
    { count: pendingEvaluations },
    { count: totalQuizzes },
    { count: totalAttempts },
    { count: passedAttempts },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('courses').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'studente'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'docente'),
    supabase.from('courses').select('id, name, location, status, start_date').order('created_at', { ascending: false }).limit(5),
    supabase.from('profiles').select('id, full_name, email, role, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('course_sessions')
      .select('id, title, session_date, course_id, courses(id, name, location, course_enrollments(id, status))')
      .gte('session_date', today.toISOString().split('T')[0])
      .lte('session_date', endOfWeek.toISOString().split('T')[0])
      .order('session_date', { ascending: true })
      .limit(10),
    supabase.from('course_tasks').select('*', { count: 'exact', head: true }),
    supabase.from('task_submissions').select('*', { count: 'exact', head: true }),
    supabase.from('task_submissions').select('*', { count: 'exact', head: true }).is('grade', null),
    supabase.from('course_quizzes').select('*', { count: 'exact', head: true }),
    supabase.from('quiz_attempts').select('*', { count: 'exact', head: true }),
    supabase.from('quiz_attempts').select('*', { count: 'exact', head: true }).eq('passed', true),
  ])

  // Corsisti a rischio sistema (< 75%)
  const atRiskStudents: { id: string; full_name: string; pct: number; present: number; total: number }[] = []
  {
    const { data: allEnrollments } = await supabase
      .from('course_enrollments')
      .select('course_id, student_id, profiles(id, full_name)')
      .eq('status', 'active')

    const { data: allSessions } = await supabase
      .from('course_sessions')
      .select('id, course_id')

    const sessionIds = (allSessions ?? []).map(s => s.id)
    const { data: allAttendances } = sessionIds.length > 0
      ? await supabase.from('attendances').select('session_id, student_id, present').in('session_id', sessionIds)
      : { data: [] }

    const sessionsByCourse: Record<string, string[]> = {}
    for (const s of allSessions ?? []) {
      if (!sessionsByCourse[s.course_id]) sessionsByCourse[s.course_id] = []
      sessionsByCourse[s.course_id].push(s.id)
    }

    const attMap: Record<string, boolean> = {}
    for (const a of allAttendances ?? []) {
      attMap[`${a.session_id}:${a.student_id}`] = a.present
    }

    const coursesByStudent: Record<string, string[]> = {}
    const studentNames: Record<string, string> = {}
    for (const e of allEnrollments ?? []) {
      const p = e.profiles as unknown as { id: string; full_name: string } | null
      if (!p) continue
      studentNames[p.id] = p.full_name
      if (!coursesByStudent[p.id]) coursesByStudent[p.id] = []
      coursesByStudent[p.id].push(e.course_id)
    }

    for (const [studentId, enrolledCourseIds] of Object.entries(coursesByStudent)) {
      let total = 0, present = 0
      for (const cid of enrolledCourseIds) {
        for (const sid of sessionsByCourse[cid] ?? []) {
          total++
          if (attMap[`${sid}:${studentId}`] === true) present++
        }
      }
      if (total === 0) continue
      const pct = Math.round((present / total) * 100)
      if (pct < 75) atRiskStudents.push({ id: studentId, full_name: studentNames[studentId], pct, present, total })
    }
    atRiskStudents.sort((a, b) => a.pct - b.pct)
  }

  return (
    <div className="space-y-7">
      {/* Statistiche */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Utenti Totali" value={totalUsers ?? 0} icon={<Users size={20} />} variant="blue" />
        <StatsCard title="Corsi" value={totalCourses ?? 0} icon={<BookOpen size={20} />} variant="green" />
        <StatsCard title="Corsisti" value={totalStudents ?? 0} icon={<GraduationCap size={20} />} variant="amber" />
        <StatsCard title="Docenti" value={totalDocenti ?? 0} icon={<UserCheck size={20} />} variant="purple" />
      </div>

      {/* Sessioni prossimi 7 giorni */}
      {upcomingSessions && upcomingSessions.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-blue-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Prossime sessioni (7 giorni)</h3>
            </div>
            <Link href="/super-admin/report" className="text-xs font-medium text-blue-600 hover:underline">
              Report presenze →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {upcomingSessions.map(s => {
              const course = s.courses as unknown as { id: string; name: string; location: string | null; course_enrollments: { id: string; status: string }[] } | null
              const activeStudents = course?.course_enrollments?.filter(e => e.status === 'active').length ?? 0
              const sessionDate = new Date(s.session_date)
              const isSessionToday = sessionDate.toDateString() === new Date().toDateString()
              return (
                <Link
                  key={s.id}
                  href={`/super-admin/corsi/${course?.id ?? s.course_id}/presenze`}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition group"
                >
                  {/* Data box */}
                  <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${isSessionToday ? 'bg-blue-600' : 'bg-gray-100'}`}>
                    <span className={`text-sm font-black leading-none ${isSessionToday ? 'text-white' : 'text-gray-700'}`}>
                      {sessionDate.getDate()}
                    </span>
                    <span className={`text-[9px] font-semibold uppercase ${isSessionToday ? 'text-blue-200' : 'text-gray-400'}`}>
                      {sessionDate.toLocaleDateString('it-IT', { month: 'short' })}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition truncate">{s.title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-xs text-blue-600 truncate">{course?.name}</p>
                      {course?.location && (
                        <span className="text-xs text-gray-400 flex items-center gap-0.5 flex-shrink-0">
                          <MapPin size={9} />{course.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                    <Users size={11} className="text-gray-400" />
                    {activeStudents}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Corsisti a rischio */}
      {atRiskStudents.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-amber-100 bg-amber-50 flex items-center gap-2 flex-wrap">
            <AlertTriangle size={15} className="text-amber-600" />
            <h3 className="font-semibold text-amber-900 text-sm">Corsisti a rischio idoneità</h3>
            <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
              {atRiskStudents.length} sotto 75%
            </span>
            <div className="ml-auto flex items-center gap-2">
              <NotificaRischioBtn studentIds={atRiskStudents.map(s => s.id)} />
              <Link href="/super-admin/report" className="text-xs font-medium text-amber-700 hover:underline">
                Report →
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {atRiskStudents.slice(0, 5).map(s => (
              <Link
                key={s.id}
                href={`/super-admin/utenti/${s.id}`}
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition group"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: '#003DA5' }}
                >
                  {s.full_name.charAt(0)}
                </div>
                <span className="flex-1 text-sm font-medium text-gray-900 group-hover:text-blue-700 transition truncate">
                  {s.full_name}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.pct >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold w-8 text-right ${s.pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {s.pct}%
                  </span>
                  <span className="text-xs text-gray-400">{s.present}/{s.total}</span>
                </div>
              </Link>
            ))}
          </div>
          {atRiskStudents.length > 5 && (
            <div className="px-6 py-2.5 bg-gray-50 border-t border-gray-100">
              <Link href="/super-admin/report" className="text-xs text-blue-600 hover:underline">
                +{atRiskStudents.length - 5} altri corsisti a rischio nel report →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Task KPI */}
      {(totalTasks ?? 0) > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={15} className="text-blue-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Task</h3>
            </div>
            <Link href="/super-admin/task" className="text-xs font-medium text-blue-600 hover:underline">
              Panoramica task →
            </Link>
          </div>
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            <div className="px-6 py-5 text-center">
              <p className="text-2xl font-black text-gray-900">{totalTasks ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Task totali</p>
            </div>
            <div className="px-6 py-5 text-center">
              <p className="text-2xl font-black text-gray-900">{totalSubmissions ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Consegne ricevute</p>
            </div>
            <div className="px-6 py-5 text-center">
              <p className={`text-2xl font-black ${(pendingEvaluations ?? 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {pendingEvaluations ?? 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Da valutare</p>
            </div>
          </div>
        </div>
      )}

      {/* Quiz KPI */}
      {(totalQuizzes ?? 0) > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={15} className="text-green-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Quiz</h3>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            <div className="px-6 py-5 text-center">
              <p className="text-2xl font-black text-gray-900">{totalQuizzes ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Quiz totali</p>
            </div>
            <div className="px-6 py-5 text-center">
              <p className="text-2xl font-black text-gray-900">{totalAttempts ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Tentativi completati</p>
            </div>
            <div className="px-6 py-5 text-center">
              <p className={`text-2xl font-black ${(totalAttempts ?? 0) > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                {(totalAttempts ?? 0) > 0
                  ? `${Math.round(((passedAttempts ?? 0) / (totalAttempts ?? 1)) * 100)}%`
                  : '—'
                }
              </p>
              <p className="text-xs text-gray-500 mt-1">% superati ({passedAttempts ?? 0})</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Corsi recenti */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Corsi Recenti</h3>
            <Link href="/super-admin/corsi" className="text-xs font-medium text-blue-600 hover:underline">
              Vedi tutti →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentCourses?.map(course => (
              <Link
                key={course.id}
                href={`/super-admin/corsi/${course.id}`}
                className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition group"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition">{course.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{course.location ?? 'Sede non specificata'}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ml-3 ${STATUS_COLORS[course.status]}`}>
                  {STATUS_LABELS[course.status]}
                </span>
              </Link>
            ))}
            {(!recentCourses || recentCourses.length === 0) && (
              <p className="px-6 py-5 text-sm text-gray-400">Nessun corso presente.</p>
            )}
          </div>
        </div>

        {/* Utenti recenti */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Utenti Recenti</h3>
            <Link href="/super-admin/utenti" className="text-xs font-medium text-blue-600 hover:underline">
              Vedi tutti →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentUsers?.map(u => (
              <Link key={u.id} href={`/super-admin/utenti/${u.id}`} className="flex items-center gap-3 px-6 py-3.5 hover:bg-gray-50 transition group">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: '#003DA5' }}
                >
                  {u.full_name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition truncate">{u.full_name}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ROLE_COLORS[u.role]}`}>
                  {ROLE_LABELS[u.role]}
                </span>
              </Link>
            ))}
            {(!recentUsers || recentUsers.length === 0) && (
              <p className="px-6 py-5 text-sm text-gray-400">Nessun utente presente.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
