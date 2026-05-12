'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Search, X, MessageSquare, Users,
  ChevronLeft, Megaphone,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import PushNotifButton from './PushNotifButton'
import GuideTooltip from '@/components/guida/GuideTooltip'
import NuovaConversazioneBtn from '@/app/(dashboard)/messaggi/NuovaConversazioneBtn'

// ── Tipi ────────────────────────────────────────────────────────────────────
export type ConvItem = {
  id: string
  type: string
  displayName: string
  otherUserId: string | null
  otherRole: string | null
  updatedAt: string
  lastMsg: { content: string; senderIsMe: boolean; type: string } | null
  hasUnread: boolean
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Admin', docente: 'Docente', studente: 'Corsista',
}
const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  docente:     'bg-blue-100 text-blue-700',
  studente:    'bg-green-100 text-green-700',
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function formatTime(iso: string) {
  const d   = new Date(iso)
  const now = new Date()
  const diffMs  = now.getTime() - d.getTime()
  const diffDay = Math.floor(diffMs / 86400000)
  if (diffDay === 0) return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  if (diffDay === 1) return 'Ieri'
  if (diffDay < 7)  return d.toLocaleDateString('it-IT', { weekday: 'short' })
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
}

function msgPreview(msg: ConvItem['lastMsg'], type: string) {
  if (!msg) return ''
  if (msg.type === 'image') return '📷 Immagine'
  if (msg.type === 'file')  return '📎 File'
  const prefix = type === 'direct' ? (msg.senderIsMe ? 'Tu: ' : '') : (msg.senderIsMe ? 'Tu: ' : '')
  return prefix + msg.content
}

// ── Avatar conversazione ─────────────────────────────────────────────────────
function ConvAvatar({ conv }: { conv: ConvItem }) {
  if (conv.type === 'broadcast') return (
    <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 bg-amber-100">
      <Megaphone size={18} className="text-amber-600" />
    </div>
  )
  if (conv.type === 'group') return (
    <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 bg-indigo-100">
      <Users size={18} className="text-indigo-600" />
    </div>
  )
  return (
    <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
      style={{ backgroundColor: '#1EB8E5' }}>
      {initials(conv.displayName)}
    </div>
  )
}

