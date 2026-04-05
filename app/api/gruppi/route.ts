/**
 * /api/gruppi
 * POST   — crea un gruppo (body: { courseId, name, description? })
 * PATCH  — modifica nome/descrizione (body: { groupId, name, description? })
 * DELETE — elimina un gruppo (body: { groupId })
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function authorize(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'docente'].includes(profile.role)) return null
  return { user, role: profile.role }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await authorize(supabase)
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { courseId, name, description } = await request.json()
  if (!courseId || !name?.trim()) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('course_groups')
    .insert({ course_id: courseId, name: name.trim(), description: description?.trim() || null })
    .select('id, name, description, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aggiunge automaticamente il creatore come istruttore del gruppo
  await admin.from('course_group_instructors').insert({
    group_id: data.id,
    instructor_id: auth.user.id,
  })

  return NextResponse.json({ group: data })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const auth = await authorize(supabase)
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { groupId, name, description } = await request.json()
  if (!groupId || !name?.trim()) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('course_groups')
    .update({ name: name.trim(), description: description?.trim() || null })
    .eq('id', groupId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const auth = await authorize(supabase)
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { groupId } = await request.json()
  if (!groupId) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('course_groups').delete().eq('id', groupId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
