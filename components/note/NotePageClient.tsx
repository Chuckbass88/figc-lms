'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Plus, FileText, Trash2, Share2, Check, X, Link2, Users, Lock, Pencil,
  CheckSquare, Bell, ChevronDown, ChevronUp, MoreHorizontal, Trash, Mail,
  BellRing, Clock,
} from 'lucide-react'
import NoteEditor from './NoteEditor'
import type { Note, NoteShare } from '@/lib/types'

// ── Tipi ─────────────────────────────────────────────────────────────────────

interface Props {
  initialNotes: Note[]
  currentUserId: string
  allDocenti: { id: string; full_name: string; email: string }[]
  role: 'super_admin' | 'docente'
}

interface TodoItem {
  id: string
  text: string
  done: boolean
}

interface Todo {
  id: string
  title: string
  items: TodoItem[]
  created_at: string
  updated_at: string
}

interface Reminder {
  id: string
  title: string
  description: string | null
  remind_at: string
  notify_type: 'email' | 'notification' | 'both'
  sent: boolean
  created_at: string
}

// ── Tab types ─────────────────────────────────────────────────────────────────

type Tab = 'note' | 'todo' | 'reminder'

// ── Main component ────────────────────────────────────────────────────────────

export default function NotePageClient({ initialNotes, currentUserId, allDocenti, role }: Props) {
  const [tab, setTab] = useState<Tab>('note')

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Tab bar */}
      <div className="flex gap-1 mb-4 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        {([
          { key: 'note', label: 'Note', Icon: FileText },
          { key: 'todo', label: 'To-do', Icon: CheckSquare },
          { key: 'reminder', label: 'Promemoria', Icon: Bell },
        ] as { key: Tab; label: string; Icon: React.ElementType }[]).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'note' && (
        <NoteSection
          initialNotes={initialNotes}
          currentUserId={currentUserId}
          allDocenti={allDocenti}
          role={role}
        />
      )}
      {tab === 'todo' && <TodoSection />}
      {tab === 'reminder' && <ReminderSection />}
    </div>
  )
}

// ── NOTE SECTION ──────────────────────────────────────────────────────────────

