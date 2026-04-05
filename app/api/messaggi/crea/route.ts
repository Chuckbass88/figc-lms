/**
 * POST /api/messaggi/crea
 * Crea o trova una conversazione 1:1 tra caller e otherUserId,
 * poi invia il primo messaggio.
 * Body: { otherUserId, content }
 * Returns: { conversationId }
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { otherUserId, content } = await request.json()
  if (!otherUserId || !content?.trim()) {
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
  }
  if (otherUserId === user.id) {
    return NextResponse.json({ error: 'Non puoi scrivere a te stesso' }, { status: 400 })
  }

  // Cerca conversazione 1:1 esistente tra i due utenti
  // Una conversazione 1:1 ha esattamente 2 partecipanti: user.id e otherUserId
  const admin = createAdminClient()

  const { data: myConvs } = await admin
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', user.id)

  const myConvIds = (myConvs ?? []).map(c => c.conversation_id)

  let conversationId: string | null = null

  if (myConvIds.length > 0) {
    const { data: shared } = await admin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', otherUserId)
      .in('conversation_id', myConvIds)

    if (shared && shared.length > 0) {
      conversationId = shared[0].conversation_id
    }
  }

  // Se non esiste, crea conversazione + partecipanti
  if (!conversationId) {
    const { data: conv, error: convErr } = await admin
      .from('conversations')
      .insert({ type: 'direct', is_suspended: false })
      .select('id')
      .single()

    if (convErr || !conv) {
      console.error('[messaggi/crea] conv error:', JSON.stringify(convErr))
      return NextResponse.json({ error: convErr?.message ?? 'Errore creazione conv' }, { status: 500 })
    }

    conversationId = conv.id

    const { error: cpErr } = await admin.from('conversation_participants').insert([
      { conversation_id: conversationId, user_id: user.id },
      { conversation_id: conversationId, user_id: otherUserId },
    ])
    if (cpErr) {
      console.error('[messaggi/crea] participants error:', JSON.stringify(cpErr))
      return NextResponse.json({ error: cpErr.message }, { status: 500 })
    }
  }

  // Invia il messaggio
  const { error: msgErr } = await admin.from('messages').insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: content.trim(),
  })

  if (msgErr) {
    console.error('[messaggi/crea] msg error:', JSON.stringify(msgErr))
    return NextResponse.json({ error: msgErr.message }, { status: 500 })
  }

  // Notifica in-app all'altro utente
  await supabase.from('notifications').insert({
    user_id: otherUserId,
    type:    'message',
    title:   'Nuovo messaggio',
    body:    'Hai ricevuto un nuovo messaggio.',
    data:    { url: `/messaggi/${conversationId}` },
  })

  return NextResponse.json({ conversationId })
}
