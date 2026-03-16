import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatsCard from '@/components/dashboard/StatsCard'
import { BookOpen, GraduationCap, Calendar, ClipboardList, AlertTriangle, ClipboardCheck, Megaphone, CheckCircle, XCircle } from 'lucide-react'

export default async function DocenteDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: myCoursesData } = await supabase
    .from('course_instructors')
    .select('course_id, courses(id, name, location, status, start_date, end_date)')
    .eq('instructor_id', user.id)

  const myCourses = myCoursesData?.map(r => r.courses).filter(Boolean) as unknown as {
    id: string; name: string; location: string | null; status: string; start_date: string | null; end_date: string | null
  }[] ?? []

  const courseIds = myCourses.map(c => c.id)

  const [
    { count: totalStudents },
    upcomingResult,
    recentResult,
  ] = await Promise.all([
    courseIds.length > 0
      ? supabase.from('course_enrollments').select('*', { count: 'exact', head: true }).in('course_id', courseIds).eq('status', 'active')
      : Promise.resolve({ count: 0 }),
    courseIds.length > 0
      ? supabase.from('course_sessions')
          .select('id, title, session_date, course_id, courses(name)')
          .in('course_id', courseIds)
          .gte('session_date', new Date().toISOString().split('T')[0])
          .order('session_date', { ascending: true })
          .limit(5)
      : Promise.resolve({ data: [] }),
    courseIds.length > 0
      ? supabase.from('course_sessions')
          .select('id, title, session_date, course_id, courses(name), attendances(present)')
          .in('course_id', courseIds)
          .lt('session_date', new Date().toISOString().split('T')[0])
          .order('session_date', { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
  ])

  const upcomingSessions = (upcomingResult as { data: {
    id: string; title: string; session_date: string; course_id: string; courses: { name: string } | null
  }[] | null }).data ?? []

  const recentSessions = (recentResult as { data: {
    id: string; title: string; session_date: string; course_id: string;
    courses: { name: string } | null; attendances: { present: boolean }[]
  }[] | null }).data ?? []

  // Valutazioni in sospeso (task submissions senza grade)
  type PendingEval = { task_id: string; task_title: string; course_id: string; course_name: string; count: number }
  const pendingEvals: PendingEval[] = []
  if (courseIds.length > 0) {
    const { data: myTasks } = await supabase
      .from('course_tasks')
      .select('id, title, course_id, courses(name)')
      .in('course_id', courseIds)

    if (myTasks && myTasks.length > 0) {
      const { data: unsubs } = await supabase
        .from('task_submissions')
        .select('task_id')
        .in('task_id', myTasks.map(t => t.id))
        .is('grade', null)

      const countByTask = new Map<string, number>()
      for (const s of unsubs ?? []) {
        countByTask.set(s.task_id, (countByTask.get(s.task_id) ?? 0) + 1)
      }
      for (const task of myTasks) {
        const count = countByTask.get(task.id) ?? 0
        if (count > 0) {
          pendingEvals.push({
            task_id: task.id,
            task_title: task.title,
            course_id: task.course_id,
            course_name: (task.courses as unknown as { name: string } | null)?.name ?? '',
            count,
          })
        }
      }
      pendingEvals.sort((a, b) => b.count - a.count)
    }
  }

  // Corsisti a rischio (< 75% presenze)
  const atRiskStudents: { id: string; full_name: string; pct: number; present: number; total: number }[] = []
  if (courseIds.length > 0) {
    const [{ data: enrollmentsData }, { data: sessionsData }] = await Promise.all([
      supabase.from('course_enrollments')
        .select('course_id, student_id, profiles(id, full_name)')
        .in('course_id', courseIds)
        .eq('status', 'active'),
      supabase.from('course_sessions').select('id, course_id').in('course_id', courseIds),
    ])

    const sessionIds = (sessionsData ?? []).map(s => s.id)
    const { data: attendancesData } = sessionIds.length > 0
      ? await supabase.from('attendances').select('session_id, student_id, present').in('session_id', sessionIds)
      : { data: [] }

    const sessionsByCourse: Record<string, string[]> = {}
    for (const s of sessionsData ?? []) {
      if (!sessionsByCourse[s.course_id]) sessionsByCourse[s.course_id] = []
      sessionsByCourse[s.course_id].push(s.id)
    }

    const attMap: Record<string, boolean> = {}
    for (const a of attendancesData ?? []) {
      attMap[`${a.session_id}:${a.student_id}`] = a.present
    }

    // Corsi per studente
    const coursesByStudent: Record<string, string[]> = {}
    const studentNames: Record<string, string> = {}
    for (const e of enrollmentsData ?? []) {
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

  // Quiz recenti nei propri corsi
  const { data: recentQuizzes } = courseIds.length > 0
    ? await supabase
        .from('course_quizzes')
        .select('id, title, course_id, passing_score, created_at, courses(name)')
        .in('course_id', courseIds)
        .order('created_at', { ascending: false })
        .limit(4)
    : { data: [] }

  const recentQuizIds = (recentQuizzes ?? []).map(q => q.id)
  const { data: recentQuizAttempts } = recentQuizIds.length > 0
    ? await supabase.from('quiz_attempts').select('quiz_id, passed').in('quiz_id', recentQuizIds)
    : { data: [] }

  const quizAttemptStats = new Map<string, { total: number; passed: number }>()
  for (const a of recentQuizAttempts ?? []) {
    if (!quizAttemptStats.has(a.quiz_id)) quizAttemptStats.set(a.quiz_id, { total: 0, passed: 0 })
    const s = quizAttemptStats.get(a.quiz_id)!
    s.total++
    if (a.passed) s.passed++
  }

  // Ultimi annunci nei propri corsi
  const { data: recentAnnunci } = courseIds.length > 0
    ? await supabase
        .from('course_announcements')
        .select('id, title, created_at, course_id, courses(name)')
        .in('course_id', courseIds)
        .order('created_at', { ascending: false })
        .limit(4)
    : { data: [] }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">La Mia Area Docente</h2>
        <p className="text-gray-500 text-sm mt-1">Gestisci i tuoi corsi e i corsisti</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard title="Corsi Assegnati" value={myCourses.length} icon={<BookOpen size={20} />} variant="blue" />
        <StatsCard title="Corsisti Totali" value={totalStudents ?? 0} icon={<GraduationCap size={20} />} variant="green" />
        <StatsCard title="Corsi Attivi" value={myCourses.filter(c => c.status === 'active').length} icon={<Calendar size={20} />} variant="amber" />
        <StatsCard
          title="Valutazioni in sospeso"
          value={pendingEvals.reduce((s, e) => s + e.count, 0)}
          icon={<ClipboardCheck size={20} />}
          variant={pendingEvals.length > 0 ? 'red' : 'green'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Prossime sessioni */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Calendar size={15} className="text-blue-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Prossime Sessioni</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {upcomingSessions.map(s => (
              <Link
                key={s.id}
                href={`/docente/corsi/${s.course_id}/presenze`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition group"
              >
                <div className="flex-shrink-0 w-10 text-center">
                  <p className="text-lg font-bold text-gray-900 leading-none">
                    {new Date(s.session_date).toLocaleDateString('it-IT', { day: '2-digit' })}
                  </p>
                  <p className="text-xs text-gray-400 uppercase">
                    {new Date(s.session_date).toLocaleDateString('it-IT', { month: 'short' })}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition truncate">{s.title}</p>
                  <p className="text-xs text-gray-400 truncate">{s.courses?.name}</p>
                </div>
                <ClipboardList size={14} className="text-gray-300 group-hover:text-blue-500 transition flex-shrink-0" />
              </Link>
            ))}
            {upcomingSessions.length === 0 && (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">Nessuna sessione pianificata.</p>
            )}
          </div>
        </div>

        {/* Sessioni recenti con presenze */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <ClipboardList size={15} className="text-green-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Sessioni Recenti</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {recentSessions.map(s => {
              const presentCount = s.attendances.filter(a => a.present).length
              const totalCount = s.attendances.length
              const pct = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : null
              return (
                <Link
                  key={s.id}
                  href={`/docente/corsi/${s.course_id}/presenze`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition group"
                >
                  <div className="flex-shrink-0 w-10 text-center">
                    <p className="text-lg font-bold text-gray-900 leading-none">
                      {new Date(s.session_date).toLocaleDateString('it-IT', { day: '2-digit' })}
                    </p>
                    <p className="text-xs text-gray-400 uppercase">
                      {new Date(s.session_date).toLocaleDateString('it-IT', { month: 'short' })}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition truncate">{s.title}</p>
                    <p className="text-xs text-gray-400 truncate">{s.courses?.name}</p>
                  </div>
                  {pct !== null ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-xs font-bold ${pct >= 75 ? 'text-green-700' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                        {pct}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 flex-shrink-0">—</span>
                  )}
                </Link>
              )
            })}
            {recentSessions.length === 0 && (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">Nessuna sessione passata.</p>
            )}
          </div>
        </div>
      </div>

      {/* Corsisti a rischio */}
      {atRiskStudents.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-100 flex items-center gap-2 bg-amber-50">
            <AlertTriangle size={15} className="text-amber-600" />
            <h3 className="font-semibold text-amber-900 text-sm">Corsisti a rischio</h3>
            <span className="ml-auto text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
              {atRiskStudents.length} sotto 75%
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {atRiskStudents.slice(0, 5).map(s => (
              <Link
                key={s.id}
                href={`/docente/corsisti/${s.id}`}
                className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition group"
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
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                    Non idoneo
                  </span>
                </div>
              </Link>
            ))}
          </div>
          {atRiskStudents.length > 5 && (
            <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100">
              <Link href="/docente/corsisti" className="text-xs text-blue-600 hover:underline">
                +{atRiskStudents.length - 5} altri corsisti a rischio →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Valutazioni in sospeso */}
      {pendingEvals.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <ClipboardCheck size={15} className="text-amber-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Valutazioni in sospeso</h3>
            <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
              {pendingEvals.reduce((s, e) => s + e.count, 0)} consegne
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingEvals.map(e => (
              <Link
                key={e.task_id}
                href={`/docente/corsi/${e.course_id}/task/${e.task_id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <ClipboardCheck size={15} className="text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition truncate">{e.task_title}</p>
                  <p className="text-xs text-gray-400 truncate">{e.course_name}</p>
                </div>
                <span className="flex-shrink-0 text-xs font-bold bg-red-100 text-red-600 px-2.5 py-1 rounded-full">
                  {e.count} da valutare
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Ultimi annunci */}
      {(recentAnnunci ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone size={15} className="text-indigo-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Ultimi annunci pubblicati</h3>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {(recentAnnunci ?? []).map(a => {
              const courseName = (a.courses as unknown as { name: string } | null)?.name
              return (
                <Link
                  key={a.id}
                  href={`/docente/corsi/${a.course_id}/annunci`}
                  className="flex items-start gap-4 px-5 py-3.5 hover:bg-gray-50 transition group"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Megaphone size={13} className="text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition truncate">{a.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {courseName} · {new Date(a.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Quiz recenti */}
      {(recentQuizzes ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <ClipboardCheck size={15} className="text-green-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Quiz recenti</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {(recentQuizzes ?? []).map(q => {
              const courseName = (q.courses as unknown as { name: string } | null)?.name
              const stats = quizAttemptStats.get(q.id) ?? { total: 0, passed: 0 }
              return (
                <Link
                  key={q.id}
                  href={`/docente/corsi/${q.course_id}/quiz/${q.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition truncate">{q.title}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{courseName} · soglia {q.passing_score}%</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                    {stats.total > 0 ? (
                      <>
                        <span className="text-gray-500">{stats.total} completati</span>
                        <span className="flex items-center gap-1 text-green-600 font-medium">
                          <CheckCircle size={11} /> {stats.passed}
                        </span>
                        {stats.total - stats.passed > 0 && (
                          <span className="flex items-center gap-1 text-red-500 font-medium">
                            <XCircle size={11} /> {stats.total - stats.passed}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400">Nessun tentativo</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* I miei corsi */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">I Miei Corsi</h3>
          <Link href="/docente/corsi" className="text-xs font-medium text-blue-600 hover:underline">Vedi dettagli →</Link>
        </div>
        <div className="divide-y divide-gray-50">
          {myCourses.map(course => (
            <Link
              key={course.id}
              href={`/docente/corsi/${course.id}`}
              className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition group"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition truncate">{course.name}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {course.location ?? '—'} · {course.start_date ? new Date(course.start_date).toLocaleDateString('it-IT') : 'Data TBD'}
                </p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ml-3 ${
                course.status === 'active' ? 'bg-green-100 text-green-700' :
                course.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {course.status === 'active' ? 'Attivo' : course.status === 'draft' ? 'Bozza' : 'Completato'}
              </span>
            </Link>
          ))}
          {myCourses.length === 0 && (
            <p className="px-6 py-6 text-sm text-gray-400 text-center">Nessun corso assegnato al momento.</p>
          )}
        </div>
      </div>
    </div>
  )
}
