import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

// POST — aggiungi/aggiorna condivisione
export async function POST(request: Request, { params }: Params) {
  const { id: noteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { sharedWith, canEdit } = await request.json()
  if (!sharedWith) return NextResponse.json({ error: 'sharedWith mancante' }, { status: 400 })

  const { data, error } = await supabase
    .from('note_shares')
    .upsert({ note_id: noteId, shared_with: sharedWith, can_edit: canEdit ?? false }, { onConflict: 'note_id,shared_with' })
    .select('*, user:profiles!shared_with(id, full_name, email)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notifica al destinatario
  await supabase.from('notifications').insert({
    user_id: sharedWith,
    title: 'Nota condivisa con te',
    message: `Una nota è stata condivisa con te.`,
    read: false,
  })

  return NextResponse.json(data)
}

// DELETE — rimuovi condivisione
export async function DELETE(request: Request, { params }: Params) {
  const { id: noteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { sharedWith } = await request.json()
  const { error } = await supabase.from('note_shares').delete().eq('note_id', noteId).eq('shared_with', sharedWith)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
