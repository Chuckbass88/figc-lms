/**
 * POST /api/admin/iscrivi-corso-bulk
 * Iscrive una lista di utenti già registrati a un corso.
 * Body: { courseId, studentIds: string[] }
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { courseId, studentIds } = await request.json()
  if (!courseId || !Array.isArray(studentIds) || studentIds.length === 0) {
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
  }

  const admin = createAdminClient()
  const rows = studentIds.map((id: string) => ({
    course_id: courseId,
    student_id: id,
    status: 'active',
    enrolled_at: new Date().toISOString(),
  }))

  const { error } = await admin
    .from('course_enrollments')
    .upsert(rows, { onConflict: 'course_id,student_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ enrolled: studentIds.length })
}
