import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, GraduationCap, Mail, Calendar, Shield, TrendingUp, Award, ClipboardList, ClipboardCheck, CheckCircle, XCircle, FileText, UserRound } from 'lucide-react'
import ResetPasswordBtn from './ResetPasswordBtn'
import EliminaUtenteBtn from './EliminaUtenteBtn'
import ToggleAttivazioneBtn from './ToggleAttivazioneBtn'
import RimuoviIscrizioneBtn from './RimuoviIscrizioneBtn'
import IscriviCorsoBtn from './IscriviCorsoBtn'
import CambiaRuoloBtn from './CambiaRuoloBtn'

type UserRole = 'super_admin' | 'docente' | 'studente'

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  docente: 'Docente',
  studente: 'Corsista',
}

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  docente: 'bg-blue-100 text-blue-700',
  studente: 'bg-green-100 text-green-700',
}

const COURSE_STATUS_LABELS: Record<string, string> = {
  active: 'Attivo',
  draft: 'Bozza',
  archived: 'Archiviato',
  completed: 'Completato',
}

const COURSE_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-500',
  archived: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
}

const ENROLLMENT_STATUS_LABELS: Record<string, string> = {
  active: 'Iscritto',
  pending: 'In attesa',
  completed: 'Completato',
  dropped: 'Ritirato',
}

