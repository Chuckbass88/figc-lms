import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { studentId, newDeadline } = await request.json()
  if (!studentId || !newDeadline) {
    return NextResponse.json({ error: 'studentId e newDeadline obbligatori' }, { status: 400 })
  }

  // Verifica autorizzazione
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin' && profile?.role !== 'admin') {
    const { data: task } = await supabase.from('course_tasks').select('course_id').eq('id', taskId).single()
    if (!task) return NextResponse.json({ error: 'Task non trovata' }, { status: 404 })
    const { data: inst } = await supabase
      .from('course_instructors')
      .select('instructor_id')
      .eq('course_id', task.course_id)
      .eq('instructor_id', user.id)
      .single()
    if (!inst) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  // Upsert submission con deadline estesa
  const { error } = await supabase
    .from('task_submissions')
    .upsert({
      task_id: taskId,
      student_id: studentId,
      deadline_extended: newDeadline,
    }, { onConflict: 'task_id,student_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notifica studente
  const newDate = new Date(newDeadline).toLocaleDateString('it-IT')
  await supabase.from('notifications').insert({
    user_id: studentId,
    title: 'Deadline estesa',
    message: `La scadenza per una tua task è stata estesa fino al ${newDate}.`,
    read: false,
  })

  return NextResponse.json({ ok: true })
}
