/**
 * POST /api/messaggi/invia
 * Aggiunge un messaggio a una conversazione esistente.
 * Body: { conversationId, content, type?, file_url?, file_name?, file_size?, file_mime? }
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { sendPushToUsers } from '@/lib/push'
import { sendExpoNotificationsToUsers } from '@/lib/expo-push'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const body = await request.json()
  const { conversationId, content, type = 'text', file_url, file_name, file_size, file_mime } = body

  if (!conversationId) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
  if (type === 'text' && !content?.trim()) return NextResponse.json({ error: 'Messaggio vuoto' }, { status: 400 })

  // Admin client per check interni (bypassa RLS — sicuro: filtri espliciti su id + user_id)
  const admin = createAdminClient()

  // Verifica conversazione non sospesa
  const { data: conv } = await admin
    .from('conversations')
    .select('is_suspended, type')
    .eq('id', conversationId)
    .single()

  if (!conv || conv.is_suspended) return NextResponse.json({ error: 'Conversazione non disponibile' }, { status: 403 })

  // Broadcast: solo admin/docente
  if (conv.type === 'broadcast') {
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || (profile.role !== 'super_admin' && profile.role !== 'docente')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }
  }

  // Verifica partecipazione (sicuro: filtro conversation_id + user_id)
  const { data: participant } = await admin
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .single()

  if (!participant) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const insertData: Record<string, unknown> = {
    conversation_id: conversationId,
    sender_id: user.id,
    type,
    content: type === 'text' ? content.trim() : (content ?? ''),
  }
  if (file_url)  insertData.file_url  = file_url
  if (file_name) insertData.file_name = file_name
  if (file_size) insertData.file_size = file_size
  if (file_mime) insertData.file_mime = file_mime

  const { data: msg, error } = await supabase
    .from('messages').insert(insertData).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notifica in-app agli altri partecipanti
  const { data: others } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .neq('user_id', user.id)

  if (others && others.length > 0) {
    const { data: senderProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    const msgPreview = type === 'text' ? (content?.slice(0, 80) ?? '') : type === 'image' ? '📷 Immagine' : `📎 ${file_name ?? 'File'}`
    const senderName = senderProfile?.full_name ?? 'Qualcuno'

    // Notifica in-app
    await supabase.from('notifications').insert(
      others.map(o => ({
        user_id: o.user_id,
        type:    'message',
        title:   `Messaggio da ${senderName}`,
        body:    msgPreview,
        data:    { url: `/messaggi/${conversationId}` },
      }))
    )

    // Web Push — solo per utenti con notifiche abilitate
    const otherIds = others.map(o => o.user_id)
    const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? ''
    sendPushToUsers(otherIds, {
      title: `💬 ${senderName}`,
      body:  msgPreview,
      url:   `${siteUrl}/messaggi/${conversationId}`,
      tag:   `conv-${conversationId}`,
    }).catch(() => {}) // fire-and-forget

    // Expo Push (mobile iOS/Android)
    sendExpoNotificationsToUsers(otherIds, {
      title: `💬 ${senderName}`,
      body:  msgPreview,
      url:   `/messaggi/${conversationId}`,
    }).catch(() => {}) // fire-and-forget
  }

  return NextResponse.json({ message: msg })
}
