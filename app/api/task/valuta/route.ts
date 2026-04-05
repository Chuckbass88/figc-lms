import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendEmail, emailValutazioneTask } from '@/lib/email'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { submissionId, grade, feedback, studentId, taskTitle } = await request.json()
  if (!submissionId) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  // Verifica che il caller sia docente del corso oppure super_admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') {
    // Risali al corso tramite submission → task → course
    const { data: sub } = await supabase
      .from('task_submissions')
      .select('task_id')
      .eq('id', submissionId)
      .single()
    if (!sub) return NextResponse.json({ error: 'Submission non trovata' }, { status: 404 })

    const { data: task } = await supabase
      .from('course_tasks')
      .select('course_id')
      .eq('id', sub.task_id)
      .single()
    if (!task) return NextResponse.json({ error: 'Task non trovato' }, { status: 404 })

    const { data: instructor } = await supabase
      .from('course_instructors')
      .select('instructor_id')
      .eq('course_id', task.course_id)
      .eq('instructor_id', user.id)
      .single()
    if (!instructor) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

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

    // Email
    const { data: p } = await supabase.from('profiles').select('full_name, email').eq('id', studentId).single()
    if (p) {
      const { data: submission } = await supabase
        .from('task_submissions')
        .select('task_id')
        .eq('id', submissionId)
        .single()
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      const tmpl = emailValutazioneTask({
        recipientName: p.full_name,
        taskTitle: taskTitle ?? 'Task',
        courseName: '',
        grade: grade ?? '—',
        feedback: feedback ?? null,
        appUrl: submission ? `${appUrl}/studente/corsi/task/${submission.task_id}` : appUrl,
      })
      await sendEmail({ ...tmpl, to: p.email })
    }
  }

  return NextResponse.json({ ok: true })
}
