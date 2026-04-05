'use client'

import { useRef, useState } from 'react'
import { Upload, X, Loader2, Download, CheckCircle, AlertCircle } from 'lucide-react'

interface ImportResult {
  created: number
  enrolled: number
  skipped: number
  errors: { row: number; email: string; reason: string }[]
}

export default function ImportaCorsistiBtn({
  courseId,
  onImported,
}: {
  courseId: string
  onImported: (newIds: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function downloadTemplate() {
    const csv = 'Nome,Cognome,Email\nMario,Rossi,mario.rossi@example.com\nLuca,Bianchi,luca.bianchi@example.com'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_corsisti.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport() {
    if (!file) return
    setLoading(true)
    setResult(null)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('courseId', courseId)
    const res = await fetch('/api/admin/importa-corsisti', { method: 'POST', body: fd })
    const json = await res.json()
    setLoading(false)
    if (res.ok) {
      setResult(json)
      if (json.newIds?.length > 0) onImported(json.newIds)
    } else {
      setResult({ created: 0, enrolled: 0, skipped: 0, errors: [{ row: 0, email: '', reason: json.error ?? 'Errore sconosciuto' }] })
    }
  }

  function close() {
    setOpen(false)
    setFile(null)
    setResult(null)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
      >
        <Upload size={14} /> Importa da Excel/CSV
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Importa corsisti da file</h3>
              <button onClick={close} className="text-gray-400 hover:text-gray-600 transition">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {!result ? (
                <>
                  <p className="text-sm text-gray-500">
                    Carica un file <strong>CSV o Excel (.xlsx)</strong> con le colonne: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">Nome, Cognome, Email</code>
                    <br />Il sistema creerà gli account mancanti e iscriverà tutti i corsisti al corso.
                    <br />La password iniziale sarà <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">Cambia2025!</code> — comunicala ai corsisti.
                  </p>

                  <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition"
                  >
                    <Download size={12} /> Scarica template CSV
                  </button>

                  <div
                    className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-300 transition"
                    onClick={() => inputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) setFile(f) }}
                  >
                    <Upload size={24} className="mx-auto text-gray-300 mb-2" />
                    {file ? (
                      <p className="text-sm font-medium text-gray-700">{file.name}</p>
                    ) : (
                      <p className="text-sm text-gray-400">Clicca per selezionare il file</p>
                    )}
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      onChange={e => setFile(e.target.files?.[0] ?? null)}
                    />
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={close}
                      className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={!file || loading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition disabled:opacity-60"
                      style={{ backgroundColor: '#1565C0' }}
                    >
                      {loading && <Loader2 size={13} className="animate-spin" />}
                      {loading ? 'Importazione...' : 'Importa'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-green-50 rounded-xl p-3">
                      <p className="text-2xl font-bold text-green-700">{result.created}</p>
                      <p className="text-xs text-green-600">Account creati</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3">
                      <p className="text-2xl font-bold text-blue-700">{result.enrolled}</p>
                      <p className="text-xs text-blue-600">Iscritti al corso</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-2xl font-bold text-gray-500">{result.skipped}</p>
                      <p className="text-xs text-gray-400">Già iscritti</p>
                    </div>
                  </div>

                  {result.errors.length > 0 && (
                    <div className="bg-red-50 rounded-xl p-3 space-y-1">
                      <p className="text-xs font-semibold text-red-700 flex items-center gap-1">
                        <AlertCircle size={12} /> {result.errors.length} righe con errore
                      </p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {result.errors.map((e, i) => (
                          <p key={i} className="text-xs text-red-600">
                            {e.row > 0 && `Riga ${e.row}: `}{e.email && `${e.email} — `}{e.reason}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.errors.length === 0 && (
                    <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                      <CheckCircle size={16} /> Importazione completata senza errori
                    </div>
                  )}

                  <button
                    onClick={close}
                    className="w-full px-4 py-2 rounded-lg text-white text-sm font-semibold transition hover:opacity-90"
                    style={{ backgroundColor: '#1565C0' }}
                  >
                    Chiudi
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
