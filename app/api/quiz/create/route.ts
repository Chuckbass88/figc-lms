import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendEmail, emailNuovoQuiz } from '@/lib/email'
import { CreateQuizSchema, zodError } from '@/lib/schemas'
import { z } from 'zod'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  let parsed: z.infer<typeof CreateQuizSchema>
  try {
    parsed = CreateQuizSchema.parse(await request.json())
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: zodError(err) }, { status: 400 })
    }
    return NextResponse.json({ error: 'Payload non valido' }, { status: 400 })
  }

  const {
    courseId, groupId, title, description, passingScore, timerMinutes, questions,
    category, instructions, shuffleQuestions, availableFrom, availableUntil, autoCloseOnTimer,
    penaltyWrong, questionsPerStudent,
  } = parsed

  // Verifica autorizzazione
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') {
    const { data: isInstructor } = await supabase
      .from('course_instructors')
      .select('instructor_id')
      .eq('course_id', courseId)
      .eq('instructor_id', user.id)
      .single()
    if (!isInstructor) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  // Crea quiz
  const { data: quiz, error: quizError } = await supabase
    .from('course_quizzes')
    .insert({
      course_id: courseId,
      group_id: groupId || null,
      title: title.trim(),
      description: description?.trim() || null,
      passing_score: passingScore ?? 18,
      timer_minutes: timerMinutes ?? 30,
      category: category || null,
      instructions: instructions?.trim() || null,
      shuffle_questions: shuffleQuestions ?? false,
      available_from: availableFrom || null,
      available_until: availableUntil || null,
      auto_close_on_timer: autoCloseOnTimer ?? true,
      penalty_wrong: penaltyWrong ?? false,
      questions_per_student: questionsPerStudent ?? null,
      created_by: user.id,
    })
    .select()
    .single()

  if (quizError || !quiz) return NextResponse.json({ error: quizError?.message }, { status: 500 })

  // Crea domande e opzioni
  let questionsFailed = 0
  for (let i = 0; i < (questions as QuizQuestion[]).length; i++) {
    const q = questions[i]
    const { data: question, error: qErr } = await supabase
      .from('quiz_questions')
      .insert({ quiz_id: quiz.id, text: q.text.trim(), order_index: i, points: q.points ?? 1 })
      .select()
      .single()

    if (qErr || !question) {
      questionsFailed++
      console.error(`[quiz/create] Domanda ${i + 1} fallita (quiz ${quiz.id}):`, qErr?.message)
      continue
    }

    await supabase.from('quiz_options').insert(
      (q.options as QuizOption[]).map((opt, j) => ({
        question_id: question.id,
        text: opt.text.trim(),
        is_correct: opt.isCorrect,
        order_index: j,
      }))
    )
  }

  // Se alcune domande sono fallite, segnalalo nel response (non blocchiamo ma avvisiamo)
  if (questionsFailed > 0) {
    console.error(`[quiz/create] Quiz ${quiz.id}: ${questionsFailed}/${(questions as QuizQuestion[]).length} domande non salvate`)
  }

  // Notifica corsisti
  let studentIds: string[] = []
  if (groupId) {
    const { data: members } = await supabase
      .from('course_group_members')
      .select('student_id')
      .eq('group_id', groupId)
    studentIds = (members ?? []).map(m => m.student_id)
  } else {
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select('student_id')
      .eq('course_id', courseId)
      .eq('status', 'active')
    studentIds = (enrollments ?? []).map(e => e.student_id)
  }

  if (studentIds.length > 0) {
    const { data: course } = await supabase.from('courses').select('name').eq('id', courseId).single()
    await supabase.from('notifications').insert(
      studentIds.map(id => ({
        user_id: id,
        type:  'quiz',
        title: 'Nuovo quiz disponibile',
        body:  `È disponibile un nuovo quiz: "${title.trim()}" — ${course?.name ?? ''}`,
        data:  { url: `/studente/corsi/${courseId}/quiz/${quiz.id}` },
      }))
    )

    // Email
    const { data: profiles } = await supabase
      .from('profiles').select('full_name, email').in('id', studentIds)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    for (const p of profiles ?? []) {
      const tmpl = emailNuovoQuiz({
        recipientName: p.full_name,
        quizTitle: title.trim(),
        courseName: course?.name ?? '',
        passScore: passingScore ?? 18,
        appUrl: `${appUrl}/studente/corsi/${courseId}/quiz/${quiz.id}`,
      })
      await sendEmail({ ...tmpl, to: p.email })
    }
  }

  return NextResponse.json({
    ok: true,
    id: quiz.id,
    ...(questionsFailed > 0 && {
      warning: `${questionsFailed} domande non salvate a causa di un errore. Verifica il quiz prima di pubblicarlo.`,
      questionsFailed,
    }),
  })
}
