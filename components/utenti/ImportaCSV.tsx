'use client'

import { useState, useRef } from 'react'
import { Upload, X, Loader2, CheckCircle, AlertCircle, FileText } from 'lucide-react'

type UserRole = 'super_admin' | 'docente' | 'studente'

interface ImportedUser {
  id: string
  full_name: string
  email: string
  role: UserRole
  is_active: boolean
  created_at: string
}

interface ParsedRow {
  full_name: string
  email: string
  password: string
  role: UserRole
}

interface Props {
  onImported: (users: ImportedUser[]) => void
}

function parseRole(raw: string): UserRole {
  const v = raw.trim().toLowerCase()
  if (v === 'docente') return 'docente'
  if (v === 'super_admin' || v === 'admin') return 'super_admin'
  return 'studente'
}

function parseCSV(text: string): { rows: ParsedRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length < 2) return { rows: [], errors: ['Il file non contiene dati (almeno header + 1 riga).'] }

  const rows: ParsedRow[] = []
  const errors: string[] = []

  // Skip header row (index 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const cols = splitCSVLine(line)
    const [full_name = '', email = '', password = '', roleRaw = ''] = cols.map(c => c.trim())

    if (!full_name && !email) continue // skip empty lines

    if (!full_name) { errors.push(`Riga ${i + 1}: nome completo mancante`); continue }
    if (!email) { errors.push(`Riga ${i + 1}: email mancante`); continue }
    if (!password) { errors.push(`Riga ${i + 1}: password mancante`); continue }

    rows.push({ full_name, email, password, role: parseRole(roleRaw) })
  }

  return { rows, errors }
}

function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

export default function ImportaCSV({ onImported }: Props) {
  const [open, setOpen] = useState(false)
  const [parsed, setParsed] = useState<ParsedRow[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ created: number; failed: { email: string; error: string }[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setParsed([])
    setParseErrors([])
    setFileName('')
    setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleClose() {
    setOpen(false)
    reset()
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResult(null)

    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const { rows, errors } = parseCSV(text)
      setParsed(rows)
      setParseErrors(errors)
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function handleImport() {
    if (parsed.length === 0) return
    setImporting(true)
    setResult(null)

    const res = await fetch('/api/utenti/importa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: parsed }),
    })
    const data = await res.json()
    setResult(data)

    if (data.created > 0) {
      // Build placeholder ImportedUser objects for the ones created (we don't have IDs from bulk)
      // The parent component can refresh or we pass minimal info
      const now = new Date().toISOString()
      const newUsers: ImportedUser[] = parsed
        .filter(p => !data.failed?.some((f: { email: string }) => f.email === p.email))
        .map(p => ({
          id: crypto.randomUUID(),
          full_name: p.full_name,
          email: p.email,
          role: p.role,
          is_active: true,
          created_at: now,
        }))
      onImported(newUsers)
    }

    setImporting(false)
  }

  const ROLE_LABELS: Record<UserRole, string> = {
    super_admin: 'Super Admin',
    docente: 'Docente',
    studente: 'Corsista',
  }

  const preview = parsed.slice(0, 5)
  const remaining = parsed.length - preview.length

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
      >
        <Upload size={15} />
        Importa CSV
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText size={18} style={{ color: '#003DA5' }} />
                <h2 className="font-semibold text-gray-900">Importa utenti da CSV</h2>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition p-1">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Istruzioni */}
              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800 border border-blue-100">
                <p className="font-semibold mb-1">Formato CSV atteso:</p>
                <p className="font-mono text-xs break-all">Nome Completo,Email,Password,Ruolo</p>
                <p className="text-xs text-blue-600 mt-1">
                  Ruoli validi: <span className="font-medium">studente</span>, <span className="font-medium">docente</span>, <span className="font-medium">super_admin</span> (o admin).
                  Se mancante o non valido, verrà impostato <span className="font-medium">studente</span>.
                </p>
              </div>

              {/* File input */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Seleziona file CSV</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFile}
                  className="block w-full text-sm text-gray-500
                    file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0
                    file:text-sm file:font-medium file:text-white file:cursor-pointer
                    file:transition file:hover:opacity-90"
                  style={{ ['--file-bg' as string]: '#003DA5' }}
                />
              </div>

              {/* Errori di parsing */}
              {parseErrors.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-1">
                  <div className="flex items-center gap-2 text-red-700 font-medium text-sm mb-2">
                    <AlertCircle size={15} />
                    Errori nel file ({parseErrors.length})
                  </div>
                  {parseErrors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600">{err}</p>
                  ))}
                </div>
              )}

              {/* Preview */}
              {parsed.length > 0 && !result && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">
                    Anteprima ({parsed.length} {parsed.length === 1 ? 'utente' : 'utenti'} rilevati):
                  </p>
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="text-left px-3 py-2 text-gray-500 font-medium">Nome</th>
                          <th className="text-left px-3 py-2 text-gray-500 font-medium">Email</th>
                          <th className="text-left px-3 py-2 text-gray-500 font-medium">Ruolo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {preview.map((row, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-gray-900 font-medium">{row.full_name}</td>
                            <td className="px-3 py-2 text-gray-500 break-all">{row.email}</td>
                            <td className="px-3 py-2">
                              <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                {ROLE_LABELS[row.role]}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {remaining > 0 && (
                      <p className="px-3 py-2 text-xs text-gray-400 border-t border-gray-100">
                        e altri {remaining} utenti...
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Risultato importazione */}
              {result && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                    <CheckCircle size={16} />
                    {result.created} {result.created === 1 ? 'utente creato' : 'utenti creati'}
                  </div>
                  {result.failed?.length > 0 && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-1">
                      <div className="flex items-center gap-2 text-red-700 font-medium text-sm mb-2">
                        <AlertCircle size={14} />
                        {result.failed.length} {result.failed.length === 1 ? 'errore' : 'errori'}:
                      </div>
                      {result.failed.map((f, i) => (
                        <p key={i} className="text-xs text-red-600">
                          <span className="font-medium">{f.email}</span>: {f.error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Azioni */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  {result ? 'Chiudi' : 'Annulla'}
                </button>
                {!result && (
                  <button
                    onClick={handleImport}
                    disabled={importing || parsed.length === 0}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition disabled:opacity-60"
                    style={{ backgroundColor: '#003DA5' }}
                  >
                    {importing && <Loader2 size={13} className="animate-spin" />}
                    {importing ? 'Importazione...' : `Importa ${parsed.length} ${parsed.length === 1 ? 'utente' : 'utenti'}`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
