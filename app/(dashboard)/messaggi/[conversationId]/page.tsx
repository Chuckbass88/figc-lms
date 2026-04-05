import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { Users, Megaphone } from 'lucide-react'
import ChatClient, { type Message } from './ChatClient'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Admin', docente: 'Docente', studente: 'Corsista',
}

export default async function ConversazionePage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params
  const supabase = await createClient()
  const admin    = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Verifica partecipazione via admin client (bypassa RLS — il doppio filtro conversation_id + user_id garantisce sicurezza)
  const { data: myParticipation } = await admin
    .from('conversation_participants')
    .select('user_id, last_read_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .single()

  if (!myParticipation) notFound()

  // Metadati conversazione
  type ConvMeta = { id: string; type: string; name: string | null; course_id: string | null; is_suspended: boolean }
  const { data: conv } = await admin
    .from('conversations')
    .select('id, type, name, course_id, is_suspended')
    .eq('id', conversationId)
    .single() as { data: ConvMeta | null }

  if (!conv) notFound()

  // Profilo mio
  const { data: myProfile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()

  // Tutti i partecipanti (tranne me) con profilo
  const { data: otherParts } = await admin
    .from('conversation_participants')
    .select('user_id, last_read_at')
    .eq('conversation_id', conversationId)
    .neq('user_id', user.id)

  const otherIds = (otherParts ?? []).map(p => p.user_id)
  type OtherProfile = { id: string; full_name: string; role: string }
  const { data: otherProfiles } = otherIds.length > 0
    ? await admin.from('profiles').select('id, full_name, role').in('id', otherIds)
    : { data: [] }

  // Messaggi — ultimi 100
  const { data: messages } = await admin
    .from('messages')
    .select('id, sender_id, content, created_at, type, file_url, file_name, reply_to_id, deleted_at')
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(100)

  // Reazioni iniziali
  const msgIds = (messages ?? []).map(m => m.id)
  const { data: reactionsRaw } = msgIds.length > 0
    ? await admin.from('message_reactions').select('message_id, user_id, emoji').in('message_id', msgIds)
    : { data: [] }

  // Calcola last_read dell'altro (solo per chat dirette — primo altro partecipante)
  const otherParticipation = otherParts?.[0] ?? null
  const otherProfile       = (otherProfiles ?? []).find(p => p.id === otherParticipation?.user_id) as OtherProfile | null

  // Nome visualizzato
  let displayName   = conv.name ?? 'Conversazione'
  let displaySub    = ''
  let canWrite      = !conv.is_suspended
  if (conv.type === 'direct' && otherProfile) {
    // Se la conv ha un nome esplicito (es. messaggio a corso/microgruppo), lo rispettiamo come titolo;
    // altrimenti mostriamo il nome dell'interlocutore
    if (!conv.name) {
      displayName = otherProfile.full_name
      displaySub  = ROLE_LABELS[otherProfile.role] ?? otherProfile.role
    } else {
      displaySub = otherProfile.full_name  // nome interlocutore come sottotitolo
    }
  } else if (conv.type === 'group') {
    displaySub  = `${(otherParts ?? []).length + 1} partecipanti`
  } else if (conv.type === 'broadcast') {
    displaySub  = 'Canale broadcast — sola lettura'
    // Solo admin e docenti possono scrivere
    const role = myProfile?.role ?? 'studente'
    canWrite = canWrite && (role === 'super_admin' || role === 'docente')
  }

  const initials = (name: string) => name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        {conv.type === 'broadcast' ? (
          <div className="w-9 h-9 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Megaphone size={16} className="text-amber-600" />
          </div>
        ) : conv.type === 'group' ? (
          <div className="w-9 h-9 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Users size={16} className="text-indigo-600" />
          </div>
        ) : (
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ backgroundColor: '#1565C0' }}>
            {initials(displayName)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
          {displaySub && <p className="text-xs text-gray-400">{displaySub}</p>}
        </div>
        {conv.is_suspended && (
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-red-50 text-red-500">Sospesa</span>
        )}
      </div>

      {/* ── Chat ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ChatClient
          conversationId={conversationId}
          currentUserId={user.id}
          currentUserName={myProfile?.full_name ?? 'Tu'}
          otherUserName={otherProfile?.full_name ?? displayName}
          otherUserId={otherProfile?.id ?? null}
          otherLastRead={otherParticipation?.last_read_at ?? null}
          convType={conv.type}
          canWrite={canWrite}
          initialMessages={(messages ?? []) as Message[]}
        />
      </div>
    </div>
  )
}
