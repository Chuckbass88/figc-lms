import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/quiz/template/[id] — template con domande e opzioni
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: template } = await supabase
    .from('quiz_templates')
    .select('id, title, description, category, penalty_wrong, questions_per_student, quiz_template_questions(id, text, order_index, points, quiz_template_options(id, text, is_correct, order_index))')
    .eq('id', id)
    .single()

  if (!template) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  type TplOpt = { id: string; text: string; is_correct: boolean; order_index: number }
  type TplQ = { id: string; text: string; order_index: number; points: number; quiz_template_options: TplOpt[] }
  type TplMeta = { penalty_wrong: boolean | null; questions_per_student: number | null }

  const meta = template as unknown as TplMeta

  const questions = ((template.quiz_template_questions as unknown as TplQ[]) ?? [])
    .sort((a, b) => a.order_index - b.order_index)
    .map(q => ({
      text: q.text,
      points: q.points ?? 1,
      options: q.quiz_template_options.sort((a, b) => a.order_index - b.order_index).map(o => ({
        text: o.text,
        is_correct: o.is_correct,
      })),
    }))

  return NextResponse.json({
    questions,
    penalty_wrong: meta.penalty_wrong ?? false,
    questions_per_student: meta.questions_per_student ?? null,
  })
}

// DELETE /api/quiz/template/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'docente'].includes(profile.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  await supabase.from('quiz_templates').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
