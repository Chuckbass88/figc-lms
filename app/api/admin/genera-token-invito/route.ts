import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { courseId } = await request.json()
  if (!courseId) return NextResponse.json({ error: 'courseId mancante' }, { status: 400 })

  const admin = createAdminClient()

  // Verifica ruolo: super_admin sempre autorizzato; docente solo se è istruttore del corso
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') {
    if (profile?.role !== 'docente') return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    const { data: isInstructor } = await admin
      .from('course_instructors')
      .select('instructor_id')
      .eq('course_id', courseId)
      .eq('instructor_id', user.id)
      .single()
    if (!isInstructor) return NextResponse.json({ error: 'Non sei istruttore di questo corso' }, { status: 403 })
  }

  const token = randomUUID()
  const { error } = await admin.from('courses').update({ invite_token: token }).eq('id', courseId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ token })
}