// ── Riga conversazione ────────────────────────────────────────────────────────
function ConvRow({ conv, isActive }: { conv: ConvItem; isActive: boolean }) {
  return (
    <Link
      href={`/messaggi/${conv.id}`}
      className={`flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer select-none
        ${isActive ? 'bg-blue-50' : conv.hasUnread ? 'bg-blue-50/40 hover:bg-blue-50/60' : 'hover:bg-gray-50'}
      `}
    >
      <div className="relative flex-shrink-0">
        <ConvAvatar conv={conv} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <p className={`text-sm truncate ${conv.hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
            {conv.displayName}
          </p>
          {conv.updatedAt && (
            <span className={`text-[11px] flex-shrink-0 ${conv.hasUnread ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
              {formatTime(conv.updatedAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <p className={`text-xs truncate ${conv.hasUnread ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
            {conv.lastMsg ? msgPreview(conv.lastMsg, conv.type) : (
              conv.otherRole ? (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${ROLE_COLORS[conv.otherRole] ?? 'bg-gray-100 text-gray-500'}`}>
                  {ROLE_LABELS[conv.otherRole] ?? conv.otherRole}
                </span>
              ) : null
            )}
          </p>
          {conv.hasUnread && (
            <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center px-1">
              ●
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

// ── Shell principale ──────────────────────────────────────────────────────────
export default function MessaggiShell({
  currentUserId,
  currentUserRole,
  conversations: initialConversations,
  children,
}: {
  currentUserId: string
  currentUserRole: string
  conversations: ConvItem[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const [conversations, setConversations] = useState<ConvItem[]>(initialConversations)
  const [search, setSearch]               = useState('')
  const [onlineUsers, setOnlineUsers]     = useState<Set<string>>(new Set())

  // Quando il layout si aggiorna (es. dopo router.refresh() per nuova conversazione),
  // aggiunge le nuove conversazioni che non erano ancora in lista locale
  useEffect(() => {
    setConversations(prev => {
      const prevIds = new Set(prev.map(c => c.id))
      const newConvs = initialConversations.filter(c => !prevIds.has(c.id))
      if (newConvs.length === 0) return prev
      return [...newConvs, ...prev]
    })
  }, [initialConversations])

  // Conversazione attiva estratta dal pathname
  const activeConvId = pathname.startsWith('/messaggi/')
    ? pathname.split('/messaggi/')[1]?.split('/')[0]
    : null

  // Mobile: mostra lista se non c'è conv attiva
  const showList = !activeConvId

  // ── Realtime: nuovi messaggi → aggiorna lista ─────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('shell-messages')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
      }, payload => {
        const msg = payload.new as { conversation_id: string; sender_id: string; content: string; created_at: string; type: string }
        setConversations(prev => {
          const idx = prev.findIndex(c => c.id === msg.conversation_id)
          // Conversazione non ancora in lista (appena creata) → forza reload del layout
          if (idx === -1) {
            router.refresh()
            return prev
          }
          const updated = [...prev]
          const conv = { ...updated[idx] }
          conv.lastMsg   = { content: msg.content, senderIsMe: msg.sender_id === currentUserId, type: msg.type }
          conv.updatedAt = msg.created_at
          conv.hasUnread = msg.sender_id !== currentUserId && msg.conversation_id !== activeConvId
          updated.splice(idx, 1)
          return [conv, ...updated]
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [currentUserId, activeConvId, supabase, router])

  // ── Presence: aggiorna stato online ──────────────────────────────────────
  useEffect(() => {
    const presenceChannel = supabase.channel('online-users', {
      config: { presence: { key: currentUserId } },
    })
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const ids   = new Set(Object.keys(state))
        setOnlineUsers(ids)
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ user_id: currentUserId, online_at: new Date().toISOString() })
        }
      })
    return () => { supabase.removeChannel(presenceChannel) }
  }, [currentUserId, supabase])

  // ── Quando si apre una conv, segna come letto ─────────────────────────────
  useEffect(() => {
    if (!activeConvId) return
    setConversations(prev => prev.map(c =>
      c.id === activeConvId ? { ...c, hasUnread: false } : c
    ))
  }, [activeConvId])

  const filtered = conversations.filter(c =>
    search.trim() === '' || c.displayName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-full overflow-hidden bg-white">

      {/* ── PANNELLO SINISTRO — Lista conversazioni ── */}
      <div className={`
        flex flex-col border-r border-gray-100 bg-white flex-shrink-0
        w-full lg:w-80 xl:w-96
        ${activeConvId ? 'hidden lg:flex' : 'flex'}
      `}>
        {/* Header lista */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold text-gray-900">Messaggi</h2>
              <GuideTooltip
                title="💬 Come funzionano i Messaggi"
                content="Puoi scrivere messaggi diretti a singoli utenti o a tutti gli studenti di un corso (gruppo). Clicca '+' per iniziare. Il pallino blu indica messaggi non letti."
                position="right"
                size="sm"
              />
            </div>
            <NuovaConversazioneBtn
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              compact
            />
          </div>
          {/* Pulsante notifiche push */}
          <PushNotifButton className="mb-2 px-1" />

          {/* Ricerca */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca conversazione..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-100 text-sm text-gray-800 placeholder-gray-400 outline-none focus:bg-gray-50 focus:ring-2 focus:ring-blue-500 transition"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Lista conversazioni */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <MessageSquare size={28} className="text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">
                {search ? 'Nessun risultato' : 'Nessuna conversazione'}
              </p>
              {!search && (
                <p className="mt-3 text-xs text-blue-600 font-medium">
                  Usa + per iniziare una nuova chat
                </p>
              )}
            </div>
          )}
          {filtered.map(conv => (
            <ConvRow
              key={conv.id}
              conv={{ ...conv }}
              isActive={conv.id === activeConvId}
            />
          ))}
        </div>
      </div>

      {/* ── PANNELLO DESTRO — Chat o Empty state ── */}
      <div className={`
        flex-1 flex flex-col overflow-hidden
        ${!activeConvId ? 'hidden lg:flex' : 'flex'}
      `}>
        {/* Bottone back su mobile */}
        {activeConvId && (
          <div className="flex lg:hidden items-center px-3 py-2 border-b border-gray-100 bg-white">
            <Link href="/messaggi" className="flex items-center gap-1.5 text-sm text-blue-600 font-medium">
              <ChevronLeft size={16} />Indietro
            </Link>
          </div>
        )}
        {children}
      </div>

    </div>
  )
}