function NoteSection({ initialNotes, currentUserId, allDocenti, role }: Props) {
  const [notes, setNotes] = useState(initialNotes)
  const [selectedId, setSelectedId] = useState<string | null>(initialNotes[0]?.id ?? null)
  const [loading, setLoading] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selected = notes.find(n => n.id === selectedId) ?? null
  const isOwner = selected ? (role === 'super_admin' || selected.created_by === currentUserId) : false
  const myShare = selected?.shares?.find(s => s.shared_with === currentUserId)
  const canEdit = isOwner || (myShare?.can_edit ?? false)

  async function handleCreate() {
    setLoading(true)
    try {
      const res = await fetch('/api/note-personali', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Nuova nota' }),
      })
      if (res.ok) {
        const nota = await res.json()
        setNotes(prev => [nota, ...prev])
        setSelectedId(nota.id)
      }
    } finally { setLoading(false) }
  }

  async function handleDelete() {
    if (!selectedId || !confirm('Eliminare questa nota?')) return
    setLoading(true)
    try {
      await fetch(`/api/note-personali/${selectedId}`, { method: 'DELETE' })
      const remaining = notes.filter(n => n.id !== selectedId)
      setNotes(remaining)
      setSelectedId(remaining[0]?.id ?? null)
    } finally { setLoading(false) }
  }

  const handleContentChange = useCallback((noteId: string, json: object) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await fetch(`/api/note-personali/${noteId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: json }),
      })
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, content: json } : n))
    }, 800)
  }, [])

  async function handleSaveTitle() {
    if (!selectedId || !titleInput.trim()) return
    await fetch(`/api/note-personali/${selectedId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: titleInput.trim() }),
    })
    setNotes(prev => prev.map(n => n.id === selectedId ? { ...n, title: titleInput.trim() } : n))
    setEditingTitle(false)
  }

  async function handleShare(sharedWith: string, canEdit: boolean) {
    if (!selectedId) return
    const res = await fetch(`/api/note-personali/${selectedId}/share`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sharedWith, canEdit }),
    })
    if (res.ok) {
      const share = await res.json()
      setNotes(prev => prev.map(n =>
        n.id === selectedId
          ? { ...n, shares: [...(n.shares?.filter(s => s.shared_with !== sharedWith) ?? []), share] }
          : n
      ))
    }
  }

  async function handleRemoveShare(sharedWith: string) {
    if (!selectedId) return
    await fetch(`/api/note-personali/${selectedId}/share`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sharedWith }),
    })
    setNotes(prev => prev.map(n =>
      n.id === selectedId
        ? { ...n, shares: n.shares?.filter(s => s.shared_with !== sharedWith) }
        : n
    ))
  }

  return (
    <div className="grid grid-cols-[260px_1fr] gap-6 flex-1 min-h-0">
      {/* Sidebar lista note */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handleCreate}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-50 flex-shrink-0"
          style={{ backgroundColor: '#1EB8E5' }}
        >
          <Plus size={15} /> Nuova nota
        </button>

        <div className="flex-1 overflow-y-auto space-y-1.5">
          {notes.length === 0 ? (
            <div className="text-center py-10">
              <FileText size={28} className="text-gray-200 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Nessuna nota ancora</p>
            </div>
          ) : (
            notes.map(n => {
              const isMine = n.created_by === currentUserId
              return (
                <button
                  key={n.id}
                  onClick={() => setSelectedId(n.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition ${selectedId === n.id ? 'bg-blue-600 text-white shadow' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  <p className="font-medium truncate">{n.title}</p>
                  <div className={`flex items-center gap-1.5 mt-0.5 text-xs ${selectedId === n.id ? 'text-blue-200' : 'text-gray-400'}`}>
                    {isMine ? <Lock size={10} /> : <Share2 size={10} />}
                    <span>{isMine ? 'Tua nota' : `Di ${n.creator?.full_name}`}</span>
                    {n.shares && n.shares.length > 0 && isMine && (
                      <span className={`ml-auto flex items-center gap-0.5 ${selectedId === n.id ? 'text-blue-200' : 'text-blue-500'}`}>
                        <Users size={10} /> {n.shares.length}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 ${selectedId === n.id ? 'text-blue-200' : 'text-gray-400'}`}>
                    {new Date(n.updated_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Editor nota selezionata */}
      {selected ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            {editingTitle ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={titleInput}
                  onChange={e => setTitleInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
                  autoFocus
                  className="flex-1 px-2 py-1 text-sm rounded border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button onClick={handleSaveTitle} className="p-1 rounded text-green-600 hover:bg-green-50"><Check size={14} /></button>
                <button onClick={() => setEditingTitle(false)} className="p-1 rounded text-gray-500 hover:bg-gray-100"><X size={14} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{selected.title}</h3>
                {canEdit && (
                  <button onClick={() => { setEditingTitle(true); setTitleInput(selected.title) }} className="p-1 rounded hover:bg-gray-100 text-gray-400 flex-shrink-0">
                    <Pencil size={13} />
                  </button>
                )}
                {!isOwner && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex-shrink-0">Condivisa</span>}
              </div>
            )}

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {isOwner && (
                <button
                  onClick={() => setShowShare(v => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${showShare ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100 border border-gray-200'}`}
                >
                  <Share2 size={13} /> Condividi
                  {(selected.shares?.length ?? 0) > 0 && <span className="bg-blue-600 text-white rounded-full px-1.5 py-0.5 text-xs">{selected.shares!.length}</span>}
                </button>
              )}
              {isOwner && (
                <button onClick={handleDelete} className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          {showShare && isOwner && (
            <SharePanel
              shares={selected.shares ?? []}
              allDocenti={allDocenti.filter(d => d.id !== currentUserId)}
              onAdd={handleShare}
              onRemove={handleRemoveShare}
              onClose={() => setShowShare(false)}
            />
          )}

          <div className="flex-1 overflow-hidden">
            <NoteEditor
              key={selected.id}
              content={selected.content}
              readOnly={!canEdit}
              onChange={canEdit ? (json) => handleContentChange(selected.id, json) : undefined}
              placeholder={canEdit ? 'Scrivi la tua nota qui…' : 'Questa nota è in sola lettura.'}
            />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-center">
          <div className="text-center">
            <FileText size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Seleziona una nota o creane una nuova</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── TODO SECTION ──────────────────────────────────────────────────────────────

function TodoSection() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [newItemText, setNewItemText] = useState<Record<string, string>>({})
  const [editingTitle, setEditingTitle] = useState<string | null>(null)
  const [titleInput, setTitleInput] = useState('')

  useEffect(() => {
    fetch('/api/todos').then(r => r.json()).then(setTodos).finally(() => setLoading(false))
  }, [])

  async function createTodo() {
    const res = await fetch('/api/todos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Nuova lista' }),
    })
    if (res.ok) {
      const todo = await res.json()
      setTodos(prev => [todo, ...prev])
    }
  }

  async function deleteTodo(id: string) {
    if (!confirm('Eliminare questa lista?')) return
    await fetch(`/api/todos/${id}`, { method: 'DELETE' })
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  async function saveTitle(id: string) {
    if (!titleInput.trim()) return
    const res = await fetch(`/api/todos/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: titleInput.trim() }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTodos(prev => prev.map(t => t.id === id ? updated : t))
    }
    setEditingTitle(null)
  }

  async function addItem(todo: Todo) {
    const text = (newItemText[todo.id] ?? '').trim()
    if (!text) return
    const newItem: TodoItem = { id: crypto.randomUUID(), text, done: false }
    const items = [...todo.items, newItem]
    const res = await fetch(`/api/todos/${todo.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTodos(prev => prev.map(t => t.id === todo.id ? updated : t))
      setNewItemText(prev => ({ ...prev, [todo.id]: '' }))
    }
  }

  async function toggleItem(todo: Todo, itemId: string) {
    const items = todo.items.map(it => it.id === itemId ? { ...it, done: !it.done } : it)
    const res = await fetch(`/api/todos/${todo.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTodos(prev => prev.map(t => t.id === todo.id ? updated : t))
    }
  }

  async function deleteItem(todo: Todo, itemId: string) {
    const items = todo.items.filter(it => it.id !== itemId)
    const res = await fetch(`/api/todos/${todo.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTodos(prev => prev.map(t => t.id === todo.id ? updated : t))
    }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Caricamento…</div>

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{todos.length === 0 ? 'Nessuna lista ancora' : `${todos.length} ${todos.length === 1 ? 'lista' : 'liste'}`}</p>
        <button
          onClick={createTodo}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 transition"
          style={{ backgroundColor: '#1EB8E5' }}
        >
          <Plus size={14} /> Nuova lista
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {todos.map(todo => {
          const done = todo.items.filter(it => it.done).length
          const total = todo.items.length
          const pct = total > 0 ? Math.round((done / total) * 100) : 0

          return (
            <div key={todo.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
              {/* Intestazione */}
              <div className="flex items-start gap-2">
                {editingTitle === todo.id ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      autoFocus
                      type="text"
                      value={titleInput}
                      onChange={e => setTitleInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveTitle(todo.id); if (e.key === 'Escape') setEditingTitle(null) }}
                      className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button onClick={() => saveTitle(todo.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={13} /></button>
                    <button onClick={() => setEditingTitle(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={13} /></button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingTitle(todo.id); setTitleInput(todo.title) }}
                    className="flex-1 text-left font-semibold text-gray-900 text-sm hover:text-blue-600 transition truncate"
                  >
                    {todo.title}
                  </button>
                )}
                <button onClick={() => deleteTodo(todo.id)} className="p-1 text-gray-300 hover:text-red-500 rounded flex-shrink-0 transition">
                  <Trash size={13} />
                </button>
              </div>

              {/* Progress bar */}
              {total > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{done}/{total} completati</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#16a34a' : '#1EB8E5' }}
                    />
                  </div>
                </div>
              )}

              {/* Items */}
              <div className="space-y-1.5">
                {todo.items.map(item => (
                  <div key={item.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => toggleItem(todo, item.id)}
                      className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition ${item.done ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-blue-400'}`}
                    >
                      {item.done && <Check size={10} className="text-white" />}
                    </button>
                    <span className={`flex-1 text-sm ${item.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {item.text}
                    </span>
                    <button
                      onClick={() => deleteItem(todo, item.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-400 rounded transition"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Aggiungi item */}
              <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                <input
                  type="text"
                  value={newItemText[todo.id] ?? ''}
                  onChange={e => setNewItemText(prev => ({ ...prev, [todo.id]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') addItem(todo) }}
                  placeholder="Aggiungi voce…"
                  className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-300"
                />
                <button
                  onClick={() => addItem(todo)}
                  disabled={!(newItemText[todo.id] ?? '').trim()}
                  className="p-1.5 rounded-lg text-white disabled:opacity-30 transition"
                  style={{ backgroundColor: '#1EB8E5' }}
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          )
        })}

        {todos.length === 0 && (
          <div className="col-span-full flex flex-col items-center py-16 text-center">
            <CheckSquare size={36} className="text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">Nessuna lista to-do ancora</p>
            <p className="text-xs text-gray-300 mt-1">Usa "Nuova lista" per iniziare</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── REMINDER SECTION ──────────────────────────────────────────────────────────

function ReminderSection() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', remind_at: '', notify_type: 'both' as Reminder['notify_type'],
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/reminders').then(r => r.json()).then(setReminders).finally(() => setLoading(false))
    // Check due reminders on load (fire and forget)
    fetch('/api/reminders/check-due', { method: 'POST' })
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.remind_at) return
    setSaving(true)
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const reminder = await res.json()
        setReminders(prev => [...prev, reminder].sort((a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime()))
        setForm({ title: '', description: '', remind_at: '', notify_type: 'both' })
        setShowForm(false)
      }
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questo promemoria?')) return
    await fetch(`/api/reminders/${id}`, { method: 'DELETE' })
    setReminders(prev => prev.filter(r => r.id !== id))
  }

  const now = new Date()
  const upcoming = reminders.filter(r => !r.sent && new Date(r.remind_at) > now)
  const past = reminders.filter(r => r.sent || new Date(r.remind_at) <= now)

  if (loading) return <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Caricamento…</div>

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {upcoming.length > 0 ? `${upcoming.length} in arrivo` : 'Nessun promemoria in arrivo'}
        </p>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 transition"
          style={{ backgroundColor: '#1EB8E5' }}
        >
          <Plus size={14} /> Nuovo promemoria
        </button>
      </div>

      {/* Form creazione */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Nuovo promemoria</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Titolo *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Es. Chiamare il docente"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descrizione</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Note aggiuntive (opzionale)"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data e ora *</label>
                <input
                  type="datetime-local"
                  required
                  value={form.remind_at}
                  onChange={e => setForm(f => ({ ...f, remind_at: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notifica via</label>
                <select
                  value={form.notify_type}
                  onChange={e => setForm(f => ({ ...f, notify_type: e.target.value as Reminder['notify_type'] }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                >
                  <option value="both">Email + Notifica</option>
                  <option value="email">Solo email</option>
                  <option value="notification">Solo notifica</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition">Annulla</button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 text-sm font-medium text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
              style={{ backgroundColor: '#1EB8E5' }}
            >
              {saving ? 'Salvataggio…' : 'Salva promemoria'}
            </button>
          </div>
        </form>
      )}

      {/* In arrivo */}
      {upcoming.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">In arrivo</p>
          <div className="space-y-2">
            {upcoming.map(r => <ReminderCard key={r.id} reminder={r} onDelete={handleDelete} />)}
          </div>
        </div>
      )}

      {/* Inviati / scaduti */}
      {past.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Già inviati</p>
          <div className="space-y-2 opacity-60">
            {past.map(r => <ReminderCard key={r.id} reminder={r} onDelete={handleDelete} />)}
          </div>
        </div>
      )}

      {reminders.length === 0 && !showForm && (
        <div className="flex flex-col items-center py-16 text-center">
          <Bell size={36} className="text-gray-200 mb-3" />
          <p className="text-sm text-gray-400">Nessun promemoria ancora</p>
          <p className="text-xs text-gray-300 mt-1">Usa "Nuovo promemoria" per aggiungerne uno</p>
        </div>
      )}
    </div>
  )
}

function ReminderCard({ reminder, onDelete }: { reminder: Reminder; onDelete: (id: string) => void }) {
  const date = new Date(reminder.remind_at)
  const dateStr = date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const isPast = reminder.sent || date < new Date()

  const notifyIcon = reminder.notify_type === 'email'
    ? <Mail size={11} />
    : reminder.notify_type === 'notification'
    ? <BellRing size={11} />
    : <><Mail size={11} /><BellRing size={11} /></>

  return (
    <div className={`bg-white rounded-xl border p-4 flex items-start gap-3 ${isPast ? 'border-gray-100' : 'border-violet-100'}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isPast ? 'bg-gray-100' : 'bg-violet-100'}`}>
        <Clock size={16} className={isPast ? 'text-gray-400' : 'text-violet-600'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${isPast ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{reminder.title}</p>
        {reminder.description && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{reminder.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          <span className={`text-xs font-medium ${isPast ? 'text-gray-400' : 'text-violet-600'}`}>
            {dateStr} · {timeStr}
          </span>
          <span className="flex items-center gap-0.5 text-xs text-gray-400">
            {notifyIcon}
          </span>
          {reminder.sent && (
            <span className="text-xs text-green-600 font-medium flex items-center gap-0.5">
              <Check size={10} /> Inviato
            </span>
          )}
        </div>
      </div>
      <button onClick={() => onDelete(reminder.id)} className="p-1 text-gray-300 hover:text-red-400 rounded transition flex-shrink-0">
        <Trash size={13} />
      </button>
    </div>
  )
}

// ── SHARE PANEL ───────────────────────────────────────────────────────────────

function SharePanel({ shares, allDocenti, onAdd, onRemove, onClose }: {
  shares: NoteShare[]
  allDocenti: { id: string; full_name: string; email: string }[]
  onAdd: (id: string, canEdit: boolean) => void
  onRemove: (id: string) => void
  onClose: () => void
}) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [canEdit, setCanEdit] = useState(false)
  const sharedIds = new Set(shares.map(s => s.shared_with))

  return (
    <div className="border-b border-gray-100 bg-blue-50 px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-blue-800 flex items-center gap-1.5"><Users size={14} /> Condivisione</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
      </div>

      <div className="space-y-2 mb-3">
        {shares.length === 0 && <p className="text-xs text-gray-400">Nessuno ha ancora accesso a questa nota.</p>}
        {shares.map(s => (
          <div key={s.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-blue-100">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{s.user?.full_name || s.user?.email}</p>
              <p className="text-xs text-gray-400">{s.can_edit ? 'Può modificare' : 'Solo lettura'}</p>
            </div>
            <button
              onClick={() => onAdd(s.shared_with, !s.can_edit)}
              className={`text-xs px-2 py-1 rounded border transition ${s.can_edit ? 'border-blue-200 text-blue-600 bg-blue-50' : 'border-gray-200 text-gray-500'}`}
              title={s.can_edit ? 'Passa a sola lettura' : 'Consenti modifiche'}
            >
              {s.can_edit ? 'Modifica' : 'Lettura'}
            </button>
            <button onClick={() => onRemove(s.shared_with)} className="p-1 rounded hover:bg-red-50 text-red-400"><X size={12} /></button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">— Seleziona docente —</option>
          {allDocenti.filter(d => !sharedIds.has(d.id)).map(d => (
            <option key={d.id} value={d.id}>{d.full_name}</option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
          <input type="checkbox" checked={canEdit} onChange={e => setCanEdit(e.target.checked)} className="rounded" />
          Può modificare
        </label>
        <button
          onClick={() => { if (selectedUserId) { onAdd(selectedUserId, canEdit); setSelectedUserId('') } }}
          disabled={!selectedUserId}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition"
        >
          <Share2 size={12} /> Condividi
        </button>
      </div>
    </div>
  )
}
