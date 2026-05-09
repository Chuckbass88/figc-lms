import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatsCard from '@/components/dashboard/StatsCard'
import {
  Users, BookOpen, MapPin, AlertTriangle, ClipboardCheck,
  ClipboardList, Calendar, UserCheck,
} from 'lucide-react'
import NotificaRischioBtn from './NotificaRischioBtn'
import CorsiAttiviTable from './CorsiAttiviTable'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Admin', admin: 'Admin', docente: 'Docente', studente: 'Corsista',
}
const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin: 'bg-purple-100 text-purple-700',
  docente: 'bg-blue-100 text-blue-700',
  studente: 'bg-green-100 text-green-700',
}

export default async function SuperAdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: myProfile } = user
    ? await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    : { data: null }
  const firstName = myProfile?.full_name?.split(' ')[0] ?? 'Admin'

  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(today)
  endOfWeek.setDate(today.getDate() + 7)

  const [
    { count: totalUsers },
    { count: totalCourses },
    { count: totalStudents },
    { count: totalDocenti },
    { count: totalActiveCourses },
    { count: totalQuizzes },
    { count: totalAttempts },
    { count: passedAttempts },
    { data: recentUsers },
    { data: upcomingSessions },
    { data: upcomingTasksRaw },
    { data: allTasksRaw },
    { data: pendingSubmissionsRaw },
    { data: corsiPerTabella },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('courses').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'studente'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'docente'),
    supabase.from('courses').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('course_quizzes').select('*', { count: 'exact', head: true }),
    supabase.from('quiz_attempts').select('*', { count: 'exact', head: true }),
    supabase.from('quiz_attempts').select('*', { count: 'exact', head: true }).eq('passed', true),
    supabase.from('profiles').select('id, full_name, email, role, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('course_sessions')
      .select('id, title, session_date, course_id, courses(id, name, location, course_enrollments(id, status))')
      .gte('session_date', today.toISOString().split('T')[0])
      .lte('session_date', endOfWeek.toISOString().split('T')[0])
      .order('session_date', { ascending: true })
      .limit(10),
    supabase.from('course_tasks')
      .select('id, title, due_date, course_id, courses(name)')
      .gte('due_date', today.toISOString().split('T')[0])
      .lte('due_date', endOfWeek.toISOString().split('T')[0])
      .order('due_date', { ascending: true })
      .limit(8),
    supabase.from('course_tasks').select('id, title, course_id, courses(name)').limit(500),
    supabase.from('task_submissions').select('task_id').is('grade', null),
    supabase.from('courses')
      .select(`
        id, name, status, regione, tipo_corso, cu_number, cu_url,
        course_instructors(profiles(full_name))
      `)
      .eq('status', 'active')
      .order('name', { ascending: true }),
  ])

  // --- Mappa corsi per tabella ---
  const corsiMappati = (corsiPerTabella ?? []).map(c => {
    const instructors = (c.course_instructors as unknown as { profiles: { full_name: string } | null }[]) ?? []
    return {
      id: c.id,
      name: c.name,
      regione: (c as any).regione as string | null ?? null,
      tipo_corso: (c as any).tipo_corso as string | null ?? null,
      cu_number: (c as any).cu_number as string | null ?? null,
      cu_url: (c as any).cu_url as string | null ?? null,
      docente: instructors[0]?.profiles?.full_name ?? null,
    }
  })

  // --- Task in attesa di valutazione ---
  const pendingCountByTask = new Map<string, number>()
  for (const s of pendingSubmissionsRaw ?? []) {
    pendingCountByTask.set(s.task_id, (pendingCountByTask.get(s.task_id) ?? 0) + 1)
  }
  const totalPendingEvaluations = pendingSubmissionsRaw?.length ?? 0
  const pendingTasksList = (allTasksRaw ?? [])
    .filter(t => (pendingCountByTask.get(t.id) ?? 0) > 0)
    .map(t => ({
      id: t.id,
      title: t.title,
      course_id: t.course_id,
      course_name: (t.courses as unknown as { name: string } | null)?.name ?? '',
      count: pendingCountByTask.get(t.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  // --- Corsisti a rischio ---
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

    const sessionsByCourseMap: Record<string, string[]> = {}
    for (const s of allSessions ?? []) {
      if (!sessionsByCourseMap[s.course_id]) sessionsByCourseMap[s.course_id] = []
      sessionsByCourseMap[s.course_id].push(s.id)
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
        for (const sid of sessionsByCourseMap[cid] ?? []) {
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

  const hasScadenze = (upcomingSessions && upcomingSessions.length > 0) || ((upcomingTasksRaw ?? []).length > 0)
  const scadenzeCount = (upcomingSessions?.length ?? 0) + (upcomingTasksRaw?.length ?? 0)

  const greeting = now.getHours() < 12 ? 'Buongiorno' : now.getHours() < 18 ? 'Buon pomeriggio' : 'Buonasera'
  const todayLabel = today.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-7">

      {/* ── Saluto + Azioni rapide ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{greeting}, {firstName} 👋</h2>
          <p className="text-sm text-gray-400 mt-0.5 capitalize">{todayLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/super-admin/corsi?new=1" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white hover:opacity-90 transition" style={{ backgroundColor: '#1565C0' }}>
            <BookOpen size={13} /> Crea corso
          </Link>
          <Link href="/super-admin/utenti?new=1" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-green-100 text-green-800 hover:bg-green-200 transition">
            <Users size={13} /> Aggiungi utente
          </Link>
          <Link href="/super-admin/sessioni" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition">
            <Calendar size={13} /> Sessioni
          </Link>
          <Link href="/super-admin/report" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition">
            <UserCheck size={13} /> Report
          </Link>
        </div>
      </div>

      {/* ── Statistiche ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Utenti totali"
          value={totalUsers ?? 0}
          icon={<Users size={20} />}
          variant="blue"
          subtitle={`${totalDocenti ?? 0} docenti · ${totalStudents ?? 0} corsisti`}
        />
        <StatsCard
          title="Corsi"
          value={totalCourses ?? 0}
          icon={<BookOpen size={20} />}
          variant="green"
          subtitle={`${totalActiveCourses ?? 0} attivi in questo momento`}
        />
        <StatsCard
          title="Task in attesa"
          value={totalPendingEvaluations}
          icon={<ClipboardCheck size={20} />}
          variant={totalPendingEvaluations > 0 ? 'amber' : 'green'}
          subtitle={totalPendingEvaluations > 0 ? 'consegne da valutare' : 'nessuna consegna in attesa'}
        />
        <StatsCard
          title="Quiz"
          value={totalQuizzes ?? 0}
          icon={<ClipboardList size={20} />}
          variant="purple"
          subtitle={
            (totalAttempts ?? 0) > 0
              ? `${passedAttempts ?? 0}/${totalAttempts} tentativi superati`
              : 'nessun tentativo ancora'
          }
        />
      </div>

      {/* ── Widget summary + Tabella corsi ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(27,55,104,0.1)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: 'rgba(27,55,104,0.6)' }}>Corsi attivi</p>
          <p className="text-2xl font-bold" style={{ color: '#1B3768' }}>{totalActiveCourses ?? 0}</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(27,55,104,0.5)' }}>in corso adesso</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(27,55,104,0.1)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: 'rgba(27,55,104,0.6)' }}>Scadenze prossime</p>
          <p className="text-2xl font-bold" style={{ color: '#1B3768' }}>{scadenzeCount}</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(27,55,104,0.5)' }}>entro 7 giorni</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(27,55,104,0.1)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: 'rgba(27,55,104,0.6)' }}>Task da valutare</p>
          <p className="text-2xl font-bold" style={{ color: '#1B3768' }}>{totalPendingEvaluations}</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(27,55,104,0.5)' }}>risposte in attesa</p>
        </div>
      </div>

      <CorsiAttiviTable corsi={corsiMappati} />

      {/* ── 2. Scadenze prossimi 7 giorni (sessioni + task) ── */}
      {hasScadenze && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-blue-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Scadenze prossimi 7 giorni</h3>
            </div>
            <Link href="/super-admin/sessioni" className="text-xs font-medium text-blue-600 hover:underline">
              Vedi sessioni →
            </Link>
          </div>

          {/* Sessioni */}
          {(upcomingSessions ?? []).length > 0 && (
            <>
              <div className="px-6 py-2 bg-gray-50 border-b border-gray-100">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  Sessioni — {upcomingSessions!.length} pianificate
                </p>
              </div>
              <div className="divide-y divide-gray-50">
                {upcomingSessions!.map(s => {
                  const course = s.courses as unknown as { id: string; name: string; location: string | null; course_enrollments: { id: string; status: string }[] } | null
                  const activeStudents = course?.course_enrollments?.filter(e => e.status === 'active').length ?? 0
                  const sessionDate = new Date(s.session_date)
                  const isToday = sessionDate.toDateString() === new Date().toDateString()
                  return (
                    <Link
                      key={s.id}
                      href={`/super-admin/corsi/${course?.id ?? s.course_id}/presenze`}
                      className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition group"
                    >
                      <div className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${isToday ? 'bg-blue-600' : 'bg-gray-100'}`}>
                        <span className={`text-sm font-black leading-none ${isToday ? 'text-white' : 'text-gray-700'}`}>
                          {sessionDate.getDate()}
                        </span>
                        <span className={`text-[9px] font-semibold uppercase ${isToday ? 'text-blue-200' : 'text-gray-400'}`}>
                          {sessionDate.toLocaleDateString('it-IT', { month: 'short' })}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition truncate">{s.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
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
                        <span>{activeStudents} iscritti</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </>
          )}

          {/* Task in scadenza */}
          {(upcomingTasksRaw ?? []).length > 0 && (
            <>
              <div className={`px-6 py-2 bg-gray-50 border-b border-gray-100 ${(upcomingSessions ?? []).length > 0 ? 'border-t' : ''}`}>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  Task in scadenza — {(upcomingTasksRaw ?? []).length} in arrivo
                </p>
              </div>
              <div className="divide-y divide-gray-50">
                {(upcomingTasksRaw ?? []).map(task => {
                  const courseName = (task.courses as unknown as { name: string } | null)?.name
                  const dueDate = new Date(task.due_date)
                  const isToday = dueDate.toDateString() === new Date().toDateString()
                  const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <Link
                      key={task.id}
                      href={`/super-admin/corsi/${task.course_id}/task/${task.id}`}
                      className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition group"
                    >
                      <div className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${isToday ? 'bg-amber-500' : 'bg-amber-50'}`}>
                        <span className={`text-sm font-black leading-none ${isToday ? 'text-white' : 'text-amber-700'}`}>
                          {dueDate.getDate()}
                        </span>
                        <span className={`text-[9px] font-semibold uppercase ${isToday ? 'text-amber-100' : 'text-amber-400'}`}>
                          {dueDate.toLocaleDateString('it-IT', { month: 'short' })}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition truncate">{task.title}</p>
                        <p className="text-xs text-gray-400 truncate">{courseName}</p>
                      </div>
                      <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${daysLeft <= 1 ? 'bg-red-100 text-red-600' : daysLeft <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                        {daysLeft === 0 ? 'Oggi' : daysLeft === 1 ? 'Domani' : `${daysLeft} giorni`}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── 3. Task in attesa di valutazione ── */}
      {pendingTasksList.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={15} className="text-amber-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Task in attesa di valutazione</h3>
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                {totalPendingEvaluations} consegne
              </span>
            </div>
            <Link href="/super-admin/task" className="text-xs font-medium text-blue-600 hover:underline">
              Panoramica task →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingTasksList.map(task => (
              <Link
                key={task.id}
                href={`/super-admin/corsi/${task.course_id}/task/${task.id}`}
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <ClipboardCheck size={15} className="text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition truncate">{task.title}</p>
                  <p className="text-xs text-gray-400 truncate">{task.course_name}</p>
                </div>
                <span className="flex-shrink-0 text-xs font-bold bg-red-100 text-red-600 px-2.5 py-1 rounded-full">
                  {task.count} da valutare
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Corsisti a rischio ── */}
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
                  style={{ backgroundColor: '#1565C0' }}
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
                  <span className="text-xs text-gray-400">{s.present}/{s.total} sessioni</span>
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

      {/* ── Ultimi utenti registrati ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">Ultimi utenti registrati</h3>
          <Link href="/super-admin/utenti" className="text-xs font-medium text-blue-600 hover:underline">
            Vedi tutti →
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recentUsers?.map(u => (
            <Link key={u.id} href={`/super-admin/utenti/${u.id}`} className="flex items-center gap-3 px-6 py-3.5 hover:bg-gray-50 transition group">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: '#1565C0' }}
              >
                {(u.full_name ?? '?').charAt(0)}
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
  )
}
