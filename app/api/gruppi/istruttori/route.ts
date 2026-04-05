/**
 * /api/gruppi/istruttori
 * POST   — aggiunge un docente al gruppo (body: { groupId, instructorId })
 * DELETE — rimuove un docente dal gruppo (body: { groupId, instructorId })
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

  const { groupId, instructorId } = await request.json()
  if (!groupId || !instructorId) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('course_group_instructors')
    .insert({ group_id: groupId, instructor_id: instructorId })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const user = await authorize(supabase)
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { groupId, instructorId } = await request.json()
  if (!groupId || !instructorId) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('course_group_instructors')
    .delete()
    .eq('group_id', groupId)
    .eq('instructor_id', instructorId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
