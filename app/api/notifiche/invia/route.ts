import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'docente'].includes(profile.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { title, message, target, courseId } = await request.json()
  // target: 'all' | 'docenti' | 'studenti' | 'course' | string (userId)

  if (!title?.trim() || !message?.trim() || !target) {
    return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
  }

  let userIds: string[] = []

  if (target === 'all') {
    const { data } = await supabase.from('profiles').select('id').neq('id', user.id)
    userIds = data?.map(p => p.id) ?? []
  } else if (target === 'docenti') {
    const { data } = await supabase.from('profiles').select('id').eq('role', 'docente')
    userIds = data?.map(p => p.id) ?? []
  } else if (target === 'studenti') {
    const { data } = await supabase.from('profiles').select('id').eq('role', 'studente')
    userIds = data?.map(p => p.id) ?? []
  } else if (target === 'course' && courseId) {
    // Docente: verifica che sia assegnato al corso
    if (profile.role === 'docente') {
      const { data: assigned } = await supabase
        .from('course_instructors')
        .select('instructor_id')
        .eq('course_id', courseId)
        .eq('instructor_id', user.id)
        .single()
      if (!assigned) return NextResponse.json({ error: 'Non autorizzato per questo corso' }, { status: 403 })
    }
    const { data } = await supabase
      .from('course_enrollments')
      .select('student_id')
      .eq('course_id', courseId)
      .eq('status', 'active')
    userIds = data?.map(e => e.student_id) ?? []
  } else {
    // userId specifico
    userIds = [target]
  }

  if (userIds.length === 0) {
    return NextResponse.json({ error: 'Nessun destinatario trovato' }, { status: 400 })
  }

  const notifications = userIds.map(uid => ({
    user_id: uid,
    title: title.trim(),
    message: message.trim(),
    read: false,
  }))

  const { error } = await supabase.from('notifications').insert(notifications)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, sent: userIds.length })
}
