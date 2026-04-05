/**
 * /api/gruppi/membri
 * POST   — aggiunge un corsista al gruppo (body: { groupId, studentId })
 * DELETE — rimuove un corsista dal gruppo (body: { groupId, studentId })
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function authorize(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'docente'].includes(profile.role)) return null
  return user
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const user = await authorize(supabase)
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { groupId, studentId } = await request.json()
  if (!groupId || !studentId) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('course_group_members').insert({ group_id: groupId, student_id: studentId })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const user = await authorize(supabase)
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { groupId, studentId } = await request.json()
  if (!groupId || !studentId) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('course_group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('student_id', studentId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
