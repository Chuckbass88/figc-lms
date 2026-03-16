'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, Download, Trash2, Loader2, Plus, X, File, FileImage, FileSpreadsheet } from 'lucide-react'

interface Material {
  id: string
  name: string
  description: string | null
  file_url: string
  file_type: string | null
  file_size: number | null
  created_at: string
}

interface Props {
  courseId: string
  initialMaterials: Material[]
  canUpload: boolean
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

export default function MaterialiClient({ courseId, initialMaterials, canUpload }: Props) {
  const [materials, setMaterials] = useState(initialMaterials)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function upload() {
    if (!file || !name.trim()) return
    setUploading(true)
    setError('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('course_id', courseId)
    fd.append('name', name)
    fd.append('description', description)

    const res = await fetch('/api/materiali/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Errore durante il caricamento')
    } else {
      setMaterials(prev => [data.material, ...prev])
      setName('')
      setDescription('')
      setFile(null)
      setShowForm(false)
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
            style={{ backgroundColor: '#003DA5' }}
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
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
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

          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition"
          >
            <Upload size={20} className="text-gray-400 mx-auto mb-1" />
            {file ? (
              <p className="text-sm font-medium text-blue-700">{file.name} ({formatSize(file.size)})</p>
            ) : (
              <p className="text-sm text-gray-400">Clicca per selezionare un file</p>
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
            style={{ backgroundColor: '#003DA5' }}
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
                <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
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
