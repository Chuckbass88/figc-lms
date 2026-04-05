'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Search, Loader2, Users, BookOpen } from 'lucide-react'

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

type Mode = 'singolo' | 'corso' | 'microgruppo'

export default function NuovaConversazioneBtn({
  currentUserId,
  currentUserRole,
}: {
  currentUserId: string
  currentUserRole: string
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('singolo')

  // Singolo
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [results, setResults] = useState<UserResult[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selected, setSelected] = useState<UserResult | null>(null)

  // Gruppo / Microgruppo
  const [courses, setCourses] = useState<Course[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)

  // Messaggio e invio
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sentResult, setSentResult] = useState<{ sent: number; total: number } | null>(null)
  const router = useRouter()

  function resetAll() {
    setQuery(''); setResults([]); setSelected(null); setMessage('')
    setRoleFilter(''); setSelectedCourse(null); setSelectedGroup(null); setSentResult(null)
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
    if (mode === 'singolo') {
      const t = setTimeout(() => fetchUsers(query, roleFilter), 300)
      return () => clearTimeout(t)
    }
  }, [query, roleFilter, fetchUsers, mode])

  async function handleSendSingolo() {
    if (!selected || !message.trim()) return
    setSending(true)
    const res = await fetch('/api/messaggi/crea', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otherUserId: selected.id, content: message.trim() }),
    })
    const data = await res.json()
    setSending(false)
    if (data.conversationId) {
      setOpen(false)
      router.push(`/messaggi/${data.conversationId}`)
    }
  }

  async function handleSendGruppo() {
    if (!selectedCourse || !message.trim()) return
    if (mode === 'microgruppo' && !selectedGroup) return
    setSending(true)
    const res = await fetch('/api/messaggi/invia-gruppo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId: selectedCourse.id,
        groupId: mode === 'microgruppo' ? selectedGroup?.id : undefined,
        content: message.trim(),
      }),
    })
    const data = await res.json()
    setSending(false)
    if (res.ok) {
      setSentResult({ sent: data.sent, total: data.total })
      setMessage('')
      router.refresh()
    }
  }

  const visibleFilters = currentUserRole === 'super_admin'
    ? ROLE_FILTERS
    : ROLE_FILTERS.filter(f => f.value !== 'super_admin')

  const showGroupTabs = currentUserRole !== 'studente'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition"
        style={{ backgroundColor: '#1565C0' }}
      >
        <Plus size={14} /> Nuovo messaggio
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Nuovo messaggio</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={18} />
              </button>
            </div>

            {/* Tab modalità */}
            {showGroupTabs && (
              <div className="flex border-b border-gray-100">
                {([
                  { key: 'singolo', label: 'Singolo', icon: null },
                  { key: 'corso', label: 'Corso intero', icon: <BookOpen size={11} /> },
                  { key: 'microgruppo', label: 'Microgruppo', icon: <Users size={11} /> },
                ] as { key: Mode; label: string; icon: React.ReactNode }[]).map(t => (
                  <button
                    key={t.key}
                    onClick={() => { setMode(t.key); resetAll() }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition border-b-2 ${
                      mode === t.key
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            )}

            <div className="p-5 space-y-3">
              {/* ── MODO SINGOLO ── */}
              {mode === 'singolo' && (
                !selected ? (
                  <>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        autoFocus
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Cerca per nome..."
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {visibleFilters.map(f => (
                        <button
                          key={f.value}
                          onClick={() => setRoleFilter(f.value)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                            roleFilter === f.value ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          style={roleFilter === f.value ? { backgroundColor: '#1565C0' } : {}}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                    {loadingUsers && <p className="text-xs text-gray-400 text-center py-2">Caricamento...</p>}
                    {!loadingUsers && results.length > 0 && (
                      <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50 max-h-64 overflow-y-auto">
                        {results.map(u => (
                          <button
                            key={u.id}
                            onClick={() => setSelected(u)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left"
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: '#1565C0' }}>
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
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ backgroundColor: '#1565C0' }}>
                        {selected.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{selected.full_name}</p>
                        <p className="text-xs text-gray-500">{ROLE_LABELS[selected.role] ?? selected.role}</p>
                      </div>
                      <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-red-500 transition"><X size={14} /></button>
                    </div>
                    <textarea
                      autoFocus value={message} onChange={e => setMessage(e.target.value)}
                      placeholder="Scrivi il tuo messaggio..." rows={4}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSendSingolo() }}
                    />
                    <button
                      onClick={handleSendSingolo} disabled={!message.trim() || sending}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition"
                      style={{ backgroundColor: '#1565C0' }}
                    >
                      {sending ? <><Loader2 size={14} className="animate-spin" /> Invio...</> : 'Invia messaggio'}
                    </button>
                  </>
                )
              )}

              {/* ── MODO CORSO / MICROGRUPPO ── */}
              {(mode === 'corso' || mode === 'microgruppo') && (
                <>
                  {sentResult ? (
                    <div className="text-center py-4">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                        <Users size={20} className="text-green-600" />
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">Messaggi inviati!</p>
                      <p className="text-xs text-gray-500 mt-1">{sentResult.sent} di {sentResult.total} corsisti raggiunti</p>
                      <button
                        onClick={() => { setSentResult(null); setSelectedCourse(null); setSelectedGroup(null) }}
                        className="mt-4 text-xs text-blue-600 hover:underline"
                      >
                        Invia un altro messaggio
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Selezione corso */}
                      {loadingCourses && <p className="text-xs text-gray-400 text-center py-2">Caricamento corsi...</p>}
                      {!loadingCourses && !selectedCourse && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Seleziona corso</p>
                          {courses.length === 0 && <p className="text-xs text-gray-400 text-center py-3">Nessun corso disponibile</p>}
                          <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50 max-h-52 overflow-y-auto">
                            {courses.map(c => (
                              <button
                                key={c.id}
                                onClick={() => { setSelectedCourse(c); setSelectedGroup(null) }}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left"
                              >
                                <BookOpen size={14} className="text-blue-400 flex-shrink-0" />
                                <p className="text-sm font-medium text-gray-900 truncate flex-1">{c.name}</p>
                                {mode === 'microgruppo' && <span className="text-xs text-gray-400 flex-shrink-0">{c.groups.length} gruppi</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Selezione microgruppo */}
                      {selectedCourse && mode === 'microgruppo' && !selectedGroup && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setSelectedCourse(null)} className="text-xs text-blue-600 hover:underline">← Corsi</button>
                            <span className="text-xs text-gray-400">/ {selectedCourse.name}</span>
                          </div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Seleziona microgruppo</p>
                          {selectedCourse.groups.length === 0 && <p className="text-xs text-gray-400 text-center py-3">Nessun microgruppo in questo corso</p>}
                          <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50 max-h-48 overflow-y-auto">
                            {selectedCourse.groups.map(g => (
                              <button
                                key={g.id}
                                onClick={() => setSelectedGroup(g)}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left"
                              >
                                <Users size={13} className="text-indigo-400 flex-shrink-0" />
                                <p className="text-sm font-medium text-gray-900">{g.name}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Form messaggio */}
                      {selectedCourse && (mode === 'corso' || (mode === 'microgruppo' && selectedGroup)) && (
                        <>
                          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl">
                            {mode === 'corso' ? <BookOpen size={14} className="text-blue-600 flex-shrink-0" /> : <Users size={14} className="text-indigo-600 flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{selectedCourse.name}</p>
                              {selectedGroup && <p className="text-xs text-gray-500">Microgruppo: {selectedGroup.name}</p>}
                            </div>
                            <button onClick={() => mode === 'corso' ? setSelectedCourse(null) : setSelectedGroup(null)} className="text-gray-400 hover:text-red-500 transition">
                              <X size={14} />
                            </button>
                          </div>
                          <textarea
                            autoFocus value={message} onChange={e => setMessage(e.target.value)}
                            placeholder="Scrivi il messaggio da inviare a tutti i corsisti..."
                            rows={4}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                          <button
                            onClick={handleSendGruppo}
                            disabled={!message.trim() || sending}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition"
                            style={{ backgroundColor: '#1565C0' }}
                          >
                            {sending
                              ? <><Loader2 size={14} className="animate-spin" /> Invio in corso...</>
                              : <><Users size={14} /> Invia a tutti i corsisti</>
                            }
                          </button>
                        </>
                      )}
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
