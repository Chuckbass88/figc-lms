'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Search, Loader2, Users, BookOpen, MessageCircle, UserPlus } from 'lucide-react'

interface UserResult { id: string; full_name: string; role: string }
interface Group { id: string; name: string }
interface Course { id: string; name: string; groups: Group[] }

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Admin', docente: 'Docente', studente: 'Corsista',
}
const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  docente: 'bg-blue-100 text-blue-700',
  studente: 'bg-green-100 text-green-700',
}
const ROLE_FILTERS = [
  { value: '', label: 'Tutti' },
  { value: 'studente', label: 'Corsisti' },
  { value: 'docente', label: 'Docenti' },
  { value: 'super_admin', label: 'Admin' },
]

type Mode = 'singolo' | 'libero' | 'corso' | 'microgruppo'

const TABS: { key: Mode; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: 'singolo',    label: 'Singolo',     icon: <MessageCircle size={12} />, desc: 'Chat 1:1 con un utente' },
  { key: 'libero',     label: 'Libero',      icon: <UserPlus size={12} />,      desc: 'Gruppo con partecipanti a scelta' },
  { key: 'corso',      label: 'Tutto il corso', icon: <BookOpen size={12} />,   desc: 'Tutti i corsisti + docente' },
  { key: 'microgruppo',label: 'Microgruppo', icon: <Users size={12} />,         desc: 'Un microgruppo del corso' },
]

