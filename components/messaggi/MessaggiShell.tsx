'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Search, Plus, X, MessageSquare, Users, BookOpen,
  Loader2, ChevronLeft, Megaphone,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import PushNotifButton from './PushNotifButton'
import GuideTooltip from '@/components/guida/GuideTooltip'

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
      style={{ backgroundColor: '#1565C0' }}>
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

// ── Modal nuova conversazione (inline nella shell) ────────────────────────────
type Mode = 'singolo' | 'corso'
interface UserResult { id: string; full_name: string; role: string }
interface CourseResult { id: string; name: string }

function NuovoMessaggioModal({
  currentUserId,
  currentUserRole,
  onClose,
  onNavigate,
}: {
  currentUserId: string
  currentUserRole: string
  onClose: () => void
  onNavigate: (convId: string) => void
}) {
  const [mode, setMode]   = useState<Mode>('singolo')
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter]   = useState('')
  const [results, setResults]         = useState<UserResult[]>([])
  const [loading, setLoading]         = useState(false)
  const [selected, setSelected]       = useState<UserResult | null>(null)
  const [courses, setCourses]         = useState<CourseResult[]>([])
  const [selCourse, setSelCourse]     = useState<CourseResult | null>(null)
  const [message, setMessage]         = useState('')
  const [sending, setSending]         = useState(false)
  const [sentInfo, setSentInfo]       = useState<{ sent: number; total: number } | null>(null)
  const router = useRouter()

  const fetchUsers = useCallback(async (q: string, role: string) => {
    setLoading(true)
    const p = new URLSearchParams()
    if (q.length >= 2) p.set('q', q)
    if (role) p.set('role', role)
    const res = await fetch(`/api/messaggi/cerca-utenti?${p}`)
    const data = await res.json()
    setResults((data.users ?? []).filter((u: UserResult) => u.id !== currentUserId))
    setLoading(false)
  }, [currentUserId])

  useEffect(() => {
    fetchUsers('', '')
    if (currentUserRole !== 'studente') {
      fetch('/api/messaggi/corsi-docente').then(r => r.json()).then(d => setCourses(d.courses ?? []))
    }
  }, [fetchUsers, currentUserRole])

  useEffect(() => {
    if (mode !== 'singolo') return
    const t = setTimeout(() => fetchUsers(query, roleFilter), 280)
    return () => clearTimeout(t)
  }, [query, roleFilter, fetchUsers, mode])

  async function handleSendSingolo() {
    if (!selected || !message.trim() || sending) return
    setSending(true)
    const res = await fetch('/api/messaggi/crea', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otherUserId: selected.id, content: message.trim() }),
    })
    const data = await res.json()
    setSending(false)
    if (data.conversationId) { onClose(); onNavigate(data.conversationId) }
  }

  async function handleSendCorso() {
    if (!selCourse || !message.trim() || sending) return
    setSending(true)
    const res = await fetch('/api/messaggi/crea-gruppo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: selCourse.id, content: message.trim() }),
    })
    const data = await res.json()
    setSending(false)
    if (res.ok) { setSentInfo({ sent: data.sent, total: data.total }) }
  }

  const canSendToGroups = currentUserRole !== 'studente'
  const visibleFilters = [
    { value: '', label: 'Tutti' },
    ...(currentUserRole === 'studente' ? [] : [{ value: 'studente', label: 'Corsisti' }]),
    { value: 'docente', label: 'Docenti' },
    ...(currentUserRole === 'super_admin' ? [{ value: 'super_admin', label: 'Admin' }] : []),
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-sm">Nuovo messaggio</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={16} /></button>
        </div>

        {/* Tabs */}
        {canSendToGroups && (
          <div className="flex border-b border-gray-100">
            {[
              { key: 'singolo', label: 'Messaggio diretto' },
              { key: 'corso',   label: 'Gruppo corso' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => { setMode(t.key as Mode); setSelected(null); setMessage(''); setSelCourse(null); setSentInfo(null) }}
                className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition ${mode === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {/* ── SINGOLO ── */}
          {mode === 'singolo' && !selected && (
            <>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Cerca per nome..." className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {visibleFilters.map(f => (
                  <button key={f.value} onClick={() => setRoleFilter(f.value)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${roleFilter === f.value ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    style={roleFilter === f.value ? { backgroundColor: '#1565C0' } : {}}>
                    {f.label}
                  </button>
                ))}
              </div>
              {loading && <p className="text-xs text-gray-400 text-center py-2">Caricamento...</p>}
              {!loading && results.length === 0 && <p className="text-xs text-gray-400 text-center py-3">Nessun utente trovato</p>}
              {!loading && results.length > 0 && (
                <div className="border border-gray-100 rounded-xl overflow-x-hidden overflow-y-auto divide-y divide-gray-50 max-h-56">
                  {results.map(u => (
                    <button key={u.id} onClick={() => setSelected(u)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: '#1565C0' }}>
                        {initials(u.full_name)}
                      </div>
                      <p className="text-sm font-medium text-gray-900 flex-1 truncate min-w-0">{u.full_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {mode === 'singolo' && selected && (
            <>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ backgroundColor: '#1565C0' }}>
                  {initials(selected.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{selected.full_name}</p>
                  <p className="text-xs text-gray-500">{ROLE_LABELS[selected.role] ?? selected.role}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-red-500 transition"><X size={14} /></button>
              </div>
              <textarea autoFocus value={message} onChange={e => setMessage(e.target.value)} rows={3}
                placeholder="Scrivi il tuo messaggio..."
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSendSingolo() }}
              />
              <button onClick={handleSendSingolo} disabled={!message.trim() || sending}
                className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition flex items-center justify-center gap-2"
                style={{ backgroundColor: '#1565C0' }}>
                {sending ? <><Loader2 size={14} className="animate-spin" /> Invio...</> : 'Invia messaggio'}
              </button>
            </>
          )}

          {/* ── CORSO ── */}
          {mode === 'corso' && !sentInfo && !selCourse && (
            <>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Seleziona corso</p>
              {courses.length === 0 && <p className="text-xs text-gray-400 text-center py-3">Nessun corso disponibile</p>}
              <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                {courses.map(c => (
                  <button key={c.id} onClick={() => setSelCourse(c)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left">
                    <BookOpen size={14} className="text-blue-400 flex-shrink-0" />
                    <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          {mode === 'corso' && !sentInfo && selCourse && (
            <>
              <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-xl">
                <Users size={14} className="text-indigo-600 flex-shrink-0" />
                <p className="text-sm font-semibold text-gray-900 flex-1 truncate">{selCourse.name}</p>
                <button onClick={() => setSelCourse(null)} className="text-gray-400 hover:text-red-500 transition"><X size={14} /></button>
              </div>
              <p className="text-xs text-gray-500">Il messaggio sarà inviato a tutti i corsisti del corso.</p>
              <textarea autoFocus value={message} onChange={e => setMessage(e.target.value)} rows={3}
                placeholder="Scrivi il messaggio da inviare al gruppo..."
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              <button onClick={handleSendCorso} disabled={!message.trim() || sending}
                className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition flex items-center justify-center gap-2"
                style={{ backgroundColor: '#1565C0' }}>
                {sending ? <><Loader2 size={14} className="animate-spin" /> Invio...</> : <><Users size={14} /> Invia al gruppo</>}
              </button>
            </>
          )}

          {mode === 'corso' && sentInfo && (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <Users size={20} className="text-green-600" />
              </div>
              <p className="font-semibold text-gray-900 text-sm">Messaggi inviati!</p>
              <p className="text-xs text-gray-500 mt-1">{sentInfo.sent} di {sentInfo.total} corsisti raggiunti</p>
              <button onClick={onClose} className="mt-4 text-xs text-blue-600 hover:underline">Chiudi</button>
            </div>
          )}
        </div>
      </div>
    </div>
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
  const [showModal, setShowModal]         = useState(false)
  const [onlineUsers, setOnlineUsers]     = useState<Set<string>>(new Set())

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
            <button
              onClick={() => setShowModal(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:opacity-90 transition flex-shrink-0"
              style={{ backgroundColor: '#1565C0' }}
              title="Nuovo messaggio"
            >
              <Plus size={15} />
            </button>
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
                <button onClick={() => setShowModal(true)} className="mt-3 text-xs text-blue-600 font-medium hover:underline">
                  Inizia una nuova chat
                </button>
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

      {/* ── Modal nuovo messaggio ── */}
      {showModal && (
        <NuovoMessaggioModal
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onClose={() => setShowModal(false)}
          onNavigate={convId => {
            // Usa window.location per garantire un full-render del layout (inclusa lista conversazioni)
            window.location.href = `/messaggi/${convId}`
          }}
        />
      )}
    </div>
  )
}
