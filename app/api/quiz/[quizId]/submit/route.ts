import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: quiz } = await supabase
    .from('course_quizzes')
    .select('id, course_id, passing_score, penalty_wrong, from_library, title, courses(name)')
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

  const penaltyWrong = (quiz as unknown as { penalty_wrong: boolean | null }).penalty_wrong ?? false
  const fromLibrary = (quiz as unknown as { from_library: boolean }).from_library ?? false
  const { answers, startedAt } = await request.json()
  const nowIso = new Date().toISOString()

  // ── Quiz da libreria: grading dallo snapshot del tentativo ─────────────────
  if (fromLibrary) {
    const admin = createAdminClient()
    const { data: attempt } = await admin
      .from('quiz_attempts')
      .select('id, submitted_at')
      .eq('quiz_id', quizId).eq('student_id', user.id)
      .maybeSingle()
    if (!attempt) return NextResponse.json({ error: 'Tentativo non avviato' }, { status: 400 })
    if (attempt.submitted_at) return NextResponse.json({ error: 'Quiz già completato' }, { status: 409 })

    const { data: snap } = await admin
      .from('quiz_attempt_questions')
      .select('id, points, quiz_attempt_options(id, is_correct)')
      .eq('attempt_id', attempt.id)
    if (!snap?.length) return NextResponse.json({ error: 'Snapshot mancante' }, { status: 400 })

    const correctByQ: Record<string, string> = {}
    const pointsByQ: Record<string, number> = {}
    for (const aq of snap) {
      const opts = (aq.quiz_attempt_options as { id: string; is_correct: boolean }[]) ?? []
      const correct = opts.find(o => o.is_correct)
      if (correct) correctByQ[aq.id] = correct.id
      pointsByQ[aq.id] = (aq.points as number) ?? 1
    }

    let score = 0
    const ans = (answers ?? {}) as Record<string, string>
    for (const [aqId, aoId] of Object.entries(ans)) {
      if (correctByQ[aqId] === aoId) score += pointsByQ[aqId] ?? 1
      else if (penaltyWrong) score -= 1
    }
    const total = snap.reduce((s, aq) => s + ((aq.points as number) ?? 1), 0)
    const passed = score >= (quiz.passing_score ?? 18)

    await admin.from('quiz_attempts').update({
      score, total, passed, submitted_at: nowIso,
    }).eq('id', attempt.id)

    if (Object.keys(ans).length > 0) {
      await admin.from('quiz_answers').insert(
        Object.entries(ans).map(([aqId, aoId]) => ({
          attempt_id: attempt.id,
          attempt_question_id: aqId,
          attempt_option_id: aoId,
        }))
      )
    }
    return NextResponse.json({ ok: true, score, total, passed })
  }

  // ── Quiz legacy (domande fisse) ────────────────────────────────────────────
  const { data: existing } = await supabase
    .from('quiz_attempts')
    .select('id, submitted_at')
    .eq('quiz_id', quizId)
    .eq('student_id', user.id)
    .maybeSingle()
  if (existing?.submitted_at) return NextResponse.json({ error: 'Quiz già completato' }, { status: 409 })

  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('id, points, quiz_options(id, is_correct)')
    .eq('quiz_id', quizId)
  if (!questions?.length) return NextResponse.json({ error: 'Nessuna domanda' }, { status: 400 })

  const correctByQuestion: Record<string, string> = {}
  const pointsByQuestion: Record<string, number> = {}
  for (const q of questions) {
    const opts = q.quiz_options as { id: string; is_correct: boolean }[]
    const correctOpt = opts.find(o => o.is_correct)
    if (correctOpt) correctByQuestion[q.id] = correctOpt.id
    pointsByQuestion[q.id] = (q.points as number) ?? 1
  }

  let score = 0
  for (const [qId, optId] of Object.entries(answers as Record<string, string>)) {
    if (correctByQuestion[qId] === optId) score += pointsByQuestion[qId] ?? 1
    else if (penaltyWrong) score -= 1
  }

  const total = questions.reduce((sum, q) => sum + ((q.points as number) ?? 1), 0)
  const passed = score >= (quiz.passing_score ?? 18)

  const { data: attempt } = await supabase
    .from('quiz_attempts')
    .insert({
      quiz_id: quizId,
      student_id: user.id,
      score,
      total,
      passed,
      started_at: startedAt ?? null,
      submitted_at: nowIso,
    })
    .select()
    .single()

  if (!attempt) return NextResponse.json({ error: 'Errore salvataggio' }, { status: 500 })

  await supabase.from('quiz_answers').insert(
    Object.entries(answers as Record<string, string>).map(([questionId, optionId]) => ({
      attempt_id: attempt.id,
      question_id: questionId,
      option_id: optionId,
    }))
  )

  return NextResponse.json({ ok: true, score, total, passed })
}
