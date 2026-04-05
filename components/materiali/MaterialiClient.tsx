'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, Download, Trash2, Loader2, Plus, X, File, FileImage, FileSpreadsheet, Users, User, BookOpen } from 'lucide-react'

interface Material {
  id: string
  name: string
  description: string | null
  file_url: string
  file_type: string | null
  file_size: number | null
  created_at: string
  target_type?: string | null   // 'all' | 'group' | 'student'
  target_id?: string | null
}

interface Props {
  courseId: string
  initialMaterials: Material[]
  canUpload: boolean
  groups?: { id: string; name: string }[]
  students?: { id: string; full_name: string }[]
}

function formatSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function FileIcon({ type }: { type: string | null }) {
  const t = type?.toLowerCase()
  if (t === 'pdf') return <FileText size={20} className="text-red-500" />
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(t ?? '')) return <FileImage size={20} className="text-blue-500" />
  if (['xlsx', 'xls', 'csv'].includes(t ?? '')) return <FileSpreadsheet size={20} className="text-green-600" />
  return <File size={20} className="text-gray-400" />
}

function TargetBadge({ targetType, targetId, groups, students }: {
  targetType?: string | null
  targetId?: string | null
  groups?: { id: string; name: string }[]
  students?: { id: string; full_name: string }[]
}) {
  if (!targetType || targetType === 'all') return null
  if (targetType === 'group') {
    const g = groups?.find(g => g.id === targetId)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 flex-shrink-0">
        <Users size={9} />{g?.name ?? 'Microgruppo'}
      </span>
    )
  }
  if (targetType === 'student') {
    const s = students?.find(s => s.id === targetId)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 flex-shrink-0">
        <User size={9} />{s?.full_name ?? 'Corsista'}
      </span>
    )
  }
  return null
}

export default function MaterialiClient({ courseId, initialMaterials, canUpload, groups = [], students = [] }: Props) {
  const [materials, setMaterials] = useState(initialMaterials)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [targetType, setTargetType] = useState<'all' | 'group' | 'student'>('all')
  const [targetId, setTargetId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const hasGroups = groups.length > 0
  const hasStudents = students.length > 0

  function resetForm() {
    setName(''); setDescription(''); setFile(null)
    setTargetType('all'); setTargetId(''); setError('')
    setShowForm(false)
  }

  async function upload() {
    if (!file || !name.trim()) return
    if (targetType === 'group' && !targetId) { setError('Seleziona un microgruppo'); return }
    if (targetType === 'student' && !targetId) { setError('Seleziona un corsista'); return }
    setUploading(true)
    setError('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('course_id', courseId)
    fd.append('name', name)
    fd.append('description', description)
    fd.append('target_type', targetType)
    if (targetType !== 'all') fd.append('target_id', targetId)

    const res = await fetch('/api/materiali/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Errore durante il caricamento')
    } else {
      setMaterials(prev => [data.material, ...prev])
      resetForm()
    }
    setUploading(false)
  }

  async function deleteMaterial(id: string) {
    if (!confirm('Eliminare questo materiale?')) return
    setDeleting(id)
    await fetch('/api/materiali/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setMaterials(prev => prev.filter(m => m.id !== id))
    setDeleting(null)
  }

  return (
    <div className="space-y-4">
      {/* Header sezione */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Materiali ({materials.length})
        </p>
        {canUpload && (
          <button
            onClick={() => { setShowForm(v => !v); setError('') }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium text-white hover:opacity-90 transition"
            style={{ backgroundColor: '#1565C0' }}
          >
            <Plus size={12} /> Carica file
          </button>
        )}
      </div>

      {/* Form upload */}
      {showForm && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Carica materiale</p>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>

          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nome documento *"
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Descrizione (opzionale)"
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Destinatari */}
          {(hasGroups || hasStudents) && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Visibile a</p>
              <div className="flex gap-1.5 flex-wrap mb-2">
                {[
                  { v: 'all' as const, label: 'Tutti', icon: <BookOpen size={11} /> },
                  ...(hasGroups ? [{ v: 'group' as const, label: 'Microgruppo', icon: <Users size={11} /> }] : []),
                  ...(hasStudents ? [{ v: 'student' as const, label: 'Corsista', icon: <User size={11} /> }] : []),
                ].map(t => (
                  <button
                    key={t.v}
                    type="button"
                    onClick={() => { setTargetType(t.v); setTargetId('') }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition ${
                      targetType === t.v ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={targetType === t.v ? { backgroundColor: '#1565C0' } : {}}
                  >
                    {t.icon}{t.label}
                  </button>
                ))}
              </div>

              {targetType === 'group' && (
                <select
                  value={targetId}
                  onChange={e => setTargetId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Seleziona microgruppo —</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              )}
              {targetType === 'student' && (
                <select
                  value={targetId}
                  onChange={e => setTargetId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Seleziona corsista —</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              )}
            </div>
          )}

          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDragEnter={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) setFile(f) }}
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition"
          >
            <Upload size={20} className="text-gray-400 mx-auto mb-1" />
            {file ? (
              <p className="text-sm font-medium text-blue-700">{file.name} ({formatSize(file.size)})</p>
            ) : (
              <p className="text-sm text-gray-400">Clicca o trascina un file qui</p>
            )}
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.zip"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={upload}
            disabled={uploading || !file || !name.trim()}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60 hover:opacity-90 transition"
            style={{ backgroundColor: '#1565C0' }}
          >
            {uploading ? <><Loader2 size={13} className="animate-spin" /> Caricamento...</> : <><Upload size={13} /> Carica</>}
          </button>
        </div>
      )}

      {/* Lista materiali */}
      {materials.length === 0 ? (
        <p className="text-sm text-gray-400 py-3">Nessun materiale disponibile.</p>
      ) : (
        <div className="space-y-2">
          {materials.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition">
              <div className="flex-shrink-0">
                <FileIcon type={m.file_type} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                  <TargetBadge
                    targetType={m.target_type}
                    targetId={m.target_id}
                    groups={groups}
                    students={students}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {m.file_type} {m.file_size ? `· ${formatSize(m.file_size)}` : ''} · {new Date(m.created_at).toLocaleDateString('it-IT')}
                </p>
                {m.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{m.description}</p>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <a
                  href={m.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition"
                  title="Scarica"
                >
                  <Download size={14} />
                </a>
                {canUpload && (
                  <button
                    onClick={() => deleteMaterial(m.id)}
                    disabled={deleting === m.id}
                    className="p-1.5 rounded-lg hover:bg-red-100 text-red-400 hover:text-red-600 transition disabled:opacity-40"
                    title="Elimina"
                  >
                    {deleting === m.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
