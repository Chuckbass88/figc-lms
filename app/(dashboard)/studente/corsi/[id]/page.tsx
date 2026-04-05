import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, MapPin, Calendar, UserCheck, BookMarked, ClipboardList, Clock, Award, ClipboardCheck, Megaphone, TrendingUp, CheckCircle, Star } from 'lucide-react'
import MaterialiClient from '@/components/materiali/MaterialiClient'

const STATUS_LABELS: Record<string, string> = { active: 'In Corso', completed: 'Completato', draft: 'Bozza' }
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  draft: 'bg-amber-100 text-amber-700',
}

export default async function StudenteCourseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Verifica iscrizione
  const { data: enrollment } = await supabase
    .from('course_enrollments')
    .select('status, enrolled_at')
    .eq('course_id', id)
    .eq('student_id', user.id)
    .single()

  if (!enrollment) notFound()

  const today = new Date().toISOString().split('T')[0]

  const [
    { data: course },
    { data: instructors },
    // Trova il gruppo dello studente in QUESTO corso
    { data: myGroupRow },
    { data: materials },
    { data: nextSessions },
    { count: announcementCount },
  ] = await Promise.all([
    supabase.from('courses').select('id, name, description, location, start_date, end_date, status, category').eq('id', id).single(),
    supabase.from('course_instructors')
      .select('profiles(id, full_name, email)')
      .eq('course_id', id),
    supabase.from('course_groups')
      .select(`
        id, name, description,
        course_group_instructors(instructor_id, profiles(full_name)),
        course_group_members!inner(student_id)
      `)
      .eq('course_id', id)
      .eq('course_group_members.student_id', user.id)
      .maybeSingle(),
    supabase.from('course_materials')
      .select('id, name, description, file_url, file_type, file_size, created_at, target_type, target_id')
      .eq('course_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('course_sessions')
      .select('id, title, session_date')
      .eq('course_id', id)
      .gte('session_date', today)
      .order('session_date', { ascending: true })
      .limit(3),
    supabase.from('course_announcements')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', id),
  ])

  // Filtra materiali per target (all | group | student)
  const myGroupId = myGroupRow?.id ?? null
  const visibleMaterials = (materials ?? []).filter(m => {
    const tt = (m as { target_type?: string | null }).target_type ?? 'all'
    const ti = (m as { target_id?: string | null }).target_id ?? null
    if (tt === 'all') return true
    if (tt === 'group') return ti !== null && ti === myGroupId
    if (tt === 'student') return ti !== null && ti === user.id
    return true
  })

  // Progressi quiz e task per questo corso
  const [{ data: courseQuizzes }, { data: courseTasks }] = await Promise.all([
    supabase.from('course_quizzes').select('id').eq('course_id', id),
    supabase.from('course_tasks').select('id').eq('course_id', id),
  ])

  const quizIds = (courseQuizzes ?? []).map(q => q.id)
  const taskIds = (courseTasks ?? []).map(t => t.id)

  const [{ data: myAttempts }, { data: mySubmissions }] = await Promise.all([
    quizIds.length > 0
      ? supabase.from('quiz_attempts').select('quiz_id, passed').eq('student_id', user.id).in('quiz_id', quizIds)
      : Promise.resolve({ data: [] }),
    taskIds.length > 0
      ? supabase.from('task_submissions').select('task_id, grade').eq('student_id', user.id).in('task_id', taskIds)
      : Promise.resolve({ data: [] }),
  ])

  type AttemptRow = { quiz_id: string; passed: boolean }
  type SubRow = { task_id: string; grade: string | null }

  const quizCompletati = (myAttempts as AttemptRow[] ?? []).length
  const quizSuperati = (myAttempts as AttemptRow[] ?? []).filter(a => a.passed).length
  const taskConsegnati = (mySubmissions as SubRow[] ?? []).length
  const taskValutati = (mySubmissions as SubRow[] ?? []).filter(s => s.grade).length

  // Calcola idoneità studente per questo corso
  const { data: allSessions } = await supabase
    .from('course_sessions')
    .select('id, attendances!inner(student_id, present)')
    .eq('course_id', id)
    .eq('attendances.student_id', user.id)

  const totalSessionCount = (await supabase.from('course_sessions').select('id', { count: 'exact', head: true }).eq('course_id', id)).count ?? 0
  const presentSessionCount = (allSessions ?? []).filter(s => (s.attendances as { student_id: string; present: boolean }[]).some(a => a.present)).length
  const attendancePct = totalSessionCount > 0 ? Math.round((presentSessionCount / totalSessionCount) * 100) : null

  if (!course) notFound()

  const docenti = instructors?.map(r => r.profiles).filter(Boolean) as unknown as { id: string; full_name: string; email: string }[] ?? []

  const myGroup = myGroupRow as {
    id: string
    name: string
    description: string | null
    course_group_instructors: { instructor_id: string; profiles: { full_name: string } | null }[]
    course_group_members: { student_id: string }[]
  } | null

  // Compagni di gruppo (solo nel gruppo corrente, escludendo se stesso)
  const { data: groupmates } = myGroup
    ? await supabase
        .from('course_group_members')
        .select('student_id, profiles(full_name)')
        .eq('group_id', myGroup.id)
        .neq('student_id', user.id)
    : { data: [] }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/studente/corsi"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit"
        >
          <ArrowLeft size={15} /> I miei corsi
        </Link>
        <div className="flex items-start gap-3 mb-1 flex-wrap">
          <h2 className="text-2xl font-bold text-gray-900">{course.name}</h2>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium mt-1 flex-shrink-0 ${STATUS_COLORS[course.status]}`}>
            {STATUS_LABELS[course.status]}
          </span>
          {course.category && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium mt-1 flex-shrink-0 bg-indigo-100 text-indigo-700">
              {course.category}
            </span>
          )}
        </div>
        {course.description && (
          <p className="text-gray-500 text-sm">{course.description}</p>
        )}
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <Link
            href={`/studente/corsi/${id}/presenze`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white hover:opacity-90 transition"
            style={{ backgroundColor: '#1565C0' }}
          >
            <ClipboardList size={14} /> Le mie presenze
          </Link>
          <Link
            href={`/studente/corsi/${id}/task`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
          >
            <ClipboardCheck size={14} /> Le mie task
          </Link>
          <Link
            href={`/studente/corsi/${id}/quiz`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 transition"
          >
            <ClipboardCheck size={14} /> Quiz
          </Link>
          <Link
            href={`/studente/corsi/${id}/annunci`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition relative"
          >
            <Megaphone size={14} /> Annunci
            {(announcementCount ?? 0) > 0 && (
              <span className="ml-0.5 text-xs bg-indigo-200 text-indigo-800 px-1.5 py-0 rounded-full font-semibold">
                {announcementCount}
              </span>
            )}
          </Link>
          <Link
            href={`/studente/corsi/${id}/valutazioni`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 transition"
          >
            <Star size={14} /> Le mie valutazioni
          </Link>
          {attendancePct !== null && (
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${attendancePct >= 75 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
              <Award size={12} />
              {attendancePct >= 75 ? 'Idoneo' : 'Non idoneo'} · {attendancePct}%
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      {(course.location || course.start_date) && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex flex-wrap gap-5 text-sm text-gray-600">
            {course.location && (
              <span className="flex items-center gap-2">
                <MapPin size={14} className="text-gray-400" /> {course.location}
              </span>
            )}
            {course.start_date && (
              <span className="flex items-center gap-2">
                <Calendar size={14} className="text-gray-400" />
                {new Date(course.start_date).toLocaleDateString('it-IT')}
                {course.end_date && ` → ${new Date(course.end_date).toLocaleDateString('it-IT')}`}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Prossime sessioni */}
      {nextSessions && nextSessions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Clock size={15} className="text-blue-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Prossime sessioni</h3>
            <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {nextSessions.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {nextSessions.map((s, idx) => {
              const d = new Date(s.session_date)
              const isToday = s.session_date === today
              return (
                <div key={s.id} className={`flex items-center gap-4 px-5 py-3 ${idx === 0 ? 'bg-blue-50/40' : ''}`}>
                  <div className={`flex-shrink-0 w-10 text-center rounded-lg py-1 ${isToday ? 'bg-blue-600' : 'bg-gray-100'}`}>
                    <p className={`text-base font-bold leading-tight ${isToday ? 'text-white' : 'text-gray-900'}`}>
                      {d.toLocaleDateString('it-IT', { day: '2-digit' })}
                    </p>
                    <p className={`text-xs uppercase ${isToday ? 'text-blue-200' : 'text-gray-400'}`}>
                      {d.toLocaleDateString('it-IT', { month: 'short' })}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.title}</p>
                    {isToday && (
                      <span className="text-xs font-semibold text-blue-600">Oggi</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Il mio progresso */}
      {(quizIds.length > 0 || taskIds.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <TrendingUp size={15} className="text-indigo-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Il mio progresso</h3>
          </div>
          <div className={`grid ${quizIds.length > 0 && taskIds.length > 0 ? 'grid-cols-2' : 'grid-cols-1'} divide-x divide-gray-100`}>
            {quizIds.length > 0 && (
              <div className="px-5 py-5 text-center">
                <p className="text-2xl font-bold text-indigo-700">
                  {quizCompletati}<span className="text-base text-gray-400 font-normal">/{quizIds.length}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">Quiz completati</p>
                {quizSuperati > 0 && (
                  <p className="flex items-center justify-center gap-1 text-xs text-green-600 font-medium mt-1.5">
                    <CheckCircle size={11} /> {quizSuperati} superati
                  </p>
                )}
                <Link
                  href={`/studente/corsi/${id}/quiz`}
                  className="text-xs text-indigo-600 hover:underline mt-2 inline-block"
                >
                  Vai ai quiz →
                </Link>
              </div>
            )}
            {taskIds.length > 0 && (
              <div className="px-5 py-5 text-center">
                <p className="text-2xl font-bold text-amber-700">
                  {taskConsegnati}<span className="text-base text-gray-400 font-normal">/{taskIds.length}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">Task consegnati</p>
                {taskValutati > 0 && (
                  <p className="flex items-center justify-center gap-1 text-xs text-green-600 font-medium mt-1.5">
                    <CheckCircle size={11} /> {taskValutati} valutati
                  </p>
                )}
                <Link
                  href={`/studente/corsi/${id}/task`}
                  className="text-xs text-amber-600 hover:underline mt-2 inline-block"
                >
                  Vai ai task →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Il mio gruppo */}
      {myGroup ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Il mio gruppo</p>
            <h3 className="font-bold text-gray-900">{myGroup.name}</h3>
            {myGroup.description && <p className="text-xs text-gray-400 mt-0.5">{myGroup.description}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            {/* Docenti del gruppo */}
            <div className="p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Docenti</p>
              <div className="space-y-1.5">
                {myGroup.course_group_instructors.map(i => (
                  <div key={i.instructor_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-blue-50">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#1565C0' }}>
                      {i.profiles?.full_name.charAt(0) ?? '?'}
                    </div>
                    <span className="text-sm text-gray-800 font-medium">{i.profiles?.full_name}</span>
                  </div>
                ))}
                {myGroup.course_group_instructors.length === 0 && (
                  <p className="text-xs text-gray-400">Nessun docente assegnato al gruppo.</p>
                )}
              </div>
            </div>

            {/* Compagni di gruppo */}
            <div className="p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Compagni</p>
              <div className="space-y-1.5">
                {(groupmates ?? []).map(m => (
                  <div key={m.student_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-green-50">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {(m.profiles as unknown as { full_name: string } | null)?.full_name.charAt(0) ?? '?'}
                    </div>
                    <span className="text-sm text-gray-800 font-medium truncate">
                      {(m.profiles as unknown as { full_name: string } | null)?.full_name}
                    </span>
                  </div>
                ))}
                {(groupmates ?? []).length === 0 && (
                  <p className="text-xs text-gray-400">Nessun compagno nel gruppo.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center">
          <p className="text-sm text-gray-400">Non sei ancora stato assegnato a nessun gruppo per questo corso.</p>
        </div>
      )}

      {/* Materiali */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
          <BookMarked size={15} className="text-amber-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Materiali del corso</h3>
        </div>
        <MaterialiClient courseId={id} initialMaterials={visibleMaterials} canUpload={false} />
      </div>

      {/* Docenti del corso */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <UserCheck size={15} className="text-blue-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Docenti del corso</h3>
          <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            {docenti.length}
          </span>
        </div>
        <div className="divide-y divide-gray-50">
          {docenti.map(d => (
            <div key={d.id} className="px-5 py-3 flex items-center gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#1565C0' }}>
                {d.full_name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{d.full_name}</p>
                <p className="text-xs text-gray-400 truncate">{d.email}</p>
              </div>
            </div>
          ))}
          {docenti.length === 0 && (
            <p className="px-5 py-4 text-sm text-gray-400">Nessun docente assegnato.</p>
          )}
        </div>
      </div>
    </div>
  )
}
