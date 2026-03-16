import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { submissionId, grade, feedback, studentId, taskTitle } = await request.json()
  if (!submissionId) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  const { error } = await supabase
    .from('task_submissions')
    .update({
      grade: grade?.trim() || null,
      feedback: feedback?.trim() || null,
      evaluated_at: new Date().toISOString(),
      evaluated_by: user.id,
    })
    .eq('id', submissionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notifica al corsista
  if (studentId) {
    await supabase.from('notifications').insert({
      user_id: studentId,
      title: 'Hai ricevuto una valutazione',
      message: `Il tuo lavoro per "${taskTitle ?? 'un task'}" è stato valutato. Accedi alla piattaforma per vedere il feedback.`,
      read: false,
    })
  }

  return NextResponse.json({ ok: true })
}
