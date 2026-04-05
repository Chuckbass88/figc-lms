/**
 * PUT /api/messaggi/leggi
 * Aggiorna last_read_at per la conversazione corrente.
 * Body: { conversationId }
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { conversationId } = await request.json()
  if (!conversationId) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  // Admin client bypassa RLS — sicuro: filtro esplicito conversation_id + user_id
  const admin = createAdminClient()
  await admin
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
