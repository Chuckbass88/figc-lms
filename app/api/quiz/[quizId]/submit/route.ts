import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  // Verifica iscrizione al corso del quiz
  const { data: quiz } = await supabase
    .from('course_quizzes')
    .select('id, course_id, passing_score, title, courses(name)')
    .eq('id', quizId)
    .single()
  if (!quiz) return NextResponse.json({ error: 'Quiz non trovato' }, { status: 404 })

  const { data: enrollment } = await supabase
    .from('course_enrollments')
    .select('status')
    .eq('course_id', quiz.course_id)
    .eq('student_id', user.id)
    .single()
  if (!enrollment) return NextResponse.json({ error: 'Non iscritto al corso' }, { status: 403 })

  // Già tentato?
  const { data: existing } = await supabase
    .from('quiz_attempts')
    .select('id')
    .eq('quiz_id', quizId)
    .eq('student_id', user.id)
    .single()
  if (existing) return NextResponse.json({ error: 'Quiz già completato' }, { status: 409 })

  // Recupera domande e opzioni corrette
  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('id, quiz_options(id, is_correct)')
    .eq('quiz_id', quizId)
  if (!questions?.length) return NextResponse.json({ error: 'Nessuna domanda' }, { status: 400 })

  const { answers } = await request.json() // { [questionId]: optionId }

  // Calcola punteggio
  let correct = 0
  const correctByQuestion: Record<string, string> = {}
  for (const q of questions) {
    const opts = q.quiz_options as { id: string; is_correct: boolean }[]
    const correctOpt = opts.find(o => o.is_correct)
    if (correctOpt) correctByQuestion[q.id] = correctOpt.id
  }
  for (const [qId, optId] of Object.entries(answers as Record<string, string>)) {
    if (correctByQuestion[qId] === optId) correct++
  }

  const total = questions.length
  const scorePct = Math.round((correct / total) * 100)
  const passed = scorePct >= (quiz.passing_score ?? 60)

  // Salva tentativo
  const { data: attempt } = await supabase
    .from('quiz_attempts')
    .insert({ quiz_id: quizId, student_id: user.id, score: correct, total, passed })
    .select()
    .single()

  if (!attempt) return NextResponse.json({ error: 'Errore salvataggio' }, { status: 500 })

  // Salva risposte
  await supabase.from('quiz_answers').insert(
    Object.entries(answers as Record<string, string>).map(([questionId, optionId]) => ({
      attempt_id: attempt.id,
      question_id: questionId,
      option_id: optionId,
    }))
  )

  return NextResponse.json({ ok: true, score: correct, total, scorePct, passed })
}