const ENROLLMENT_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  dropped: 'bg-red-100 text-red-600',
}

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, is_active, created_at')
    .eq('id', id)
    .single()

  if (!profile) notFound()

  // Fetch enrollments with course data
  const { data: enrollmentsData } = await supabase
    .from('course_enrollments')
    .select('id, status, enrolled_at, courses(id, name, status)')
    .eq('student_id', id)

  const enrollments = (enrollmentsData ?? []) as unknown as {
    id: string
    status: string
    enrolled_at: string
    courses: { id: string; name: string; status: string } | null
  }[]

  const courseIds = enrollments.map(e => e.courses?.id).filter(Boolean) as string[]

  // Corsi disponibili per iscrizione (solo per corsisti)
  let availableCourses: { id: string; name: string }[] = []
  if (profile.role === 'studente') {
    const { data: allActiveCourses } = await supabase
      .from('courses')
      .select('id, name')
      .eq('status', 'active')
      .order('name')
    availableCourses = (allActiveCourses ?? []).filter(c => !courseIds.includes(c.id))
  }

  // Fetch sessions for those courses
  const sessionsData = courseIds.length > 0
    ? (await supabase.from('course_sessions').select('id, course_id').in('course_id', courseIds)).data ?? []
    : []

  const sessionIds = sessionsData.map(s => s.id)

  // Fetch attendances for this user
  const attendancesData = sessionIds.length > 0
    ? (await supabase
        .from('attendances')
        .select('session_id, present')
        .eq('student_id', id)
        .in('session_id', sessionIds)
      ).data ?? []
    : []

  // Compute per-course attendance
  const sessionsByCourse: Record<string, string[]> = {}
  for (const s of sessionsData) {
    if (!sessionsByCourse[s.course_id]) sessionsByCourse[s.course_id] = []
    sessionsByCourse[s.course_id].push(s.id)
  }

  function getAttendance(courseId: string): { present: number; total: number } | null {
    const courseSessions = sessionsByCourse[courseId] ?? []
    if (courseSessions.length === 0) return null
    const present = attendancesData.filter(
      a => courseSessions.includes(a.session_id) && a.present
    ).length
    return { present, total: courseSessions.length }
  }

  // Quiz + task per corsisti
  let quizStatsByCourse: Record<string, { total: number; completed: number; passed: number }> = {}
  let taskStatsByCourse: Record<string, { total: number; submitted: number }> = {}

  if (profile.role === 'studente' && courseIds.length > 0) {
    const [{ data: courseQuizzes }, { data: courseTasks }] = await Promise.all([
      supabase.from('course_quizzes').select('id, course_id').in('course_id', courseIds),
      supabase.from('course_tasks').select('id, course_id').in('course_id', courseIds),
    ])

    const quizIds = (courseQuizzes ?? []).map(q => q.id)
    const taskIds = (courseTasks ?? []).map(t => t.id)

    const [{ data: attempts }, { data: submissions }] = await Promise.all([
      quizIds.length > 0
        ? supabase.from('quiz_attempts').select('quiz_id, passed').eq('student_id', id).in('quiz_id', quizIds)
        : Promise.resolve({ data: [] }),
      taskIds.length > 0
        ? supabase.from('task_submissions').select('task_id').eq('student_id', id).in('task_id', taskIds)
        : Promise.resolve({ data: [] }),
    ])

    const attemptsByQuiz = new Map((attempts ?? []).map(a => [a.quiz_id, a]))
    const submittedTaskIds = new Set((submissions ?? []).map(s => s.task_id))

    for (const q of courseQuizzes ?? []) {
      if (!quizStatsByCourse[q.course_id]) quizStatsByCourse[q.course_id] = { total: 0, completed: 0, passed: 0 }
      quizStatsByCourse[q.course_id].total++
      const attempt = attemptsByQuiz.get(q.id)
      if (attempt) {
        quizStatsByCourse[q.course_id].completed++
        if (attempt.passed) quizStatsByCourse[q.course_id].passed++
      }
    }
    for (const t of courseTasks ?? []) {
      if (!taskStatsByCourse[t.course_id]) taskStatsByCourse[t.course_id] = { total: 0, submitted: 0 }
      taskStatsByCourse[t.course_id].total++
      if (submittedTaskIds.has(t.id)) taskStatsByCourse[t.course_id].submitted++
    }
  }

  const userRole = profile.role as UserRole

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <div className="flex items-center justify-between">
        <Link
          href="/super-admin/utenti"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition"
        >
          <ArrowLeft size={15} />
          Torna agli utenti
        </Link>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {profile.role === 'studente' && (
            <Link
              href={`/docente/corsisti/${id}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition"
            >
              <UserRound size={14} /> Dettaglio Corsista
            </Link>
          )}
          <CambiaRuoloBtn userId={id} currentRole={profile.role} />
          <ToggleAttivazioneBtn userId={id} isActive={profile.is_active ?? true} />
          <ResetPasswordBtn userId={id} />
          <EliminaUtenteBtn userId={id} userName={profile.full_name} />
        </div>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
            style={{ backgroundColor: profile.is_active ? '#1565C0' : '#9ca3af' }}
          >
            {profile.full_name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900 truncate">{profile.full_name}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_COLORS[userRole]}`}>
                {ROLE_LABELS[userRole]}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${profile.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {profile.is_active ? 'Attivo' : 'Disattivato'}
              </span>
            </div>

            <div className="space-y-1.5 mt-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Mail size={14} className="flex-shrink-0 text-gray-400" />
                <span>{profile.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar size={14} className="flex-shrink-0 text-gray-400" />
                <span>
                  Iscritto il{' '}
                  {new Date(profile.created_at).toLocaleDateString('it-IT', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Shield size={14} className="flex-shrink-0 text-gray-400" />
                <span>{ROLE_LABELS[userRole]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Corsi iscritti */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap size={18} style={{ color: '#1565C0' }} />
          <h2 className="text-lg font-semibold text-gray-900">Corsi iscritti</h2>
          <span className="text-sm text-gray-400">({enrollments.length})</span>
          {profile.role === 'studente' && (
            <div className="ml-auto">
              <IscriviCorsoBtn studentId={id} availableCourses={availableCourses} />
            </div>
          )}
        </div>

        {enrollments.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <GraduationCap size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Nessun corso a cui è iscritto.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {enrollments.map((enrollment, idx) => {
              const course = enrollment.courses
              if (!course) return null
              const att = getAttendance(course.id)
              const pct = att ? Math.round((att.present / att.total) * 100) : null
              const enrollStatus = enrollment.status
              const courseStatus = course.status

              return (
                <div key={idx} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Link href={`/super-admin/corsi/${course.id}`} className="font-semibold text-gray-900 truncate hover:text-blue-700 transition">
                          {course.name}
                        </Link>
                        {enrollStatus === 'active' && (
                          <RimuoviIscrizioneBtn studentId={id} courseId={course.id} courseName={course.name} />
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ENROLLMENT_STATUS_COLORS[enrollStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                          {ENROLLMENT_STATUS_LABELS[enrollStatus] ?? enrollStatus}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${COURSE_STATUS_COLORS[courseStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                          {COURSE_STATUS_LABELS[courseStatus] ?? courseStatus}
                        </span>
                        {pct !== null && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${pct >= 75 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            <Award size={10} />
                            {pct >= 75 ? 'Idoneo' : 'Non idoneo'}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          Iscritto il{' '}
                          {new Date(enrollment.enrolled_at).toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      {profile.role === 'studente' && (
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {(() => {
                            const q = quizStatsByCourse[course.id]
                            const t = taskStatsByCourse[course.id]
                            return (
                              <>
                                {q && q.total > 0 && (
                                  <span className="flex items-center gap-1 text-xs text-gray-500">
                                    {q.passed > 0
                                      ? <CheckCircle size={11} className="text-green-600" />
                                      : <ClipboardCheck size={11} className="text-gray-400" />
                                    }
                                    Quiz: <span className="font-semibold text-green-700">{q.passed}</span>/{q.total} superati
                                  </span>
                                )}
                                {t && t.total > 0 && (
                                  <span className="flex items-center gap-1 text-xs text-gray-500">
                                    <ClipboardList size={11} className="text-amber-500" />
                                    Task: <span className="font-semibold">{t.submitted}</span>/{t.total} consegnati
                                  </span>
                                )}
                              </>
                            )
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Attendance, quiz, task stats */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      {pct !== null && att ? (
                        <>
                          <div className="flex items-center gap-1.5">
                            <TrendingUp size={13} className={pct >= 75 ? 'text-green-600' : pct >= 50 ? 'text-amber-500' : 'text-red-500'} />
                            <span className={`text-sm font-bold ${pct >= 75 ? 'text-green-700' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                              {pct}%
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">{att.present}/{att.total} sessioni</span>
                          <div className="w-24 h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-gray-300">
                          <TrendingUp size={12} />
                          <span>—</span>
                        </div>
                      )}
                      <Link
                        href={`/super-admin/corsi/${course.id}/presenze`}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition"
                      >
                        <ClipboardList size={11} /> Presenze
                      </Link>
                      {profile.role === 'studente' && (
                        <Link
                          href={`/super-admin/utenti/${id}/attestato/${course.id}`}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition"
                        >
                          <FileText size={11} /> Attestato
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
