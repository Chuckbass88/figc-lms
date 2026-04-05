'use client'

import { useState, useRef } from 'react'
import {
  Upload, Link2, Trash2, FileText, Image, Video, FileSpreadsheet,
  File, ExternalLink, Loader2, Plus, X, Check, FolderOpen,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocumentItem {
  id: string
  title: string
  description: string | null
  file_url: string | null
  file_type: string | null
  file_size: number | null
  category: 'template' | 'document' | 'link'
  external_url: string | null
  is_template: boolean
  uploaded_by: string
  created_at: string
  uploader_name?: string
}

type Tab = 'all' | 'template' | 'document' | 'link'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function getCategoryBadge(cat: string): string {
  if (cat === 'template') return 'bg-purple-100 text-purple-700'
  if (cat === 'link') return 'bg-sky-100 text-sky-700'
  return 'bg-blue-100 text-blue-700'
}

function getCategoryLabel(cat: string): string {
  if (cat === 'template') return 'Template'
  if (cat === 'link') return 'Link'
  return 'Documento'
}

function getFileIcon(item: DocumentItem) {
  if (item.category === 'link') return <Link2 size={18} className="text-sky-500" />
  const mime = item.file_type ?? ''
  if (mime.includes('pdf')) return <FileText size={18} className="text-red-500" />
  if (mime.startsWith('image/')) return <Image size={18} className="text-purple-500" />
  if (mime.startsWith('video/')) return <Video size={18} className="text-orange-500" />
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv'))
    return <FileSpreadsheet size={18} className="text-green-600" />
  return <File size={18} className="text-blue-600" />
}

const MAX_MB = 50

// ─── Upload Modal ──────────────────────────────────────────────────────────────

function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<'document' | 'template'>('document')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function applyFile(f: File) {
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ''))
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) applyFile(dropped)
  }

  async function handleUpload() {
    if (!title.trim()) { setError('Inserisci un titolo'); return }
    if (!file) { setError('Seleziona un file'); return }
    if (file.size > MAX_MB * 1024 * 1024) { setError(`File troppo grande (max ${MAX_MB} MB)`); return }

    setUploading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non autenticato')

      // Upload to Storage
      const fileName = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error: storageErr } = await supabase.storage
        .from('document-library')
        .upload(fileName, file, { contentType: file.type, upsert: false })
      if (storageErr) throw storageErr

      const { data: urlData } = supabase.storage.from('document-library').getPublicUrl(fileName)

      // Insert record
      const { error: dbErr } = await supabase.from('document_library').insert({
        title: title.trim(),
        description: description.trim() || null,
        file_url: urlData.publicUrl,
        file_type: file.type || null,
        file_size: file.size,
        category,
        is_template: category === 'template',
        uploaded_by: user.id,
      })
      if (dbErr) throw dbErr

      onSuccess()
    } catch (err: any) {
      setError(err.message ?? 'Errore durante il caricamento')
    } finally {
      setUploading(false)
    }
  }

  return (
    // onDragOver sul backdrop impedisce al browser di aprire il file se l'utente rilascia fuori dalla zona
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
      onDrop={e => { e.preventDefault(); e.stopPropagation() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Carica documento</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Tipo */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Tipo</label>
            <div className="flex gap-2">
              {(['document', 'template'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition border ${
                    category === c
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {c === 'document' ? 'Documento' : 'Template'}
                </button>
              ))}
            </div>
          </div>

          {/* Titolo */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Titolo *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Es. Scheda tecnica allenamento"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Descrizione */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Descrizione</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descrizione opzionale..."
              rows={2}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* File picker */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">File *</label>
            <input ref={fileRef} type="file" className="hidden" onChange={e => {
              const f = e.target.files?.[0]
              if (f) applyFile(f)
            }} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed transition select-none ${
                isDragging
                  ? 'border-blue-500 bg-blue-50 scale-[1.01]'
                  : file
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-gray-50'
              }`}
            >
              {isDragging ? (
                <>
                  <Upload size={20} className="text-blue-500 animate-bounce" />
                  <span className="text-sm font-semibold text-blue-600">Rilascia il file qui</span>
                </>
              ) : file ? (
                <>
                  <Check size={20} className="text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">{file.name}</span>
                  <span className="text-xs text-gray-400">{formatBytes(file.size)}</span>
                </>
              ) : (
                <>
                  <Upload size={20} className="text-gray-400" />
                  <span className="text-sm text-gray-500">Trascina un file o clicca per selezionarlo</span>
                  <span className="text-xs text-gray-400">Max {MAX_MB} MB</span>
                </>
              )}
            </button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="px-6 pb-6">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 transition hover:opacity-90"
            style={{ backgroundColor: '#1565C0' }}
          >
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {uploading ? 'Caricamento...' : 'Carica'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Link Modal ────────────────────────────────────────────────────────────────

function LinkModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!title.trim()) { setError('Inserisci un titolo'); return }
    if (!url.trim()) { setError('Inserisci un URL'); return }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError("L'URL deve iniziare con http:// o https://")
      return
    }
    setSaving(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non autenticato')
      const { error: dbErr } = await supabase.from('document_library').insert({
        title: title.trim(),
        description: description.trim() || null,
        category: 'link',
        external_url: url.trim(),
        is_template: false,
        uploaded_by: user.id,
      })
      if (dbErr) throw dbErr
      onSuccess()
    } catch (err: any) {
      setError(err.message ?? 'Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Aggiungi link</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Titolo *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Es. Documentazione UEFA"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">URL *</label>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://..."
              type="url"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Descrizione</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descrizione opzionale..."
              rows={2}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="px-6 pb-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 transition hover:opacity-90"
            style={{ backgroundColor: '#29ABE2' }}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />}
            {saving ? 'Salvataggio...' : 'Salva link'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Client Component ─────────────────────────────────────────────────────

export default function ArchivioDocumentiClient({
  initialDocs,
  userId,
  canManage,
  isAdmin,
}: {
  initialDocs: DocumentItem[]
  userId: string
  canManage: boolean
  isAdmin: boolean
}) {
  const [docs, setDocs] = useState(initialDocs)
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [showUpload, setShowUpload] = useState(false)
  const [showLink, setShowLink] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = activeTab === 'all' ? docs : docs.filter(d => d.category === activeTab)

  async function reload() {
    const supabase = createClient()
    const { data } = await supabase
      .from('document_library')
      .select('*, profiles!uploaded_by(full_name)')
      .order('created_at', { ascending: false })
    setDocs(
      (data ?? []).map((d: any) => ({ ...d, uploader_name: d.profiles?.full_name ?? null }))
    )
  }

  async function handleDelete(item: DocumentItem) {
    if (!confirm(`Eliminare "${item.title}"?\nVerrà rimosso anche da tutti i corsi in cui è abilitato.`)) return
    setDeletingId(item.id)
    try {
      const supabase = createClient()
      // Remove from storage if it's a file
      if (item.file_url && item.category !== 'link') {
        const path = item.file_url.split('/document-library/')[1]
        if (path) await supabase.storage.from('document-library').remove([path])
      }
      await supabase.from('document_library').delete().eq('id', item.id)
      setDocs(prev => prev.filter(d => d.id !== item.id))
    } finally {
      setDeletingId(null)
    }
  }

  const canDelete = (item: DocumentItem) =>
    isAdmin || (canManage && item.uploaded_by === userId)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'Tutti' },
    { key: 'template', label: 'Template' },
    { key: 'document', label: 'Documenti' },
    { key: 'link', label: 'Link' },
  ]

  return (
    <>
      {/* Modali */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setShowUpload(false); reload() }}
        />
      )}
      {showLink && (
        <LinkModal
          onClose={() => setShowLink(false)}
          onSuccess={() => { setShowLink(false); reload() }}
        />
      )}

      {/* Toolbar: filtri + pulsante aggiungi */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Filtri categoria */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === t.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Aggiungi — docente/admin */}
        {canManage && (
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(v => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition hover:opacity-90"
              style={{ backgroundColor: '#1565C0' }}
            >
              <Plus size={16} />
              Aggiungi
            </button>
            {showAddMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowAddMenu(false)} />
                <div className="absolute right-0 top-full mt-2 z-20 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden w-52">
                  <button
                    onClick={() => { setShowAddMenu(false); setShowUpload(true) }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-gray-50 transition text-left"
                  >
                    <Upload size={16} className="text-blue-600" />
                    <div>
                      <p className="font-semibold text-gray-900">Carica file</p>
                      <p className="text-xs text-gray-400">PDF, Word, Excel…</p>
                    </div>
                  </button>
                  <div className="border-t border-gray-100" />
                  <button
                    onClick={() => { setShowAddMenu(false); setShowLink(true) }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-gray-50 transition text-left"
                  >
                    <Link2 size={16} className="text-sky-500" />
                    <div>
                      <p className="font-semibold text-gray-900">Aggiungi link</p>
                      <p className="text-xs text-gray-400">URL esterno, YouTube…</p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Contatore */}
      <p className="text-xs text-gray-400">
        {filtered.length} {filtered.length === 1 ? 'documento' : 'documenti'}
      </p>

      {/* Lista documenti */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <FolderOpen size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm font-medium">
            {activeTab === 'all'
              ? canManage
                ? "Nessun documento. Carica il primo file o aggiungi un link."
                : "Nessun documento disponibile."
              : `Nessun elemento nella categoria "${tabs.find(t => t.key === activeTab)?.label}".`}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-50">
          {filtered.map(item => (
            <div key={item.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition group">
              {/* Icona */}
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center mt-0.5">
                {getFileIcon(item)}
              </div>

              {/* Corpo */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <a
                    href={item.category === 'link' ? (item.external_url ?? '#') : (item.file_url ?? '#')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-gray-900 hover:text-blue-700 transition truncate"
                  >
                    {item.title}
                  </a>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${getCategoryBadge(item.category)}`}>
                    {getCategoryLabel(item.category)}
                  </span>
                </div>
                {item.description && (
                  <p className="text-xs text-gray-400 line-clamp-1 mb-0.5">{item.description}</p>
                )}
                <p className="text-xs text-gray-400 flex items-center gap-2">
                  {item.file_size ? <span>{formatBytes(item.file_size)}</span> : null}
                  {item.uploader_name ? <span>· {item.uploader_name}</span> : null}
                  <span>· {formatDate(item.created_at)}</span>
                </p>
              </div>

              {/* Azioni */}
              <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
                <a
                  href={item.category === 'link' ? (item.external_url ?? '#') : (item.file_url ?? '#')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition"
                  title="Apri"
                >
                  <ExternalLink size={14} />
                </a>
                {canDelete(item) && (
                  <button
                    onClick={() => handleDelete(item)}
                    disabled={deletingId === item.id}
                    className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition disabled:opacity-50"
                    title="Elimina"
                  >
                    {deletingId === item.id
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Trash2 size={14} />
                    }
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
