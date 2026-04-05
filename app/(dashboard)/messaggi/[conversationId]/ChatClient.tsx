'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Loader2, Check, CheckCheck, Paperclip, Smile, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ── Tipi ──────────────────────────────────────────────────────────────────────
export interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
  type: string
  file_url?: string | null
  file_name?: string | null
  reply_to_id?: string | null
  deleted_at?: string | null
}

interface Reaction {
  emoji: string
  user_id: string
}

interface Props {
  conversationId:   string
  currentUserId:    string
  currentUserName:  string
  otherUserName:    string
  otherUserId:      string | null
  otherLastRead:    string | null   // last_read_at dell'altro partecipante
  convType:         string           // 'direct' | 'group' | 'broadcast'
  canWrite:         boolean
  initialMessages:  Message[]
}

// ── Emoji rapide per reazioni ─────────────────────────────────────────────────
const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

// ── Formato ora ────────────────────────────────────────────────────────────────
function formatTime(dateStr: string) {
  const d   = new Date(dateStr)
  const now = new Date()
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) + ' ' +
         d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

// ── Separatore data ────────────────────────────────────────────────────────────
function dateSeparator(dateStr: string) {
  const d   = new Date(dateStr)
  const now = new Date()
  const diffDay = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDay === 0) return 'Oggi'
  if (diffDay === 1) return 'Ieri'
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

function toDateKey(iso: string) {
  return iso.split('T')[0]
}

