import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Users, CheckCircle, XCircle, ClipboardCheck, ListChecks } from 'lucide-react'
import EliminaQuizBtn from './EliminaQuizBtn'
import ModificaQuizBtn from './ModificaQuizBtn'
import EsportaQuizCSV from './EsportaQuizCSV'
import RisposteStudenteModal from '@/components/quiz/RisposteStudenteModal'

export default async function DocenteQuizDetailPage({ params }: { params: Promise<{ id: string; quizId: string }> }) {
  const { id, quizId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isSuperAdmin = profile?.role === 'super_admin'

  if (!isSuperAdmin) {
    const { data: isInstructor } = await supabase
      .from('course_instructors')
      .select('instructor_id')
      .eq('course_id', id)
      .eq('instructor_id', user.id)
      .single()
    if (!isInstructor) notFound()
  }

  const [
    { data: course },
    { data: quiz },
    { data: enrollments },
    { data: attempts },
  ] = await Promise.all([
    supabase.from('courses').select('id, name').eq('id', id).single(),
    supabase.from('course_quizzes')
      .select('id, title, description, passing_score, created_at, group_id, course_groups(name), quiz_questions(id, text, order_index, quiz_options(id, text, is_correct, order_index))')
      .eq('id', quizId)
      .eq('course_id', id)
      .single(),
    supabase.from('course_enrollments')
      .select('student_id, profiles(id, full_name, email)')
      .eq('course_id', id)
      .eq('status', 'active'),
    supabase.from('quiz_attempts')
      .select('id, student_id, score, total, passed, submitted_at')
      .eq('quiz_id', quizId),
  ])

  if (!course || !quiz) notFound()

  type Enrollment = { student_id: string; profiles: { id: string; full_name: string; email: string } | null }
  type Attempt = { id: string; student_id: string; score: number; total: number; passed: boolean; submitted_at: string }

  const students = (enrollments as unknown as Enrollment[] ?? [])
    .map(e => e.profiles).filter(Boolean) as { id: string; full_name: string; email: string }[]

  const attemptMap = new Map((attempts as Attempt[] ?? []).map(a => [a.student_id, a]))
  const group = quiz.course_groups as unknown as { name: string } | null
  const questions = (quiz.quiz_questions as { id: string; text: string; order_index: number; quiz_options: { id: string; text: string; is_correct: boolean; order_index: number }[] }[])
    .sort((a, b) => a.order_index - b.order_index)

  const completedCount = attempts?.length ?? 0
  const passedCount = (attempts as Attempt[] ?? []).filter(a => a.passed).length

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href={`/docente/corsi/${id}/quiz`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit"
        >
          <ArrowLeft size={15} /> Quiz del corso
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">{quiz.title}</h2>
        {quiz.description && <p className="text-gray-500 text-sm mt-1">{quiz.description}</p>}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${group ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
            {group ? group.name : 'Tutto il corso'}
          </span>
          <span className="text-xs text-gray-500">Soglia: {quiz.passing_score}%</span>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Users size={11} /> {completedCount}/{students.length} completati
          </span>
          {completedCount > 0 && (
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <CheckCircle size={11} /> {passedCount} superati
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Link
              href={`/docente/corsi/${id}/quiz/${quizId}/domande`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
            >
              <ListChecks size={14} /> Gestione Domande
            </Link>
            <ModificaQuizBtn
              quizId={quizId}
              initialTitle={quiz.title}
              initialDescription={quiz.description ?? null}
              initialPassingScore={quiz.passing_score}
            />
            <EliminaQuizBtn quizId={quizId} courseId={id} />
          </div>
        </div>
      </div>

      {/* Anteprima domande */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <ClipboardCheck size={15} className="text-blue-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Domande ({questions.length})</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {questions.map((q, qi) => (
            <div key={q.id} className="px-5 py-3">
              <p className="text-sm font-medium text-gray-900">{qi + 1}. {q.text}</p>
              <div className="mt-2 space-y-1 ml-4">
                {q.quiz_options.sort((a, b) => a.order_index - b.order_index).map(opt => (
                  <p key={opt.id} className={`text-xs flex items-center gap-1.5 ${opt.is_correct ? 'text-green-700 font-semibold' : 'text-gray-500'}`}>
                    {opt.is_correct ? <CheckCircle size={11} /> : <span className="w-2.5 h-2.5 rounded-full border border-gray-300 inline-block flex-shrink-0" />}
                    {opt.text}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risultati corsisti */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2 flex-wrap">
          <Users size={15} className="text-blue-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Risultati corsisti</h3>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            {students.length}
          </span>
          <div className="ml-auto">
            <EsportaQuizCSV
              quizTitle={quiz.title}
              students={students}
              attempts={attempts as Attempt[] ?? []}
              passingScore={quiz.passing_score}
            />
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {students.map(student => {
            const attempt = attemptMap.get(student.id)
            const scorePct = attempt ? Math.round((attempt.score / attempt.total) * 100) : null
            return (
              <div key={student.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {student.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{student.full_name}</p>
                  {attempt && (
                    <p className="text-xs text-gray-400">
                      {new Date(attempt.submitted_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                {attempt ? (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <RisposteStudenteModal
                      attemptId={attempt.id}
                      studentName={student.full_name}
                      score={attempt.score}
                      total={attempt.total}
                      passed={attempt.passed}
                      questions={questions}
                    />
                    <span className="text-sm font-bold text-gray-700">{attempt.score}/{attempt.total}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scorePct !== null && scorePct >= quiz.passing_score ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {scorePct}% — {attempt.passed ? 'Superato' : 'Non superato'}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg flex-shrink-0">
                    Non completato
                  </span>
                )}
              </div>
            )
          })}
          {students.length === 0 && (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">Nessun corsista iscritto.</p>
          )}
        </div>
      </div>
    </div>
  )
}
