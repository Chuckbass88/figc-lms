import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MapPin, Calendar, Users, ClipboardList, ClipboardCheck, BookMarked } from 'lucide-react'
import NuovaSessioneBtn from './NuovaSessioneBtn'

export default async function DocenteCorsi() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: myCoursesData } = await supabase
    .from('course_instructors')
    .select(`
      courses(
        id, name, description, location, status, start_date, end_date, category,
        course_enrollments(id, student_id, status)
      )
    `)
    .eq('instructor_id', user.id)

  const courses = myCoursesData?.map(r => r.courses).filter(Boolean) as unknown as {
    id: string
    name: string
    description: string | null
    location: string | null
    status: string
    start_date: string | null
    end_date: string | null
    category: string | null
    course_enrollments: { id: string; student_id: string; status: string }[]
  }[] ?? []

  const courseIds = courses.map(c => c.id)

  // Quiz count per corso
  const quizCountByCourse = new Map<string, number>()
  if (courseIds.length > 0) {
    const { data: courseQuizzes } = await supabase
      .from('course_quizzes')
      .select('id, course_id')
      .in('course_id', courseIds)
    for (const q of courseQuizzes ?? []) {
      quizCountByCourse.set(q.course_id, (quizCountByCourse.get(q.course_id) ?? 0) + 1)
    }
  }

  // Fetch task con submissions senza voto (valutazioni in sospeso)
  const pendingEvalByCourse = new Map<string, number>()
  if (courseIds.length > 0) {
    const { data: courseTasks } = await supabase
      .from('course_tasks')
      .select('id, course_id')
      .in('course_id', courseIds)

    if (courseTasks && courseTasks.length > 0) {
      const taskIdToCourseId = new Map(courseTasks.map(t => [t.id, t.course_id]))
      const { data: pendingSubs } = await supabase
        .from('task_submissions')
        .select('task_id')
        .in('task_id', courseTasks.map(t => t.id))
        .is('grade', null)

      for (const s of pendingSubs ?? []) {
        const cid = taskIdToCourseId.get(s.task_id)
        if (cid) pendingEvalByCourse.set(cid, (pendingEvalByCourse.get(cid) ?? 0) + 1)
      }
    }
  }

  // Fetch sessioni e presenze per statistiche
  const { data: sessions } = courseIds.length > 0
    ? await supabase
        .from('course_sessions')
        .select('id, course_id, attendances(student_id, present)')
        .in('course_id', courseIds)
    : { data: [] }

  // Calcola per ogni corso: media % presenze
  type SessionWithAtt = { id: string; course_id: string; attendances: { student_id: string; present: boolean }[] }
  const sessionsByCourse = new Map<string, SessionWithAtt[]>()
  for (const s of (sessions ?? []) as SessionWithAtt[]) {
    if (!sessionsByCourse.has(s.course_id)) sessionsByCourse.set(s.course_id, [])
    sessionsByCourse.get(s.course_id)!.push(s)
  }

  function courseStats(courseId: string, activeStudentIds: string[]) {
    const sess = sessionsByCourse.get(courseId) ?? []
    if (sess.length === 0 || activeStudentIds.length === 0) return null
    const totalPossible = sess.length * activeStudentIds.length
    const totalPresent = sess.reduce((sum, s) => sum + s.attendances.filter(a => a.present).length, 0)
    const idonei = activeStudentIds.filter(sid => {
      const present = sess.filter(s => s.attendances.find(a => a.student_id === sid && a.present)).length
      return sess.length > 0 && Math.round((present / sess.length) * 100) >= 75
    }).length
    return {
      sessions: sess.length,
      pct: Math.round((totalPresent / totalPossible) * 100),
      idonei,
      total: activeStudentIds.length,
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">I Miei Corsi</h2>
        <p className="text-gray-500 text-sm mt-1">{courses.length} {courses.length === 1 ? 'corso assegnato' : 'corsi assegnati'}</p>
      </div>

      {courses.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400">Nessun corso assegnato al momento.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {courses.map(course => {
          const activeEnrollments = course.course_enrollments?.filter(e => e.status === 'active') ?? []
          const stats = courseStats(course.id, activeEnrollments.map(e => e.student_id))

          return (
            <div key={course.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/docente/corsi/${course.id}`}
                    className="font-bold text-gray-900 text-base hover:text-blue-700 transition leading-tight block"
                  >
                    {course.name}
                  </Link>
                  {course.description && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{course.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                  {course.category && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700">
                      {course.category}
                    </span>
                  )}
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    course.status === 'active' ? 'bg-green-100 text-green-700' :
                    course.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {course.status === 'active' ? 'Attivo' : course.status === 'completed' ? 'Completato' : 'Bozza'}
                  </span>
                </div>
              </div>

              {/* Meta info */}
              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                {course.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={12} className="text-gray-400" /> {course.location}
                  </span>
                )}
                {course.start_date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-gray-400" />
                    {new Date(course.start_date).toLocaleDateString('it-IT')}
                    {course.end_date && ` — ${new Date(course.end_date).toLocaleDateString('it-IT')}`}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Users size={12} className="text-gray-400" /> {activeEnrollments.length} corsisti
                </span>
              </div>

              {/* Statistiche presenze */}
              {stats ? (
                <div className="bg-gray-50 rounded-lg px-3 py-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{stats.sessions} sessioni</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${stats.idonei === stats.total ? 'bg-green-100 text-green-700' : stats.idonei > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                        {stats.idonei}/{stats.total} idonei
                      </span>
                      <span className={`text-xs font-bold ${stats.pct >= 75 ? 'text-green-700' : stats.pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                        {stats.pct}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${stats.pct >= 75 ? 'bg-green-500' : stats.pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${stats.pct}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-400">
                  Nessuna sessione registrata
                </div>
              )}

              {/* Azioni */}
              <div className="flex gap-2 pt-1 border-t border-gray-100">
                <Link
                  href={`/docente/corsi/${course.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition"
                >
                  Dettaglio
                </Link>
                <NuovaSessioneBtn courseId={course.id} courseName={course.name} />
                <Link
                  href={`/docente/corsi/${course.id}/task`}
                  className="relative flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
                >
                  <ClipboardCheck size={12} /> Task
                  {(pendingEvalByCourse.get(course.id) ?? 0) > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {pendingEvalByCourse.get(course.id)}
                    </span>
                  )}
                </Link>
                <Link
                  href={`/docente/corsi/${course.id}/quiz`}
                  className="relative flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 transition"
                >
                  <BookMarked size={12} /> Quiz
                  {(quizCountByCourse.get(course.id) ?? 0) > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-green-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {quizCountByCourse.get(course.id)}
                    </span>
                  )}
                </Link>
                <Link
                  href={`/docente/corsi/${course.id}/presenze`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white hover:opacity-90 transition"
                  style={{ backgroundColor: '#1565C0' }}
                >
                  <ClipboardList size={12} /> Presenze
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