// ── Bolla messaggio ────────────────────────────────────────────────────────────
function MessageBubble({
  msg, isMe, showAvatar, avatarInitials, isRead,
  reactions, onReact, currentUserId, replyMsg,
}: {
  msg:           Message
  isMe:          boolean
  showAvatar:    boolean
  avatarInitials:string
  isRead:        boolean
  reactions:     Reaction[]
  onReact:       (msgId: string, emoji: string) => void
  currentUserId: string
  replyMsg?:     Message | null
}) {
  const [showEmoji, setShowEmoji] = useState(false)
  const isDeleted = !!msg.deleted_at

  // Raggruppa reazioni per emoji
  const reactionGroups: Record<string, { count: number; mine: boolean }> = {}
  for (const r of reactions) {
    if (!reactionGroups[r.emoji]) reactionGroups[r.emoji] = { count: 0, mine: false }
    reactionGroups[r.emoji].count++
    if (r.user_id === currentUserId) reactionGroups[r.emoji].mine = true
  }

  return (
    <div className={`flex items-end gap-2 group ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar (altri) */}
      {!isMe && (
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mb-0.5 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}
          style={{ backgroundColor: '#1565C0' }}>
          {avatarInitials}
        </div>
      )}

      <div className={`relative max-w-[72%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Reply reference */}
        {replyMsg && !isDeleted && (
          <div className={`mb-1 px-3 py-1.5 rounded-xl text-xs border-l-4 opacity-70 max-w-full ${
            isMe ? 'bg-blue-600/20 border-blue-300 text-blue-900' : 'bg-gray-100 border-gray-400 text-gray-600'
          }`}>
            <p className="font-semibold truncate">{replyMsg.sender_id === currentUserId ? 'Tu' : avatarInitials}</p>
            <p className="truncate">{replyMsg.content}</p>
          </div>
        )}

        {/* Bolla */}
        <div
          className={`relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words cursor-pointer select-text ${
            isDeleted ? 'opacity-50 italic' :
            isMe
              ? 'text-white rounded-br-sm'
              : 'bg-white border border-gray-100 text-gray-900 rounded-bl-sm shadow-sm'
          }`}
          style={isMe && !isDeleted ? { backgroundColor: '#1565C0' } : {}}
          onClick={() => !isDeleted && setShowEmoji(v => !v)}
        >
          {isDeleted ? (
            <span className="text-gray-400 text-xs">Messaggio eliminato</span>
          ) : msg.type === 'image' && msg.file_url ? (
            <img src={msg.file_url} alt={msg.file_name ?? 'img'} className="max-w-xs rounded-xl" />
          ) : msg.type === 'file' && msg.file_url ? (
            <a href={msg.file_url} target="_blank" rel="noopener" className="flex items-center gap-2 underline">
              <Paperclip size={13} />{msg.file_name ?? 'File allegato'}
            </a>
          ) : (
            <span className="whitespace-pre-wrap">{msg.content}</span>
          )}
        </div>

        {/* Reazioni */}
        {Object.keys(reactionGroups).length > 0 && (
          <div className={`flex gap-1 mt-1 flex-wrap ${isMe ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(reactionGroups).map(([emoji, { count, mine }]) => (
              <button
                key={emoji}
                onClick={() => onReact(msg.id, emoji)}
                className={`flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-full border transition ${
                  mine ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {emoji} {count > 1 && count}
              </button>
            ))}
          </div>
        )}

        {/* Picker emoji reazioni */}
        {showEmoji && !isDeleted && (
          <div className={`absolute bottom-full mb-1 flex gap-1 bg-white shadow-lg rounded-xl px-2 py-1.5 border border-gray-100 z-10 ${isMe ? 'right-0' : 'left-0'}`}>
            {QUICK_EMOJIS.map(e => (
              <button key={e} onClick={() => { onReact(msg.id, e); setShowEmoji(false) }}
                className="text-lg hover:scale-125 transition-transform leading-none p-0.5">
                {e}
              </button>
            ))}
          </div>
        )}

        {/* Ora + spunte */}
        <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-[10px] text-gray-400">{formatTime(msg.created_at)}</span>
          {isMe && !isDeleted && (
            isRead
              ? <CheckCheck size={12} className="text-blue-500" />
              : <Check size={12} className="text-gray-400" />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Componente principale ─────────────────────────────────────────────────────
export default function ChatClient({
  conversationId, currentUserId, currentUserName, otherUserName,
  otherUserId, otherLastRead, convType, canWrite, initialMessages,
}: Props) {
  const [messages,   setMessages]   = useState<Message[]>(initialMessages)
  const [reactions,  setReactions]  = useState<Record<string, Reaction[]>>({})
  const [content,    setContent]    = useState('')
  const [sending,    setSending]    = useState(false)
  const [sendError,  setSendError]  = useState(false)
  const [isTyping,   setIsTyping]   = useState(false)   // l'altro sta scrivendo
  const [otherRead,  setOtherRead]  = useState<string | null>(otherLastRead)  // timestamp ultimo read
  const [uploading,  setUploading]  = useState(false)

  const bottomRef       = useRef<HTMLDivElement>(null)
  const containerRef    = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const myTypingRef     = useRef(false)
  const supabase        = createClient()

  const otherInitials = otherUserName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  // Segna come letti all'apertura e su ogni nuovo messaggio ricevuto
  const markRead = useCallback(() => {
    fetch('/api/messaggi/leggi', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId }),
    })
  }, [conversationId])

  useEffect(() => { markRead() }, [markRead])

  // Scroll al fondo
  const scrollToBottom = useCallback((smooth = true) => {
    const c = containerRef.current
    if (!c) return
    const nearBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 180
    if (nearBottom || !smooth) bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  useEffect(() => { scrollToBottom(false) }, []) // primo render
  useEffect(() => { scrollToBottom(true) }, [messages, scrollToBottom])

  // ── Realtime: messaggi ────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, payload => {
        const msg = payload.new as Message
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
        if (msg.sender_id !== currentUserId) markRead()
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, payload => {
        const msg = payload.new as Message
        setMessages(prev => prev.map(m => m.id === msg.id ? msg : m))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [conversationId, currentUserId, markRead, supabase])

  // ── Realtime: typing indicator ────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on('broadcast', { event: 'typing' }, payload => {
        if (payload.payload?.userId === currentUserId) return
        setIsTyping(true)
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000)
      })
      .on('broadcast', { event: 'read' }, payload => {
        if (payload.payload?.userId !== currentUserId) {
          setOtherRead(payload.payload?.timestamp ?? null)
        }
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
      clearTimeout(typingTimeoutRef.current)
    }
  }, [conversationId, currentUserId, supabase])

  // ── Realtime: reazioni ────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`reactions:${conversationId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'message_reactions',
      }, payload => {
        if (payload.eventType === 'INSERT') {
          const r = payload.new as { message_id: string; user_id: string; emoji: string }
          setReactions(prev => {
            const list = prev[r.message_id] ?? []
            return { ...prev, [r.message_id]: [...list, { emoji: r.emoji, user_id: r.user_id }] }
          })
        } else if (payload.eventType === 'DELETE') {
          const r = payload.old as { message_id: string; user_id: string; emoji: string }
          setReactions(prev => {
            const list = (prev[r.message_id] ?? []).filter(x => !(x.user_id === r.user_id && x.emoji === r.emoji))
            return { ...prev, [r.message_id]: list }
          })
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [conversationId, supabase])

  // ── Invio typing broadcast ────────────────────────────────────────────────
  const sendTyping = useCallback(() => {
    if (myTypingRef.current) return
    myTypingRef.current = true
    supabase.channel(`typing:${conversationId}`).send({
      type: 'broadcast', event: 'typing',
      payload: { userId: currentUserId },
    })
    setTimeout(() => { myTypingRef.current = false }, 2500)
  }, [conversationId, currentUserId, supabase])

  // ── Invia messaggio testo ─────────────────────────────────────────────────
  async function handleSend() {
    if (!content.trim() || sending) return
    setSending(true); setSendError(false)
    const res = await fetch('/api/messaggi/invia', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, content: content.trim() }),
    })
    if (!res.ok) { setSendError(true); setSending(false); return }
    const data = await res.json()
    if (data.message) setMessages(prev => prev.some(m => m.id === data.message.id) ? prev : [...prev, data.message])
    setContent('')
    setSending(false)
    scrollToBottom(true)
  }

  // ── Upload file/immagine ──────────────────────────────────────────────────
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const isImage = file.type.startsWith('image/')
    if (file.size > 20 * 1024 * 1024) { alert('File troppo grande (max 20 MB)'); return }
    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `${conversationId}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('chat-media').upload(path, file)
    if (upErr) { alert('Errore upload: ' + upErr.message); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(path)
    await fetch('/api/messaggi/invia', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        content:   isImage ? '' : file.name,
        type:      isImage ? 'image' : 'file',
        file_url:  urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
        file_mime: file.type,
      }),
    })
    setUploading(false)
    e.target.value = ''
  }

  // ── Reazione ─────────────────────────────────────────────────────────────
  async function handleReact(msgId: string, emoji: string) {
    const alreadyMine = (reactions[msgId] ?? []).some(r => r.user_id === currentUserId && r.emoji === emoji)
    if (alreadyMine) {
      await supabase.from('message_reactions')
        .delete().eq('message_id', msgId).eq('user_id', currentUserId).eq('emoji', emoji)
    } else {
      await supabase.from('message_reactions')
        .upsert({ message_id: msgId, user_id: currentUserId, emoji })
    }
  }

  // ── Read receipts: check se l'ultimo msg mio è stato letto ───────────────
  const lastMyMsgTime = [...messages].reverse().find(m => m.sender_id === currentUserId)?.created_at ?? null
  const isLastMsgRead = !!lastMyMsgTime && !!otherRead && otherRead >= lastMyMsgTime

  // ── Raggruppa messaggi per data ───────────────────────────────────────────
  const groupedMessages: Array<{ date: string; msgs: Message[] }> = []
  let currentDate = ''
  for (const m of messages) {
    const d = toDateKey(m.created_at)
    if (d !== currentDate) { currentDate = d; groupedMessages.push({ date: d, msgs: [] }) }
    groupedMessages[groupedMessages.length - 1].msgs.push(m)
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Area messaggi ── */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1" style={{ background: '#F5F7FA' }}>
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400 text-center">Nessun messaggio. Inizia la conversazione!</p>
          </div>
        )}

        {groupedMessages.map(({ date, msgs }) => (
          <div key={date} className="space-y-1">
            {/* Separatore data */}
            <div className="flex items-center gap-3 py-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[11px] font-medium text-gray-400 flex-shrink-0">{dateSeparator(date + 'T12:00:00')}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {msgs.map((msg, idx) => {
              const isMe       = msg.sender_id === currentUserId
              const nextMsg    = msgs[idx + 1]
              const showAvatar = !isMe && (idx === msgs.length - 1 || nextMsg?.sender_id !== msg.sender_id)
              const msgReacts  = reactions[msg.id] ?? []

              // La spunta ✓✓ si applica all'ultimo mio messaggio
              const isLastMine = isMe && msg === [...messages].reverse().find(m => m.sender_id === currentUserId)
              const isRead     = isLastMine && isLastMsgRead

              return (
                <div key={msg.id} className={`${idx === 0 ? '' : nextMsg?.sender_id !== msg.sender_id ? 'mt-3' : 'mt-0.5'}`}>
                  <MessageBubble
                    msg={msg}
                    isMe={isMe}
                    showAvatar={showAvatar}
                    avatarInitials={otherInitials}
                    isRead={isRead}
                    reactions={msgReacts}
                    onReact={handleReact}
                    currentUserId={currentUserId}
                  />
                </div>
              )
            })}
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-end gap-2 mt-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mb-0.5" style={{ backgroundColor: '#1565C0' }}>
              {otherInitials}
            </div>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-1">
              {[0, 150, 300].map(delay => (
                <div key={delay} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: `${delay}ms`, animationDuration: '1s' }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      {canWrite && (
        <div className="border-t border-gray-100 px-4 py-3 bg-white">
          {sendError && (
            <p className="text-xs text-red-500 mb-2 flex items-center gap-1">
              <X size={11} />Errore invio. Riprova.
            </p>
          )}
          <div className="flex items-end gap-2">
            {/* Upload file */}
            <label className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition cursor-pointer ${uploading ? 'opacity-40 pointer-events-none' : ''}`}>
              <Paperclip size={17} />
              <input type="file" className="hidden" onChange={handleFileUpload}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.csv" />
            </label>

            {/* Textarea */}
            <textarea
              value={content}
              onChange={e => { setContent(e.target.value); sendTyping() }}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSend() }
              }}
              placeholder="Scrivi un messaggio... (⌘↵ per inviare)"
              rows={1}
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition"
              style={{ minHeight: '40px', maxHeight: '128px' }}
              onInput={e => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 128) + 'px'
              }}
            />

            {/* Invia */}
            <button
              onClick={handleSend}
              disabled={!content.trim() || sending || uploading}
              className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-40 hover:opacity-90 transition"
              style={{ backgroundColor: '#1565C0' }}
            >
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
          <p className="text-[10px] text-gray-300 mt-1 text-right">⌘↵ per inviare</p>
        </div>
      )}

      {!canWrite && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 text-center">
          <p className="text-xs text-gray-400">Canale di sola lettura</p>
        </div>
      )}
    </div>
  )
}
