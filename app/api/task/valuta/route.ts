import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { sendEmail, emailValutazioneTask } from '@/lib/email'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { submissionId, gradeDecimal, feedback, studentId, taskTitle, courseId, gradeVisible: gradeVisibleReq } = await request.json()
  if (!submissionId || gradeDecimal === undefined) {
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
  }

  const grade = parseFloat(gradeDecimal)
  if (isNaN(grade) || grade < 0 || grade > 10) {
    return NextResponse.json({ error: 'Il voto deve essere compreso tra 0 e 10' }, { status: 400 })
  }

  // Verifica autorizzazione
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin' && profile?.role !== 'admin') {
    const { data: sub } = await supabase
      .from('task_submissions')
      .select('task_id')
      .eq('id', submissionId)
      .single()
    if (!sub) return NextResponse.json({ error: 'Submission non trovata' }, { status: 404 })

    const { data: task } = await supabase
      .from('course_tasks')
      .select('course_id, grade_visible')
      .eq('id', sub.task_id)
      .single()
    if (!task) return NextResponse.json({ error: 'Task non trovata' }, { status: 404 })

    const { data: instructor } = await supabase
      .from('course_instructors')
      .select('instructor_id')
      .eq('course_id', task.course_id)
      .eq('instructor_id', user.id)
      .single()
    if (!instructor) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  // Recupera info submission + task per cleanup e notifiche
  const { data: sub } = await supabase
    .from('task_submissions')
    .select('storage_path, task_id')
    .eq('id', submissionId)
    .single()

  const { data: task } = sub
    ? await supabase
        .from('course_tasks')
        .select('grade_visible, course_id, title')
        .eq('id', sub.task_id)
        .single()
    : { data: null }

  const gradeVisible = gradeVisibleReq ?? task?.grade_visible ?? false
  const actualCourseId = task?.course_id ?? courseId

  // Recupera scala voto del corso
  let gradingScale = 10
  if (actualCourseId) {
    const { data: course } = await supabase
      .from('courses')
      .select('grading_scale')
      .eq('id', actualCourseId)
      .single()
    gradingScale = course?.grading_scale ?? 10
  }
  const gradeDisplay = grade * (gradingScale / 10)

  // Aggiorna grade_visible sulla task (scelta del docente)
  if (sub?.task_id) {
    await supabase.from('course_tasks').update({ grade_visible: gradeVisible }).eq('id', sub.task_id)
  }

  // Aggiorna submission
  const { error } = await supabase
    .from('task_submissions')
    .update({
      grade:         String(grade),      // retrocompatibilità
      grade_decimal: grade,
      feedback:      feedback?.trim() || null,
      evaluated_at:  new Date().toISOString(),
      evaluated_by:  user.id,
      status:        'valutato',
    })
    .eq('id', submissionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Cleanup file da storage
  if (sub?.storage_path) {
    const admin = createAdminClient()
    await admin.storage.from('task-submissions').remove([sub.storage_path])
    await supabase
      .from('task_submissions')
      .update({ file_deleted_at: new Date().toISOString() })
      .eq('id', submissionId)
  }

  // Notifica studente
  if (studentId) {
    const notifMessage = gradeVisible
      ? `Il tuo lavoro per "${taskTitle ?? 'un task'}" è stato valutato. Voto: ${gradeDisplay}/${gradingScale}.`
      : `Il tuo lavoro per "${taskTitle ?? 'un task'}" è stato valutato.`

    await supabase.from('notifications').insert({
      user_id: studentId,
      title:   'La tua task è stata valutata',
      message: notifMessage,
      read:    false,
    })

    // Email
    const { data: p } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', studentId)
      .single()

    const { data: course } = actualCourseId
      ? await supabase.from('courses').select('name').eq('id', actualCourseId).single()
      : { data: null }

    if (p) {
      const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://coachlab.it'
      const tmpl = emailValutazioneTask({
        recipientName: p.full_name,
        taskTitle:     taskTitle ?? task?.title ?? 'Task',
        courseName:    course?.name ?? '',
        grade:         gradeVisible ? `${gradeDisplay}/${gradingScale}` : '—',
        feedback:      gradeVisible ? (feedback?.trim() || null) : null,
        appUrl:        `${appUrl}/studente/corsi/${actualCourseId}/task`,
      })
      await sendEmail({ ...tmpl, to: p.email })
    }
  }

  return NextResponse.json({ ok: true, gradeDisplay, gradingScale })
}
