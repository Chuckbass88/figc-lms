'use client'
import { useState } from 'react'
import { FileText, ToggleLeft, ToggleRight, Upload } from 'lucide-react'
import type { CorsoArchivio } from '@/lib/types'

interface Props {
  fileCorso: CorsoArchivio[]
  corso: { id: string; name: string } | null
  corsoId: string
}

export default function ArchivioCorsoDocenteClient({ fileCorso, corso, corsoId }: Props) {
  const [items, setItems] = useState(fileCorso)
  const [uploading, setUploading] = useState(false)
  const [uploadNome, setUploadNome] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  async function handleToggle(item: CorsoArchivio) {
    const res = await fetch('/api/archivio/toggle', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ corso_archivio_id: item.id, abilitato: !item.abilitato }),
    })
    if (res.ok) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, abilitato: !i.abilitato } : i))
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!uploadFile || !uploadNome) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', uploadFile)
      fd.append('nome', uploadNome)
      fd.append('corso_id', corsoId)
      const res = await fetch('/api/archivio/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.success) {
        window.location.reload()
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold" style={{ color: '#1B3768' }}>
        Archivio File — {corso?.name}
      </h1>

      {/* Upload */}
      <form onSubmit={handleUpload} className="rounded-2xl p-4 space-y-3"
        style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(27,55,104,0.1)' }}>
        <h2 className="text-sm font-semibold" style={{ color: '#1B3768' }}>Carica file per questo corso</h2>
        <div className="flex gap-3">
          <input type="text" placeholder="Nome documento *" required
            value={uploadNome} onChange={e => setUploadNome(e.target.value)}
            className="flex-1 rounded-xl px-3 py-2 text-sm border"
            style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }} />
          <input type="file" required accept=".pdf,.pptx,.doc,.docx,.xlsx"
            onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
            className="text-sm" />
          <button type="submit" disabled={uploading}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2"
            style={{ background: uploading ? 'rgba(8,145,178,0.5)' : '#0891B2' }}>
            <Upload size={14} />
            {uploading ? '...' : 'Carica'}
          </button>
        </div>
      </form>

      {/* Lista file */}
      <div className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(27,55,104,0.1)', background: 'rgba(255,255,255,0.5)' }}>
        {items.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'rgba(27,55,104,0.4)' }}>
            Nessun file in archivio per questo corso
          </p>
        ) : items.map(item => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-t first:border-t-0"
            style={{ borderColor: 'rgba(27,55,104,0.06)' }}>
            <FileText size={16} style={{ color: '#0891B2', flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: '#1B3768' }}>
                {item.file?.nome ?? item.file?.file_name}
              </p>
              <p className="text-xs" style={{ color: 'rgba(27,55,104,0.5)' }}>
                {item.file?.tipo} · {(item.file as any)?.area?.nome ?? 'Nessuna area'}
              </p>
            </div>
            <button
              onClick={() => handleToggle(item)}
              title={item.abilitato ? 'Disabilita per studenti' : 'Abilita per studenti'}
              className="flex-shrink-0 transition"
              style={{ color: item.abilitato ? '#0891B2' : 'rgba(27,55,104,0.3)' }}
            >
              {item.abilitato ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
            </button>
            <a href={item.file?.file_url} target="_blank" rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0"
              style={{ background: 'rgba(8,145,178,0.08)', color: '#0891B2' }}>
              Scarica
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