export default function NuovaConversazioneBtn({
  currentUserId,
  currentUserRole,
  compact = false,
}: {
  currentUserId: string
  currentUserRole: string
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('singolo')

  // Singolo
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [results, setResults] = useState<UserResult[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null)

  // Libero — multi-select partecipanti
  const [selectedParticipants, setSelectedParticipants] = useState<UserResult[]>([])
  const [groupName, setGroupName] = useState('')

  // Corso / Microgruppo
  const [courses, setCourses] = useState<Course[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)

  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const router = useRouter()

  function resetAll() {
    setQuery(''); setResults([]); setSelectedUser(null); setMessage('')
    setRoleFilter(''); setSelectedCourse(null); setSelectedGroup(null)
    setSelectedParticipants([]); setGroupName('')
  }

  const fetchUsers = useCallback(async (q: string, role: string) => {
    if (q.length > 0 && q.length < 2) return
    setLoadingUsers(true)
    const params = new URLSearchParams()
    if (q.length >= 2) params.set('q', q)
    if (role) params.set('role', role)
    const res = await fetch(`/api/messaggi/cerca-utenti?${params}`)
    const data = await res.json()
    setResults((data.users ?? []).filter((u: UserResult) => u.id !== currentUserId))
    setLoadingUsers(false)
  }, [currentUserId])

  const fetchCourses = useCallback(async () => {
    setLoadingCourses(true)
    const res = await fetch('/api/messaggi/corsi-docente')
    const data = await res.json()
    setCourses(data.courses ?? [])
    setLoadingCourses(false)
  }, [])

  useEffect(() => {
    if (!open) { resetAll(); setMode('singolo') }
    else {
      fetchUsers('', '')
      if (currentUserRole !== 'studente') fetchCourses()
    }
  }, [open, fetchUsers, fetchCourses, currentUserRole])

  useEffect(() => {
    if (mode === 'singolo' || mode === 'libero') {
      const t = setTimeout(() => fetchUsers(query, roleFilter), 300)
      return () => clearTimeout(t)
    }
  }, [query, roleFilter, fetchUsers, mode])

  // ── Handlers ──────────────────────────────────────────────────────

  async function handleSendSingolo() {
    if (!selectedUser || !message.trim()) return
    setSending(true)
    const res = await fetch('/api/messaggi/crea', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otherUserId: selectedUser.id, content: message.trim() }),
    })
    const data = await res.json()
    setSending(false)
    if (data.conversationId) { setOpen(false); router.push(`/messaggi/${data.conversationId}`) }
  }

  async function handleCreaGruppo(group_type: 'corso' | 'microgruppo' | 'libero') {
    if (!message.trim()) return
    if ((group_type === 'corso' || group_type === 'microgruppo') && !selectedCourse) return
    if (group_type === 'microgruppo' && !selectedGroup) return
    if (group_type === 'libero' && selectedParticipants.length === 0) return

    setSending(true)
    const body: Record<string, unknown> = { group_type, content: message.trim() }
    if (group_type === 'corso') body.course_id = selectedCourse!.id
    if (group_type === 'microgruppo') { body.course_id = selectedCourse!.id; body.group_id = selectedGroup!.id }
    if (group_type === 'libero') {
      body.participant_ids = selectedParticipants.map(p => p.id)
      if (groupName.trim()) body.name = groupName.trim()
    }

    const res = await fetch('/api/messaggi/crea-gruppo-custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setSending(false)
    if (res.ok && data.conversationId) { setOpen(false); router.push(`/messaggi/${data.conversationId}`) }
  }

  const isDocente = currentUserRole !== 'studente'

  // Utenti non ancora selezionati nel gruppo libero
  const availableForLibero = results.filter(u => !selectedParticipants.some(p => p.id === u.id))

  return (
    <>
      {compact ? (
        <button
          onClick={() => setOpen(true)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:opacity-90 transition flex-shrink-0"
          style={{ backgroundColor: '#1EB8E5' }}
          title="Nuovo messaggio"
        >
          <Plus size={15} />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition"
          style={{ backgroundColor: '#1EB8E5' }}
        >
          <Plus size={14} /> Nuovo messaggio
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="font-bold text-gray-900">Nuovo messaggio</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={18} />
              </button>
            </div>

            {/* Tab modalità (solo docente/admin) */}
            {isDocente && (
              <div className="flex border-b border-gray-100 flex-shrink-0 overflow-x-auto">
                {TABS.map(t => (
                  <button
                    key={t.key}
                    onClick={() => { setMode(t.key); resetAll() }}
                    title={t.desc}
                    className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition border-b-2 whitespace-nowrap ${
                      mode === t.key
                        ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            )}

            <div className="p-5 space-y-3 overflow-y-auto flex-1">

              {/* ── SINGOLO ── */}
              {mode === 'singolo' && (
                !selectedUser ? (
                  <>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)}
                        placeholder="Cerca per nome..."
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {(isDocente ? ROLE_FILTERS : ROLE_FILTERS.filter(f => f.value !== 'super_admin')).map(f => (
                        <button key={f.value} onClick={() => setRoleFilter(f.value)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition ${roleFilter === f.value ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                          style={roleFilter === f.value ? { backgroundColor: '#1EB8E5' } : {}}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                    {loadingUsers && <p className="text-xs text-gray-400 text-center py-2">Caricamento...</p>}
                    {!loadingUsers && results.length > 0 && (
                      <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50 max-h-56 overflow-y-auto">
                        {results.map(u => (
                          <button key={u.id} onClick={() => setSelectedUser(u)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: '#1EB8E5' }}>
                              {u.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                            </div>
                            <p className="text-sm font-medium text-gray-900 truncate flex-1">{u.full_name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                              {ROLE_LABELS[u.role] ?? u.role}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ backgroundColor: '#1EB8E5' }}>
                        {selectedUser.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <p className="text-sm font-semibold text-gray-900 flex-1 truncate">{selectedUser.full_name}</p>
                      <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-red-500 transition"><X size={14} /></button>
                    </div>
                    <textarea autoFocus value={message} onChange={e => setMessage(e.target.value)}
                      placeholder="Scrivi il tuo messaggio..." rows={4}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSendSingolo() }} />
                    <button onClick={handleSendSingolo} disabled={!message.trim() || sending}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition"
                      style={{ backgroundColor: '#1EB8E5' }}>
                      {sending ? <><Loader2 size={14} className="animate-spin" /> Invio...</> : 'Invia messaggio'}
                    </button>
                  </>
                )
              )}

              {/* ── LIBERO ── */}
              {mode === 'libero' && (
                <>
                  <p className="text-xs text-gray-400">Crea un gruppo con i partecipanti che vuoi. Tu sarai moderatore.</p>
                  <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)}
                    placeholder="Nome gruppo (opzionale)"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {/* Partecipanti selezionati */}
                  {selectedParticipants.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedParticipants.map(p => (
                        <span key={p.id} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {p.full_name.split(' ')[0]}
                          <button onClick={() => setSelectedParticipants(prev => prev.filter(x => x.id !== p.id))}>
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Cerca utenti */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                      placeholder="Aggiungi partecipanti..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  {availableForLibero.length > 0 && (
                    <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50 max-h-40 overflow-y-auto">
                      {availableForLibero.map(u => (
                        <button key={u.id} onClick={() => { setSelectedParticipants(prev => [...prev, u]); setQuery('') }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition text-left">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: '#1EB8E5' }}>
                            {u.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                          </div>
                          <p className="text-sm font-medium text-gray-900 flex-1 truncate">{u.full_name}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${ROLE_COLORS[u.role] ?? 'bg-gray-100'}`}>
                            {ROLE_LABELS[u.role] ?? u.role}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedParticipants.length > 0 && (
                    <>
                      <textarea value={message} onChange={e => setMessage(e.target.value)}
                        placeholder="Primo messaggio del gruppo..." rows={3}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                      <button onClick={() => handleCreaGruppo('libero')} disabled={!message.trim() || sending}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition"
                        style={{ backgroundColor: '#1EB8E5' }}>
                        {sending ? <><Loader2 size={14} className="animate-spin" /> Creazione...</> : <><UserPlus size={14} /> Crea gruppo ({selectedParticipants.length + 1})</>}
                      </button>
                    </>
                  )}
                </>
              )}

              {/* ── TUTTO IL CORSO ── */}
              {mode === 'corso' && (
                <>
                  <p className="text-xs text-gray-400">Chat condivisa con tutti i corsisti e i docenti del corso. Tutti vedono i messaggi degli altri.</p>
                  {loadingCourses && <p className="text-xs text-gray-400 text-center py-2">Caricamento...</p>}
                  {!loadingCourses && !selectedCourse && (
                    <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50 max-h-52 overflow-y-auto">
                      {courses.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Nessun corso disponibile</p>}
                      {courses.map(c => (
                        <button key={c.id} onClick={() => setSelectedCourse(c)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left">
                          <BookOpen size={14} className="text-blue-400 flex-shrink-0" />
                          <p className="text-sm font-medium text-gray-900 truncate flex-1">{c.name}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedCourse && (
                    <>
                      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl">
                        <BookOpen size={14} className="text-blue-600 flex-shrink-0" />
                        <p className="text-sm font-semibold text-gray-900 truncate flex-1">{selectedCourse.name}</p>
                        <button onClick={() => setSelectedCourse(null)} className="text-gray-400 hover:text-red-500 transition"><X size={14} /></button>
                      </div>
                      <textarea value={message} onChange={e => setMessage(e.target.value)}
                        placeholder="Primo messaggio del gruppo..." rows={3}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                      <button onClick={() => handleCreaGruppo('corso')} disabled={!message.trim() || sending}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition"
                        style={{ backgroundColor: '#1EB8E5' }}>
                        {sending ? <><Loader2 size={14} className="animate-spin" /> Creazione...</> : <><BookOpen size={14} /> Crea chat corso</>}
                      </button>
                    </>
                  )}
                </>
              )}

              {/* ── MICROGRUPPO ── */}
              {mode === 'microgruppo' && (
                <>
                  <p className="text-xs text-gray-400">Chat condivisa per un microgruppo del corso. Il docente è moderatore.</p>
                  {loadingCourses && <p className="text-xs text-gray-400 text-center py-2">Caricamento...</p>}
                  {!loadingCourses && !selectedCourse && (
                    <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50 max-h-52 overflow-y-auto">
                      {courses.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Nessun corso disponibile</p>}
                      {courses.map(c => (
                        <button key={c.id} onClick={() => { setSelectedCourse(c); setSelectedGroup(null) }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left">
                          <Users size={14} className="text-indigo-400 flex-shrink-0" />
                          <p className="text-sm font-medium text-gray-900 truncate flex-1">{c.name}</p>
                          <span className="text-xs text-gray-400 flex-shrink-0">{c.groups.length} gruppi</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedCourse && !selectedGroup && (
                    <>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedCourse(null)} className="text-xs text-blue-600 hover:underline">← Corsi</button>
                        <span className="text-xs text-gray-400">/ {selectedCourse.name}</span>
                      </div>
                      {selectedCourse.groups.length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-3">Nessun microgruppo in questo corso</p>
                      )}
                      <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50 max-h-48 overflow-y-auto">
                        {selectedCourse.groups.map(g => (
                          <button key={g.id} onClick={() => setSelectedGroup(g)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left">
                            <Users size={13} className="text-indigo-400 flex-shrink-0" />
                            <p className="text-sm font-medium text-gray-900">{g.name}</p>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {selectedCourse && selectedGroup && (
                    <>
                      <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-xl">
                        <Users size={14} className="text-indigo-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{selectedGroup.name}</p>
                          <p className="text-xs text-gray-500">{selectedCourse.name}</p>
                        </div>
                        <button onClick={() => setSelectedGroup(null)} className="text-gray-400 hover:text-red-500 transition"><X size={14} /></button>
                      </div>
                      <textarea value={message} onChange={e => setMessage(e.target.value)}
                        placeholder="Primo messaggio del microgruppo..." rows={3}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                      <button onClick={() => handleCreaGruppo('microgruppo')} disabled={!message.trim() || sending}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition"
                        style={{ backgroundColor: '#1EB8E5' }}>
                        {sending ? <><Loader2 size={14} className="animate-spin" /> Creazione...</> : <><Users size={14} /> Crea chat microgruppo</>}
                      </button>
                    </>
                  )}
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  )
}
