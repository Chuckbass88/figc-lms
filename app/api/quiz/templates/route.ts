import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/quiz/templates — lista quiz pre-archiviati
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: templates } = await supabase
    .from('quiz_templates')
    .select('id, title, description, category, course_tag, quiz_template_questions(id)')
    .order('created_at', { ascending: false })

  const result = (templates ?? []).map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    course_tag: (t as unknown as { course_tag: string | null }).course_tag,
    _count: (t.quiz_template_questions as { id: string }[] ?? []).length,
  }))

  return NextResponse.json({ templates: result })
}

// POST /api/quiz/templates — crea nuovo template
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'docente'].includes(profile.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { title, description, category, course_tag, questions, penalty_wrong, questions_per_student } = await request.json()
  if (!title?.trim() || !questions?.length) {
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
  }

  const { data: template, error } = await supabase
    .from('quiz_templates')
    .insert({
      title: title.trim(), description: description?.trim() || null, category: category || null,
      course_tag: course_tag?.trim() || null, created_by: user.id,
      penalty_wrong: penalty_wrong ?? false,
      questions_per_student: questions_per_student ?? null,
    })
    .select()
    .single()

  if (error || !template) return NextResponse.json({ error: error?.message }, { status: 500 })

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    const { data: tq } = await supabase
      .from('quiz_template_questions')
      .insert({ template_id: template.id, text: q.text.trim(), order_index: i, points: q.points ?? 1 })
      .select()
      .single()
    if (!tq) continue
    await supabase.from('quiz_template_options').insert(
      (q.options as { text: string; isCorrect: boolean }[]).map((opt, j) => ({
        question_id: tq.id,
        text: opt.text.trim(),
        is_correct: opt.isCorrect,
        order_index: j,
      }))
    )
  }

  return NextResponse.json({ ok: true, id: template.id })
}
