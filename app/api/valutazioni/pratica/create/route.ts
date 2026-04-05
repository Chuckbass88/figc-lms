import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { courseId, studentId, templateId, evaluationDate, sessionLabel, globalNote, scores } =
    await request.json() as {
      courseId: string
      studentId: string
      templateId: string
      evaluationDate: string
      sessionLabel?: string
      globalNote?: string
      scores: { criterionId: string; score: number; note?: string }[]
    }

  if (!courseId || !studentId || !templateId || !evaluationDate || !scores?.length) {
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
  }

  // Verifica autorizzazione
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  if (profile.role !== 'super_admin') {
    const { data: isInstructor } = await supabase
      .from('course_instructors')
      .select('instructor_id')
      .eq('course_id', courseId)
      .eq('instructor_id', user.id)
      .single()
    if (!isInstructor) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  // Calcola final_score come media dei punteggi
  const finalScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length

  const { data: evaluation, error: evalError } = await supabase
    .from('practical_evaluations')
    .insert({
      course_id: courseId,
      student_id: studentId,
      template_id: templateId,
      evaluator_id: user.id,
      evaluation_date: evaluationDate,
      session_label: sessionLabel?.trim() || null,
      global_note: globalNote?.trim() || null,
      final_score: Math.round(finalScore * 100) / 100,
    })
    .select()
    .single()

  if (evalError) return NextResponse.json({ error: evalError.message }, { status: 500 })

  const { error: scoresError } = await supabase
    .from('practical_evaluation_scores')
    .insert(
      scores.map(s => ({
        evaluation_id: evaluation.id,
        criterion_id: s.criterionId,
        score: s.score,
        note: s.note?.trim() || null,
      }))
    )

  if (scoresError) {
    await supabase.from('practical_evaluations').delete().eq('id', evaluation.id)
    return NextResponse.json({ error: scoresError.message }, { status: 500 })
  }

  // Notifica al corsista
  await supabase.from('notifications').insert({
    user_id: studentId,
    title: 'Nuova valutazione pratica',
    message: sessionLabel ? `Valutazione "${sessionLabel}" — Voto: ${finalScore.toFixed(1)}/10` : `Voto: ${finalScore.toFixed(1)}/10`,
    read: false,
  })

  return NextResponse.json({ ok: true, id: evaluation.id })
}
