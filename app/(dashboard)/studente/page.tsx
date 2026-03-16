import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatsCard from '@/components/dashboard/StatsCard'
import { BookOpen, CheckCircle, TrendingUp, FileText, Calendar, MapPin, ClipboardCheck, Clock, Megaphone, XCircle } from 'lucide-react'

export default async function StudenteDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select('id, status, enrolled_at, courses(id, name, location, start_date, end_date, status)')
    .eq('student_id', user.id)

  const courses = enrollments?.map(e => ({
    ...(e.courses as unknown as { id: string; name: string; location: string | null; start_date: string | null; end_date: string | null; status: string }),
    enrollmentStatus: e.status,
  })) ?? []

  const activeCourseIds = courses.filter(c => c.enrollmentStatus === 'active').map(c => c.id)
  const activeCount = activeCourseIds.length
  const completedCount = courses.filter(c => c.enrollmentStatus === 'completed').length

  // Fetch sessioni + presenze per calcolare % media
  let avgAttendance: number | null = null
  const courseAttendance: Record<string, { present: number; total: number }> = {}

  if (activeCourseIds.length > 0) {
    const { data: sessions } = await supabase
      .from('course_sessions')
      .select('id, course_id')
      .in('course_id', activeCourseIds)

    const sessionIds = sessions?.map(s => s.id) ?? []

    if (sessionIds.length > 0) {
      const { data: myAttendances } = await supabase
        .from('attendances')
        .select('session_id, present')
        .eq('student_id', user.id)
        .in('session_id', sessionIds)

      const attMap = Object.fromEntries(myAttendances?.map(a => [a.session_id, a.present]) ?? [])

      for (const session of sessions ?? []) {
        if (!courseAttendance[session.course_id]) courseAttendance[session.course_id] = { present: 0, total: 0 }
        courseAttendance[session.course_id].total++
        if (attMap[session.id]) courseAttendance[session.course_id].present++
      }

      const rates = Object.values(courseAttendance).filter(c => c.total > 0).map(c => c.present / c.total)
      if (rates.length > 0) avgAttendance = Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100)
    }
  }

  // Prossime sessioni
  const todayStr = new Date().toISOString().split('T')[0]
  const { data: upcomingSessions } = activeCourseIds.length > 0
    ? await supabase
        .from('course_sessions')
        .select('id, title, session_date, course_id, courses(id, name, location)')
        .in('course_id', activeCourseIds)
        .gte('session_date', todayStr)
        .order('session_date', { ascending: true })
        .limit(5)
    : { data: [] }

  // Ultimi materiali dai corsi attivi
  const { data: recentMaterials } = activeCourseIds.length > 0
    ? await supabase
        .from('course_materials')
        .select('id, name, file_type, file_url, course_id, courses(name)')
        .in('course_id', activeCourseIds)
        .order('created_at', { ascending: false })
        .limit(5)
    : { data: [] }

  // Task in scadenza (non ancora consegnati)
  const todayForTask = new Date().toISOString().split('T')[0]
  const { data: pendingTasks } = activeCourseIds.length > 0
    ? await supabase
        .from('course_tasks')
        .select('id, title, due_date, course_id, courses(name)')
        .in('course_id', activeCourseIds)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(10)
    : { data: [] }

  // Ultimi annunci dai corsi attivi
  const { data: recentAnnunci } = activeCourseIds.length > 0
    ? await supabase
        .from('course_announcements')
        .select('id, title, created_at, course_id, courses(name)')
        .in('course_id', activeCourseIds)
        .order('created_at', { ascending: false })
        .limit(4)
    : { data: [] }

  // Ultimi tentativi quiz dello studente
  const { data: recentQuizAttempts } = await supabase
    .from('quiz_attempts')
    .select('id, score, total, passed, submitted_at, quiz_id, course_quizzes(id, title, course_id, courses(name))')
    .eq('student_id', user.id)
    .order('submitted_at', { ascending: false })
    .limit(4)

  // Filtra solo i task non ancora consegnati dallo studente
  const { data: myTaskSubs } = pendingTasks && pendingTasks.length > 0
    ? await supabase
        .from('task_submissions')
        .select('task_id')
        .eq('student_id', user.id)
        .in('task_id', pendingTasks.map(t => t.id))
    : { data: [] }

  const submittedTaskIds = new Set((myTaskSubs ?? []).map(s => s.task_id))
  const pendingTaskList = (pendingTasks ?? []).filter(t => !submittedTaskIds.has(t.id)).slice(0, 5)
  const pendingTaskCount = pendingTaskList.length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">La Mia Formazione</h2>
        <p className="text-gray-500 text-sm mt-1">Monitora il tuo percorso formativo</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard title="Corsi Iscritto" value={activeCount} icon={<BookOpen size={20} />} variant="blue" />
        <StatsCard title="Corsi Completati" value={completedCount} icon={<CheckCircle size={20} />} variant="green" />
        <StatsCard
          title="Presenze Medie"
          value={avgAttendance !== null ? `${avgAttendance}%` : '—'}
          icon={<TrendingUp size={20} />}
          variant="amber"
        />
        <StatsCard
          title="Task da consegnare"
          value={pendingTaskCount}
          icon={<ClipboardCheck size={20} />}
          variant={pendingTaskCount > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Prossime sessioni */}
      {(upcomingSessions ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-blue-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Prossime Sessioni</h3>
            </div>
            <Link href="/studente/calendario" className="text-xs font-medium text-blue-600 hover:underline">
              Calendario →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {(upcomingSessions ?? []).map(s => {
              const course = s.courses as unknown as { id: string; name: string; location: string | null } | null
              const sessionDate = new Date(s.session_date)
              const isSessionToday = sessionDate.toDateString() === new Date().toDateString()
              return (
                <Link
                  key={s.id}
                  href={`/studente/corsi/${course?.id ?? s.course_id}`}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition group"
                >
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
                  {isSessionToday && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Oggi</span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Task in scadenza */}
      {pendingTaskList.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={15} className="text-amber-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Task da consegnare</h3>
              <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                {pendingTaskCount}
              </span>
            </div>
            <Link href="/studente/task" className="text-xs font-medium text-blue-600 hover:underline">
              Tutti i task →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingTaskList.map(task => {
              const isOverdue = task.due_date && task.due_date < todayForTask
              const courseName = (task.courses as unknown as { name: string } | null)?.name
              return (
                <Link
                  key={task.id}
                  href={`/studente/corsi/${task.course_id}/task/${task.id}`}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition group"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-red-100' : 'bg-amber-50'}`}>
                    <Clock size={14} className={isOverdue ? 'text-red-500' : 'text-amber-600'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition truncate">{task.title}</p>
                    <p className="text-xs text-gray-400 truncate">{courseName}</p>
                  </div>
                  {task.due_date && (
                    <span className={`text-xs font-semibold flex-shrink-0 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                      {isOverdue ? 'Scaduto' : new Date(task.due_date).toLocaleDateString('it-IT')}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Ultimi quiz */}
      {(recentQuizAttempts ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={15} className="text-green-600" />
              <h3 className="font-semibold text-gray-900 text-sm">I miei quiz</h3>
            </div>
            <Link href="/studente/quiz" className="text-xs font-medium text-blue-600 hover:underline">
              Vedi tutti →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {(recentQuizAttempts ?? []).map(a => {
              type QuizInfo = { id: string; title: string; course_id: string; courses: { name: string } | null }
              const quiz = a.course_quizzes as unknown as QuizInfo | null
              const scorePct = Math.round((a.score / a.total) * 100)
              return (
                <Link
                  key={a.id}
                  href={`/studente/corsi/${quiz?.course_id}/quiz/${a.quiz_id}`}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition group"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.passed ? 'bg-green-100' : 'bg-red-100'}`}>
                    {a.passed
                      ? <CheckCircle size={15} className="text-green-600" />
                      : <XCircle size={15} className="text-red-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition truncate">{quiz?.title}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{quiz?.courses?.name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${a.passed ? 'text-green-700' : 'text-red-600'}`}>{scorePct}%</p>
                    <p className="text-xs text-gray-400">{a.score}/{a.total}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Ultimi annunci */}
      {(recentAnnunci ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone size={15} className="text-indigo-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Ultimi annunci</h3>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {(recentAnnunci ?? []).map(a => {
              const courseName = (a.courses as unknown as { name: string } | null)?.name
              return (
                <Link
                  key={a.id}
                  href={`/studente/corsi/${a.course_id}/annunci`}
                  className="flex items-start gap-4 px-6 py-3.5 hover:bg-gray-50 transition group"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Megaphone size={13} className="text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition truncate">{a.title}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {courseName} · {new Date(a.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* I miei corsi con presenze */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">I Miei Corsi</h3>
            <Link href="/studente/corsi" className="text-xs font-medium text-blue-600 hover:underline">Vedi tutti →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {courses.filter(c => c.enrollmentStatus === 'active').map(course => {
              const att = courseAttendance[course.id]
              const pct = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : null
              return (
                <Link
                  key={course.id}
                  href={`/studente/corsi/${course.id}`}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition truncate">{course.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{course.location ?? 'Sede non specificata'}</p>
                  </div>
                  {pct !== null ? (
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={`text-xs font-semibold ${pct >= 75 ? 'text-green-700' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                        {pct}%
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pct >= 75 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {pct >= 75 ? 'Idoneo' : 'A rischio'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 ml-3 flex-shrink-0">Nessuna sessione</span>
                  )}
                </Link>
              )
            })}
            {activeCount === 0 && (
              <p className="px-6 py-6 text-sm text-gray-400 text-center">Non sei iscritto a nessun corso attivo.</p>
            )}
          </div>
        </div>

        {/* Ultimi materiali */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Ultimi Materiali</h3>
            <Link href="/studente/corsi" className="text-xs font-medium text-blue-600 hover:underline">Vai ai corsi →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {(recentMaterials ?? []).map(m => (
              <a
                key={m.id}
                href={m.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-6 py-3.5 hover:bg-gray-50 transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <FileText size={15} className="text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition truncate">{m.name}</p>
                  <p className="text-xs text-gray-400 truncate">{(m.courses as unknown as { name: string } | null)?.name}</p>
                </div>
                <span className="text-xs text-gray-400 uppercase font-medium flex-shrink-0">{m.file_type}</span>
              </a>
            ))}
            {(recentMaterials ?? []).length === 0 && (
              <p className="px-6 py-6 text-sm text-gray-400 text-center">Nessun materiale disponibile.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
