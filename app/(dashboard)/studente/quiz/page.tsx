import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ClipboardCheck, CheckCircle, BookOpen, Clock } from 'lucide-react'
import GuideTooltip from '@/components/guida/GuideTooltip'

export default async function StudenteQuizGlobale() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select('course_id, courses(id, name)')
    .eq('student_id', user.id)
    .eq('status', 'active')

  const courseMap = new Map<string, string>()
  for (const e of enrollments ?? []) {
    const c = e.courses as unknown as { id: string; name: string } | null
    if (c) courseMap.set(c.id, c.name)
  }
  const courseIds = [...courseMap.keys()]

  if (courseIds.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">I Miei Quiz</h2>
          <p className="text-gray-500 text-sm mt-1">Nessun corso attivo.</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ClipboardCheck size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Non sei iscritto a nessun corso</p>
        </div>
      </div>
    )
  }

  // Gruppi dello studente (two-step)
  const { data: courseGroupsData } = await supabase
    .from('course_groups')
    .select('id, course_id')
    .in('course_id', courseIds)

  const allGroupIds = (courseGroupsData ?? []).map(g => g.id)
  const { data: myMemberships } = allGroupIds.length > 0
    ? await supabase
        .from('course_group_members')
        .select('group_id')
        .eq('student_id', user.id)
        .in('group_id', allGroupIds)
    : { data: [] }

  const myGroupIds = new Set((myMemberships ?? []).map(m => m.group_id))

  const { data: allQuizzes } = await supabase
    .from('course_quizzes')
    .select('id, title, course_id, group_id, course_groups(name)')
    .in('course_id', courseIds)
    .order('created_at', { ascending: false })

  type Quiz = {
    id: string; title: string; course_id: string
    group_id: string | null; course_groups: { name: string } | null
  }

  const visibleQuizzes = ((allQuizzes as unknown as Quiz[]) ?? []).filter(q =>
    q.group_id === null || myGroupIds.has(q.group_id)
  )

  const quizIds = visibleQuizzes.map(q => q.id)
  const { data: myAttempts } = quizIds.length > 0
    ? await supabase
        .from('quiz_attempts')
        .select('quiz_id, submitted_at')
        .eq('student_id', user.id)
        .in('quiz_id', quizIds)
    : { data: [] }

  type Attempt = { quiz_id: string; submitted_at: string }
  const attemptMap = new Map((myAttempts as Attempt[] ?? []).map(a => [a.quiz_id, a]))

  const completed = visibleQuizzes.filter(q => attemptMap.has(q.id))
  const pending = visibleQuizzes.filter(q => !attemptMap.has(q.id))

  function QuizRow({ quiz }: { quiz: Quiz }) {
    const attempt = attemptMap.get(quiz.id)
    const group = quiz.course_groups as { name: string } | null

    return (
      <Link
        href={`/studente/corsi/${quiz.course_id}/quiz/${quiz.id}`}
        className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition group"
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${attempt ? 'bg-gray-100' : 'bg-blue-50'}`}>
          {attempt
            ? <CheckCircle size={16} className="text-gray-400" />
            : <ClipboardCheck size={16} className="text-blue-500" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition truncate">
              {quiz.title}
            </p>
            {group && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700 flex-shrink-0">
                {group.name}
              </span>
            )}
          </div>
          <p className="text-xs text-blue-600 font-medium mt-0.5">
            <BookOpen size={9} className="inline mr-1" />
            {courseMap.get(quiz.course_id)}
          </p>
          {attempt && (
            <p className="text-xs text-gray-400 mt-0.5">
              <Clock size={9} className="inline mr-1" />
              Consegnato il {new Date(attempt.submitted_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
        <div className="flex-shrink-0 self-center">
          {attempt ? (
            <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
              Consegnato
            </span>
          ) : (
            <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
              Da svolgere
            </span>
          )}
        </div>
      </Link>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold text-gray-900">I Miei Quiz</h2>
          <GuideTooltip
            title="📝 Come funzionano i Quiz"
            content="I quiz sono test di verifica assegnati dal docente. Clicca su un quiz per iniziarlo: risponderai a domande a scelta multipla. Una volta consegnato non puoi modificare le risposte. Controlla la data di scadenza!"
            position="bottom"
          />
        </div>
        <p className="text-gray-500 text-sm mt-1">
          {visibleQuizzes.length} quiz · {completed.length} consegnati
          {pending.length > 0 && <span className="text-blue-500"> · {pending.length} da svolgere</span>}
        </p>
      </div>

      {/* Da svolgere */}
      {pending.length > 0 && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-blue-100 bg-blue-50 flex items-center gap-2">
            <ClipboardCheck size={14} className="text-blue-600" />
            <h3 className="font-semibold text-blue-900 text-sm">Da svolgere</h3>
            <span className="ml-auto text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {pending.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {pending.map(q => <QuizRow key={q.id} quiz={q} />)}
          </div>
        </div>
      )}

      {/* Consegnati */}
      {completed.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
            <CheckCircle size={14} className="text-gray-400" />
            <h3 className="font-semibold text-gray-900 text-sm">Consegnati</h3>
            <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
              {completed.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {completed.map(q => <QuizRow key={q.id} quiz={q} />)}
          </div>
        </div>
      )}

      {visibleQuizzes.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ClipboardCheck size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nessun quiz assegnato</p>
          <p className="text-gray-400 text-sm mt-1">I docenti non hanno ancora creato quiz.</p>
        </div>
      )}
    </div>
  )
}
