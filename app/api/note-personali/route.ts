import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/note-personali — lista note dell'utente corrente (proprie + condivise)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data, error } = await supabase
    .from('notes')
    .select(`
      *,
      creator:profiles!created_by(id, full_name),
      shares:note_shares(id, shared_with, can_edit, shared_at, user:profiles!shared_with(id, full_name, email))
    `)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/note-personali — crea nuova nota
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['super_admin', 'docente'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { title, content, linkedCourseId, linkedModuleId, linkedDayId, linkedBlockId } = await request.json()

  const { data, error } = await supabase
    .from('notes')
    .insert({
      title: title || 'Nuova nota',
      content: content || null,
      created_by: user.id,
      linked_course_id: linkedCourseId || null,
      linked_module_id: linkedModuleId || null,
      linked_day_id: linkedDayId || null,
      linked_block_id: linkedBlockId || null,
    })
    .select('*, creator:profiles!created_by(id, full_name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
