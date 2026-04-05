import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import MessaggiShell from '@/components/messaggi/MessaggiShell'

export default async function MessaggiLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const admin    = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()

  // Partecipazioni dell'utente — admin client bypassa RLS (sicuro: filtro esplicito user_id)
  const { data: participations } = await admin
    .from('conversation_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', user.id)

  const convIds     = (participations ?? []).map(p => p.conversation_id)
  const lastReadMap = new Map((participations ?? []).map(p => [p.conversation_id, p.last_read_at ?? '']))

  // Conversations con metadati (type, name, course_id, updated_at)
  type ConvMeta = { id: string; type: string; name: string | null; course_id: string | null; updated_at: string }
  let convMeta: ConvMeta[] = []
  if (convIds.length > 0) {
    const { data } = await admin
      .from('conversations')
      .select('id, type, name, course_id, updated_at')
      .in('id', convIds)
      .neq('is_suspended', true)   // include false + NULL (conversazioni non sospese)
      .order('updated_at', { ascending: false })
    convMeta = (data ?? []) as ConvMeta[]
  }

  // Ultimo messaggio per conv
  type LastMsg = { conversation_id: string; content: string; created_at: string; sender_id: string; type: string }
  let lastMessages: LastMsg[] = []
  if (convIds.length > 0) {
    const { data } = await admin
      .from('messages')
      .select('conversation_id, content, created_at, sender_id, type')
      .in('conversation_id', convIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    const seen = new Set<string>()
    for (const m of data ?? []) {
      if (!seen.has(m.conversation_id)) { seen.add(m.conversation_id); lastMessages.push(m as LastMsg) }
    }
  }

  // Altri partecipanti (per chat dirette → nome interlocutore)
  type OtherP = { conversation_id: string; user_id: string }
  let otherParticipants: OtherP[] = []
  if (convIds.length > 0) {
    const { data } = await admin
      .from('conversation_participants')
      .select('conversation_id, user_id')
      .in('conversation_id', convIds)
      .neq('user_id', user.id)
    otherParticipants = (data ?? []) as OtherP[]
  }

  const otherIds = [...new Set(otherParticipants.map(p => p.user_id))]
  type OtherProfile = { id: string; full_name: string; role: string }
  const { data: otherProfiles } = otherIds.length > 0
    ? await admin.from('profiles').select('id, full_name, role').in('id', otherIds)
    : { data: [] }
  const profileMap = new Map((otherProfiles ?? []).map((p) => [p.id, p as OtherProfile]))

  // Assembla conversazioni
  const conversations = convMeta.map(conv => {
    const lastMsg    = lastMessages.find(m => m.conversation_id === conv.id)
    const lastRead   = lastReadMap.get(conv.id) ?? ''
    const hasUnread  = !!lastMsg && lastMsg.sender_id !== user.id && (!lastRead || lastMsg.created_at > lastRead)

    // Nome conversazione
    let displayName = conv.name ?? 'Conversazione'
    let otherUserId: string | null = null
    let otherRole: string | null = null
    if (conv.type === 'direct') {
      const other = otherParticipants.find(p => p.conversation_id === conv.id)
      if (other) {
        otherUserId = other.user_id
        const p = profileMap.get(other.user_id)
        otherRole   = p?.role ?? null
        // Se la conversazione ha un nome esplicito (es. messaggio a corso/microgruppo), lo rispettiamo
        // Altrimenti mostriamo il nome dell'interlocutore
        if (!conv.name) {
          displayName = p?.full_name ?? 'Utente'
        }
      }
    }

    return {
      id:          conv.id,
      type:        conv.type,
      displayName,
      otherUserId,
      otherRole,
      updatedAt:   conv.updated_at,
      lastMsg:     lastMsg ? { content: lastMsg.content, senderIsMe: lastMsg.sender_id === user.id, type: lastMsg.type } : null,
      hasUnread,
    }
  })

  return (
    <MessaggiShell
      currentUserId={user.id}
      currentUserRole={profile?.role ?? 'studente'}
      conversations={conversations}
    >
      {children}
    </MessaggiShell>
  )
}
