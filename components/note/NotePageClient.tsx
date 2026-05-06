'use client'

import { useState, useCallback, useRef } from 'react'
import { Plus, FileText, Trash2, Share2, Check, X, Link2, Users, Lock, Pencil } from 'lucide-react'
import NoteEditor from './NoteEditor'
import type { Note, NoteShare } from '@/lib/types'

interface Props {
  initialNotes: Note[]
  currentUserId: string
  allDocenti: { id: string; full_name: string; email: string }[]
  role: 'super_admin' | 'docente'
}

export default function NotePageClient({ initialNotes, currentUserId, allDocenti, role }: Props) {
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
    <div className="grid grid-cols-[260px_1fr] gap-6 h-[calc(100vh-120px)]">
      {/* Sidebar lista note */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handleCreate}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-50 flex-shrink-0"
          style={{ backgroundColor: '#1565C0' }}
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
          {/* Header nota */}
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

          {/* Panel condivisione */}
          {showShare && isOwner && (
            <SharePanel
              shares={selected.shares ?? []}
              allDocenti={allDocenti.filter(d => d.id !== currentUserId)}
              onAdd={handleShare}
              onRemove={handleRemoveShare}
              onClose={() => setShowShare(false)}
            />
          )}

          {/* Editor Tiptap */}
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

// ── Panel condivisione ─────────────────────────────────────
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

      {/* Lista chi ha accesso */}
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

      {/* Aggiungi condivisione */}
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
