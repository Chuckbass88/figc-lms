'use client'
import { useState, useRef } from 'react'
import { Upload, FileText, Filter } from 'lucide-react'
import type { ArchiviFile, Area } from '@/lib/types'

export default function ArchivioPaginaClient({
  files, aree,
}: { files: ArchiviFile[]; aree: Area[] }) {
  const [filtroArea, setFiltroArea] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [uploading, setUploading] = useState(false)
  const [localFiles, setLocalFiles] = useState(files)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadForm, setUploadForm] = useState({ nome: '', area_id: '', tags: '' })

  const filtrati = localFiles.filter(f => {
    if (filtroArea && f.area_id !== filtroArea) return false
    if (filtroTipo && f.tipo !== filtroTipo) return false
    return true
  })

  const tipi = [...new Set(localFiles.map(f => f.tipo).filter(Boolean))] as string[]

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file || !uploadForm.nome) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('nome', uploadForm.nome)
      if (uploadForm.area_id) fd.append('area_id', uploadForm.area_id)
      if (uploadForm.tags) fd.append('tags', uploadForm.tags)
      const res = await fetch('/api/archivio/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.success) {
        setLocalFiles(prev => [json.file, ...prev])
        setUploadForm({ nome: '', area_id: '', tags: '' })
        if (fileRef.current) fileRef.current.value = ''
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: '#1B3768' }}>Archivio Generale</h1>

      {/* Form upload */}
      <form onSubmit={handleUpload} className="rounded-2xl p-5 space-y-3"
        style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(27,55,104,0.1)' }}>
        <h2 className="text-sm font-semibold" style={{ color: '#1B3768' }}>Carica nuovo file</h2>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text" placeholder="Nome documento *" required
            value={uploadForm.nome} onChange={e => setUploadForm(p => ({ ...p, nome: e.target.value }))}
            className="rounded-xl px-3 py-2 text-sm border w-full"
            style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }}
          />
          <select
            value={uploadForm.area_id}
            onChange={e => setUploadForm(p => ({ ...p, area_id: e.target.value }))}
            className="rounded-xl px-3 py-2 text-sm border w-full"
            style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }}
          >
            <option value="">Nessuna area</option>
            {aree.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </div>
        <div className="flex gap-3 items-center">
          <input ref={fileRef} type="file" accept=".pdf,.pptx,.doc,.docx,.xlsx"
            className="text-sm flex-1" required />
          <button type="submit" disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition"
            style={{ background: uploading ? 'rgba(8,145,178,0.5)' : '#0891B2' }}>
            <Upload size={15} />
            {uploading ? 'Caricamento...' : 'Carica'}
          </button>
        </div>
      </form>

      {/* Filtri */}
      <div className="flex gap-3 items-center">
        <Filter size={15} style={{ color: 'rgba(27,55,104,0.5)' }} />
        <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)}
          className="text-xs rounded-lg px-2 py-1.5 border"
          style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }}>
          <option value="">Tutte le aree</option>
          {aree.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="text-xs rounded-lg px-2 py-1.5 border"
          style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }}>
          <option value="">Tutti i tipi</option>
          {tipi.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="text-xs ml-auto" style={{ color: 'rgba(27,55,104,0.5)' }}>
          {filtrati.length} file
        </span>
      </div>

      {/* Lista file per area */}
      {aree.map(area => {
        const areaFiles = filtrati.filter(f => f.area_id === area.id)
        if (filtroArea && filtroArea !== area.id) return null
        if (!filtroArea && areaFiles.length === 0) return null
        return (
          <div key={area.id} className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(27,55,104,0.1)', background: 'rgba(255,255,255,0.5)' }}>
            <div className="px-4 py-3 flex items-center justify-between"
              style={{ background: 'rgba(27,55,104,0.04)', borderBottom: '1px solid rgba(27,55,104,0.08)' }}>
              <h3 className="text-sm font-semibold" style={{ color: '#1B3768' }}>{area.nome}</h3>
              <span className="text-xs" style={{ color: 'rgba(27,55,104,0.5)' }}>{areaFiles.length} file</span>
            </div>
            {areaFiles.map(f => (
              <div key={f.id} className="flex items-center gap-3 px-4 py-3 border-t"
                style={{ borderColor: 'rgba(27,55,104,0.06)' }}>
                <FileText size={16} style={{ color: '#0891B2', flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#1B3768' }}>{f.nome}</p>
                  <p className="text-xs" style={{ color: 'rgba(27,55,104,0.5)' }}>
                    {f.tipo} · {f.file_size ? `${Math.round(f.file_size / 1024)}KB` : ''}
                    {(f as any).corso_origine?.name ? ` · da: ${(f as any).corso_origine.name}` : ''}
                  </p>
                </div>
                <a href={f.file_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 rounded-lg font-medium transition"
                  style={{ background: 'rgba(8,145,178,0.08)', color: '#0891B2' }}>
                  Scarica
                </a>
              </div>
            ))}
          </div>
        )
      })}

      {/* File senza area */}
      {(() => {
        const senzaArea = filtrati.filter(f => !f.area_id)
        if (!filtroArea && senzaArea.length > 0) return (
          <div className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(27,55,104,0.1)', background: 'rgba(255,255,255,0.5)' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(27,55,104,0.08)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'rgba(27,55,104,0.5)' }}>Senza area</h3>
            </div>
            {senzaArea.map(f => (
              <div key={f.id} className="flex items-center gap-3 px-4 py-3 border-t"
                style={{ borderColor: 'rgba(27,55,104,0.06)' }}>
                <FileText size={16} style={{ color: '#0891B2' }} />
                <p className="flex-1 text-sm truncate" style={{ color: '#1B3768' }}>{f.nome}</p>
                <a href={f.file_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 rounded-lg" style={{ color: '#0891B2' }}>Scarica</a>
              </div>
            ))}
          </div>
        )
        return null
      })()}
    </div>
  )
}
