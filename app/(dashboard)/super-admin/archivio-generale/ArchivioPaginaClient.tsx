'use client'
import { useState, useRef } from 'react'
import { Upload, FileText, Filter, X, AlertCircle, FolderOpen, GraduationCap, List } from 'lucide-react'
import type { ArchiviFile, Area } from '@/lib/types'

type Corso = { id: string; name: string; category?: string | null }
type Vista = 'tutti' | 'area' | 'corso'

export default function ArchivioPaginaClient({
  files, aree, corsi,
}: { files: ArchiviFile[]; aree: Area[]; corsi: Corso[] }) {
  const [vista, setVista] = useState<Vista>('tutti')
  const [filtroArea, setFiltroArea] = useState('')
  const [filtroCorso, setFiltroCorso] = useState('')
  const [filtroTipologia, setFiltroTipologia] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [localFiles, setLocalFiles] = useState(files)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadForm, setUploadForm] = useState({ nome: '', area_id: '', corso_id: '' })

  // Corsi filtrati per tipologia (usato in tutti filtrati + vista corso)
  const corsiIdPerTipologia = filtroTipologia
    ? new Set(corsi.filter(c => c.category === filtroTipologia).map(c => c.id))
    : null

  const filtrati = localFiles.filter(f => {
    if (filtroArea && f.area_id !== filtroArea) return false
    if (filtroCorso && f.corso_origine_id !== filtroCorso) return false
    if (filtroTipo && f.tipo !== filtroTipo) return false
    if (corsiIdPerTipologia && f.corso_origine_id && !corsiIdPerTipologia.has(f.corso_origine_id)) return false
    return true
  })

  const tipi = [...new Set(localFiles.map(f => f.tipo).filter(Boolean))] as string[]

  // Tipologie di corso disponibili (dai corsi caricati)
  const tipologieCorso = [...new Set(corsi.map(c => c.category).filter(Boolean))].sort() as string[]

  // Corsi filtrati per tipologia (per la vista "per corso" e dropdown corso specifico)
  const corsiFiltrati = filtroTipologia
    ? corsi.filter(c => c.category === filtroTipologia)
    : corsi

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file || !uploadForm.nome) return
    setUploading(true)
    setUploadError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('nome', uploadForm.nome)
      if (uploadForm.area_id) fd.append('area_id', uploadForm.area_id)
      if (uploadForm.corso_id) fd.append('corso_id', uploadForm.corso_id)
      const res = await fetch('/api/archivio/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.success && json.file) {
        setLocalFiles(prev => [json.file, ...prev])
        setUploadForm({ nome: '', area_id: '', corso_id: '' })
        if (fileRef.current) fileRef.current.value = ''
      } else {
        setUploadError(json.error ?? 'Errore durante il caricamento. Riprova.')
      }
    } catch {
      setUploadError('Errore di rete. Controlla la connessione e riprova.')
    } finally {
      setUploading(false)
    }
  }

  function FileRow({ f }: { f: ArchiviFile }) {
    const sizeKb = f.file_size ? Math.round(f.file_size / 1024) : null
    const materiaNome = aree.find(a => a.id === f.area_id)?.nome
    const corsoNome = corsi.find(c => c.id === f.corso_origine_id)?.name
    return (
      <div className="flex items-center gap-3 px-5 py-3 border-t hover:bg-gray-50 transition group"
        style={{ borderColor: 'rgba(27,55,104,0.06)' }}>
        <FileText size={16} style={{ color: '#0891B2', flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: '#1B3768' }}>{f.nome}</p>
          <p className="text-xs mt-0.5 flex gap-2 flex-wrap" style={{ color: 'rgba(27,55,104,0.45)' }}>
            {f.tipo && <span className="font-medium">{f.tipo}</span>}
            {sizeKb && <span>{sizeKb < 1024 ? `${sizeKb} KB` : `${(sizeKb / 1024).toFixed(1)} MB`}</span>}
            {materiaNome && vista !== 'area' && <span>· {materiaNome}</span>}
            {corsoNome && vista !== 'corso' && <span>· {corsoNome}</span>}
          </p>
        </div>
        <a href={f.file_url} target="_blank" rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 rounded-lg font-medium transition opacity-0 group-hover:opacity-100"
          style={{ background: 'rgba(8,145,178,0.08)', color: '#0891B2' }}>
          Scarica
        </a>
      </div>
    )
  }

  const VISTE = [
    { key: 'tutti' as Vista, label: 'Tutti', icon: <List size={13} /> },
    { key: 'area' as Vista, label: 'Per materia', icon: <FolderOpen size={13} /> },
    { key: 'corso' as Vista, label: 'Per corso', icon: <GraduationCap size={13} /> },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: '#1B3768' }}>Archivio Generale</h1>

      {/* Form upload */}
      <form onSubmit={handleUpload} className="rounded-2xl p-5 space-y-3"
        style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(27,55,104,0.1)' }}>
        <h2 className="text-sm font-semibold" style={{ color: '#1B3768' }}>Carica nuovo file</h2>

        {uploadError && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm bg-red-50 border border-red-200 text-red-700">
            <AlertCircle size={15} className="flex-shrink-0" />
            <span>{uploadError}</span>
            <button type="button" onClick={() => setUploadError(null)} className="ml-auto">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input type="text" placeholder="Nome documento *" required
            value={uploadForm.nome} onChange={e => setUploadForm(p => ({ ...p, nome: e.target.value }))}
            className="rounded-xl px-3 py-2 text-sm border col-span-1 sm:col-span-1"
            style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }} />
          <select value={uploadForm.area_id} onChange={e => setUploadForm(p => ({ ...p, area_id: e.target.value }))}
            className="rounded-xl px-3 py-2 text-sm border"
            style={{ borderColor: 'rgba(27,55,104,0.2)', color: uploadForm.area_id ? '#1B3768' : 'rgba(27,55,104,0.4)' }}>
            <option value="">Nessuna materia</option>
            {aree.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
          <select value={uploadForm.corso_id} onChange={e => setUploadForm(p => ({ ...p, corso_id: e.target.value }))}
            className="rounded-xl px-3 py-2 text-sm border"
            style={{ borderColor: 'rgba(27,55,104,0.2)', color: uploadForm.corso_id ? '#1B3768' : 'rgba(27,55,104,0.4)' }}>
            <option value="">Nessun corso</option>
            {corsi.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="flex gap-3 items-center">
          <input ref={fileRef} type="file" accept=".pdf,.pptx,.ppt,.doc,.docx,.xlsx,.xls,.mp4,.mov"
            className="text-sm flex-1" required />
          <button type="submit" disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition flex-shrink-0"
            style={{ background: uploading ? 'rgba(30,184,229,0.5)' : '#1EB8E5' }}>
            <Upload size={15} />
            {uploading ? 'Caricamento...' : 'Carica'}
          </button>
        </div>
      </form>

      {/* Vista + Filtri */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Tabs vista */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
          {VISTE.map(v => (
            <button key={v.key} onClick={() => {
              setVista(v.key)
              setFiltroArea('')
              setFiltroCorso('')
              setFiltroTipologia('')
            }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${vista === v.key ? 'text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              style={vista === v.key ? { backgroundColor: '#1B3768' } : {}}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>

        {/* Filtro materia (visibile in tutti e per-materia) */}
        {(vista === 'tutti' || vista === 'area') && aree.length > 0 && (
          <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)}
            className="text-xs rounded-xl px-3 py-2 border bg-white"
            style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }}>
            <option value="">Tutte le materie</option>
            {aree.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        )}

        {/* Filtro tipologia corso — sempre visibile se ci sono tipologie */}
        {tipologieCorso.length > 0 && (
          <select value={filtroTipologia} onChange={e => { setFiltroTipologia(e.target.value); setFiltroCorso('') }}
            className="text-xs rounded-xl px-3 py-2 border bg-white"
            style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }}>
            <option value="">Tutte le tipologie</option>
            {tipologieCorso.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}

        {/* Filtro corso specifico (solo vista corso) */}
        {vista === 'corso' && corsiFiltrati.length > 0 && (
          <select value={filtroCorso} onChange={e => setFiltroCorso(e.target.value)}
            className="text-xs rounded-xl px-3 py-2 border bg-white"
            style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }}>
            <option value="">Tutti i corsi</option>
            {corsiFiltrati.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        {tipi.length > 0 && (
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            className="text-xs rounded-xl px-3 py-2 border bg-white"
            style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }}>
            <option value="">Tutti i tipi</option>
            {tipi.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}

        <span className="text-xs ml-auto" style={{ color: 'rgba(27,55,104,0.5)' }}>
          {filtrati.length} {filtrati.length === 1 ? 'file' : 'file'}
        </span>
      </div>

      {/* Contenuto — lista piatta */}
      {vista === 'tutti' && (
        <div className="rounded-2xl overflow-hidden bg-white"
          style={{ border: '1px solid rgba(27,55,104,0.1)' }}>
          {filtrati.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm" style={{ color: 'rgba(27,55,104,0.4)' }}>
              Nessun file. Carica il primo documento.
            </div>
          ) : filtrati.map(f => <FileRow key={f.id} f={f} />)}
        </div>
      )}

      {/* Contenuto — per materia */}
      {vista === 'area' && (
        <div className="space-y-4">
          {aree
            .filter(a => !filtroArea || a.id === filtroArea)
            .map(materia => {
              const materiaFiles = filtrati.filter(f => f.area_id === materia.id)
              if (materiaFiles.length === 0) return null
              return (
                <div key={materia.id} className="rounded-2xl overflow-hidden bg-white"
                  style={{ border: '1px solid rgba(27,55,104,0.1)' }}>
                  <div className="px-5 py-3 flex items-center justify-between"
                    style={{ background: 'rgba(27,55,104,0.03)', borderBottom: '1px solid rgba(27,55,104,0.08)' }}>
                    <h3 className="text-sm font-semibold" style={{ color: '#1B3768' }}>{materia.nome}</h3>
                    <span className="text-xs" style={{ color: 'rgba(27,55,104,0.45)' }}>{materiaFiles.length} file</span>
                  </div>
                  {materiaFiles.map(f => <FileRow key={f.id} f={f} />)}
                </div>
              )
            })}
          {/* Senza materia */}
          {(() => {
            const senzaMateria = filtrati.filter(f => !f.area_id)
            if (!filtroArea && senzaMateria.length > 0) return (
              <div className="rounded-2xl overflow-hidden bg-white" style={{ border: '1px solid rgba(27,55,104,0.1)' }}>
                <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(27,55,104,0.08)' }}>
                  <h3 className="text-sm font-semibold" style={{ color: 'rgba(27,55,104,0.4)' }}>Senza materia</h3>
                </div>
                {senzaMateria.map(f => <FileRow key={f.id} f={f} />)}
              </div>
            )
            return null
          })()}
          {filtrati.filter(f => f.area_id || !filtroArea).length === 0 && (
            <div className="rounded-2xl bg-white px-5 py-10 text-center text-sm"
              style={{ border: '1px solid rgba(27,55,104,0.1)', color: 'rgba(27,55,104,0.4)' }}>
              Nessun file trovato.
            </div>
          )}
        </div>
      )}

      {/* Contenuto — per corso */}
      {vista === 'corso' && (
        <div className="space-y-4">
          {/* Separatore tipologia (se filtro attivo, mostra label) */}
          {filtroTipologia && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(27,55,104,0.08)', color: '#1B3768' }}>
                {filtroTipologia}
              </span>
              <button onClick={() => { setFiltroTipologia(''); setFiltroCorso('') }}
                className="text-xs text-gray-400 hover:text-gray-600 transition">
                <X size={13} />
              </button>
            </div>
          )}
          {corsiFiltrati
            .filter(c => !filtroCorso || c.id === filtroCorso)
            .map(corso => {
              const corsoFiles = filtrati.filter(f => f.corso_origine_id === corso.id)
              if (corsoFiles.length === 0) return null
              return (
                <div key={corso.id} className="rounded-2xl overflow-hidden bg-white"
                  style={{ border: '1px solid rgba(27,55,104,0.1)' }}>
                  <div className="px-5 py-3 flex items-center justify-between"
                    style={{ background: 'rgba(27,55,104,0.03)', borderBottom: '1px solid rgba(27,55,104,0.08)' }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="text-sm font-semibold truncate" style={{ color: '#1B3768' }}>{corso.name}</h3>
                      {corso.category && (
                        <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium"
                          style={{ background: 'rgba(30,184,229,0.12)', color: '#0891B2' }}>
                          {corso.category}
                        </span>
                      )}
                    </div>
                    <span className="text-xs flex-shrink-0 ml-3" style={{ color: 'rgba(27,55,104,0.45)' }}>
                      {corsoFiles.length} file
                    </span>
                  </div>
                  {corsoFiles.map(f => <FileRow key={f.id} f={f} />)}
                </div>
              )
            })}
          {filtrati.filter(f => {
            const corsoMatch = !filtroCorso || f.corso_origine_id === filtroCorso
            const tipologiaMatch = !filtroTipologia || corsiFiltrati.some(c => c.id === f.corso_origine_id)
            return f.corso_origine_id && corsoMatch && tipologiaMatch
          }).length === 0 && (
            <div className="rounded-2xl bg-white px-5 py-10 text-center text-sm"
              style={{ border: '1px solid rgba(27,55,104,0.1)', color: 'rgba(27,55,104,0.4)' }}>
              Nessun file associato a un corso.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
