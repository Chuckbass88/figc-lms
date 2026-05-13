import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const submissionId = searchParams.get('submissionId')
  if (!submissionId) return NextResponse.json({ error: 'submissionId mancante' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data, error } = await supabase
    .from('task_feedback')
    .select('*, sender:profiles(full_name, role)')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { submissionId, content } = await request.json()
  if (!submissionId || !content?.trim()) {
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
  }

  // Verifica che la task non sia già valutata
  const { data: sub } = await supabase
    .from('task_submissions')
    .select('status, student_id, task_id')
    .eq('id', submissionId)
    .single()

  if (!sub) return NextResponse.json({ error: 'Submission non trovata' }, { status: 404 })
  if (sub.status === 'valutato') {
    return NextResponse.json({ error: 'La task è già stata valutata — thread chiuso' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const senderRole = profile?.role ?? 'studente'

  const { data: feedback, error } = await supabase
    .from('task_feedback')
    .insert({
      submission_id: submissionId,
      sender_id: user.id,
      sender_role: senderRole,
      content: content.trim(),
    })
    .select('*, sender:profiles(full_name, role)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notifica l'altra parte
  const isDocente = ['docente', 'super_admin', 'admin'].includes(senderRole)
  const notifyUserId = isDocente ? sub.student_id : null

  if (notifyUserId) {
    await supabase.from('notifications').insert({
      user_id: notifyUserId,
      title: 'Nuovo feedback sul tuo lavoro',
      message: 'Il docente ha lasciato un feedback sulla tua task. Accedi per leggerlo.',
      read: false,
    })
  } else {
    // Studente ha risposto — notifica il docente
    const { data: task } = await supabase
      .from('course_tasks')
      .select('course_id, title')
      .eq('id', sub.task_id)
      .single()
    if (task) {
      const { data: instructors } = await supabase
        .from('course_instructors')
        .select('instructor_id')
        .eq('course_id', task.course_id)
      for (const inst of instructors ?? []) {
        await supabase.from('notifications').insert({
          user_id: inst.instructor_id,
          title: 'Risposta ricevuta su una task',
          message: `Uno studente ha risposto al feedback per "${task.title}".`,
          read: false,
        })
      }
    }
  }

  // Aggiorna status a 'in_revisione' se era 'consegnato'
  if (isDocente && sub.status === 'consegnato') {
    await supabase
      .from('task_submissions')
      .update({ status: 'in_revisione' })
      .eq('id', submissionId)
  }

  return NextResponse.json(feedback)
}
