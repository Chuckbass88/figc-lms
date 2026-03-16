import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface QuizOption { text: string; isCorrect: boolean }
interface QuizQuestion { text: string; options: QuizOption[] }

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { courseId, groupId, title, description, passingScore, questions } = await request.json()
  if (!courseId || !title?.trim() || !questions?.length) {
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
  }

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
      passing_score: passingScore ?? 60,
      created_by: user.id,
    })
    .select()
    .single()

  if (quizError || !quiz) return NextResponse.json({ error: quizError?.message }, { status: 500 })

  // Crea domande e opzioni
  for (let i = 0; i < (questions as QuizQuestion[]).length; i++) {
    const q = questions[i]
    const { data: question, error: qErr } = await supabase
      .from('quiz_questions')
      .insert({ quiz_id: quiz.id, text: q.text.trim(), order_index: i })
      .select()
      .single()

    if (qErr || !question) continue

    await supabase.from('quiz_options').insert(
      (q.options as QuizOption[]).map((opt, j) => ({
        question_id: question.id,
        text: opt.text.trim(),
        is_correct: opt.isCorrect,
        order_index: j,
      }))
    )
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
        title: 'Nuovo quiz disponibile',
        message: `È disponibile un nuovo quiz: "${title.trim()}" — ${course?.name ?? ''}`,
        read: false,
      }))
    )
  }

  return NextResponse.json({ ok: true, id: quiz.id })
}
