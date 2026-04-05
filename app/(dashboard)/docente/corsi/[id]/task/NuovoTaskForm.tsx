'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2, Link2, Upload, FileText } from 'lucide-react'

interface Group { id: string; name: string }
interface Student { id: string; full_name: string }
interface Props { courseId: string; groups: Group[]; students: Student[] }

export default function NuovoTaskForm({ courseId, groups, students }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [recipient, setRecipient] = useState('')
  const [attachType, setAttachType] = useState<'none' | 'link' | 'file'>('none')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkName, setLinkName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function reset() {
    setOpen(false)
    setTitle('')
    setDescription('')
    setDueDate('')
    setRecipient('')
    setAttachType('none')
    setLinkUrl('')
    setLinkName('')
    setFile(null)
    setError(null)
  }

  async function crea() {
    if (!title.trim()) return
    setLoading(true)

    const fd = new FormData()
    fd.append('courseId', courseId)
    if (recipient.startsWith('group:')) {
      fd.append('groupId', recipient.replace('group:', ''))
    } else if (recipient.startsWith('student:')) {
      fd.append('studentId', recipient.replace('student:', ''))
    }
    fd.append('title', title.trim())
    fd.append('description', description.trim())
    fd.append('dueDate', dueDate)
    if (attachType === 'link' && linkUrl.trim()) {
      fd.append('attachmentUrl', linkUrl.trim())
      fd.append('attachmentName', linkName.trim() || linkUrl.trim())
      fd.append('attachmentType', 'link')
    } else if (attachType === 'file' && file) {
      fd.append('file', file)
      fd.append('attachmentType', 'file')
    }

    const res = await fetch('/api/task/create', { method: 'POST', body: fd })
    const json = await res.json()
    setLoading(false)
    if (res.ok) {
      reset()
      window.location.reload()
    } else {
      setError(json.error ?? 'Errore durante la creazione della task')
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition hover:opacity-90 flex-shrink-0"
        style={{ backgroundColor: '#1565C0' }}
      >
        <Plus size={15} /> Nuova task
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="font-semibold text-gray-900">Crea nuova task</h3>
              <button onClick={reset} className="text-gray-400 hover:text-gray-600 transition">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Titolo <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Es. Analisi tattica Lezione 3"
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Descrizione / istruzioni
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Descrivi cosa deve svolgere il corsista..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                    Scadenza
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    min={today}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                    Destinatari
                  </label>
                  <select
                    value={recipient}
                    onChange={e => setRecipient(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Tutto il corso</option>
                    {groups.length > 0 && (
                      <optgroup label="Microgruppi">
                        {groups.map(g => (
                          <option key={g.id} value={`group:${g.id}`}>{g.name}</option>
                        ))}
                      </optgroup>
                    )}
                    {students.length > 0 && (
                      <optgroup label="Singolo corsista">
                        {students.map(s => (
                          <option key={s.id} value={`student:${s.id}`}>{s.full_name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              </div>

              {/* Allegato */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                  Allegato (opzionale)
                </label>
                <div className="flex gap-2 mb-3">
                  {([['none', 'Nessuno'], ['link', 'Link / cartella'], ['file', 'Carica file']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAttachType(val)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
                        attachType === val
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {attachType === 'link' && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Link2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="url"
                        value={linkUrl}
                        onChange={e => setLinkUrl(e.target.value)}
                        placeholder="https://drive.google.com/... oppure URL"
                        className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <input
                      type="text"
                      value={linkName}
                      onChange={e => setLinkName(e.target.value)}
                      placeholder="Nome visualizzato (es. Cartella materiali lezione 3)"
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {attachType === 'file' && (
                  <div
                    className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-blue-300 transition"
                    onClick={() => fileRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) setFile(f) }}
                  >
                    {file ? (
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                        <FileText size={15} className="text-blue-500" />
                        <span className="font-medium truncate max-w-[260px]">{file.name}</span>
                        <button type="button" onClick={e => { e.stopPropagation(); setFile(null) }} className="text-gray-400 hover:text-red-500 transition">
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-gray-400">
                        <Upload size={20} />
                        <p className="text-xs">Clicca o trascina un file</p>
                        <p className="text-xs text-gray-300">PDF, Word, Excel, immagini...</p>
                      </div>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      className="hidden"
                      onChange={e => setFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={reset}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  Annulla
                </button>
                <button
                  onClick={crea}
                  disabled={!title.trim() || loading || (attachType === 'link' && !linkUrl.trim())}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition"
                  style={{ backgroundColor: '#1565C0' }}
                >
                  {loading && <Loader2 size={13} className="animate-spin" />}
                  Crea task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
