'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText, Download, MessageSquare, CheckCircle, Clock, AlertCircle,
  Send, Loader2, RefreshCcw, User, Trash2, RotateCcw,
} from 'lucide-react'
import ValutaBtn from './ValutaBtn'

interface Student { id: string; full_name: string; email: string }
interface Submission {
  id: string; student_id: string
  file_url: string | null; file_name: string | null; file_size: number | null
  storage_path: string | null; file_deleted_at: string | null
  notes: string | null; submitted_at: string; status: string
  grade: string | null; grade_decimal: number | null; feedback: string | null
  version_number: number
}
interface FeedbackMsg {
  id: string; content: string; created_at: string; sender_role: string
  sender: { full_name: string; role: string } | null
}

function formatSize(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

function StatusBadge({ sub }: { sub?: Submission }) {
  if (!sub) return (
    <span className="flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
      <AlertCircle size={10} /> Non consegnato
    </span>
  )
  if (sub.status === 'valutato') return (
    <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
      <CheckCircle size={10} /> Valutato
    </span>
  )
  if (sub.status === 'in_revisione') return (
    <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
      <MessageSquare size={10} /> In revisione
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
      <Clock size={10} /> Consegnato
    </span>
  )
}

export default function ConsegneList({
  students, submissionMap, taskTitle, courseId, gradingScale = 10, taskId, hasFeedbackThread,
}: {
  students: Student[]
  submissionMap: Record<string, Submission>
  taskTitle: string
  courseId: string
  gradingScale?: number
  taskId: string
  hasFeedbackThread: boolean
}) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(students[0]?.id ?? null)
  const [thread, setThread] = useState<FeedbackMsg[]>([])
  const [threadLoading, setThreadLoading] = useState(false)
  const [msgInput, setMsgInput] = useState('')
  const [sending, setSending] = useState(false)
  const [urlLoading, setUrlLoading] = useState(false)
  const [reopenMode, setReopenMode] = useState(false)
  const [reopenDate, setReopenDate] = useState('')
  const [reopenLoading, setReopenLoading] = useState(false)
  const [reopenDone, setReopenDone] = useState(false)

  const sub = selectedId ? submissionMap[selectedId] : undefined
  const selectedStudent = students.find(s => s.id === selectedId)

  const fetchThread = useCallback(async (submissionId: string) => {
    setThreadLoading(true)
    try {
      const res = await fetch(`/api/task/feedback?submissionId=${submissionId}`)
      const data = await res.json()
      setThread(Array.isArray(data) ? data : [])
    } finally {
      setThreadLoading(false)
    }
  }, [])

  useEffect(() => {
    setThread([])
    setMsgInput('')
    setReopenMode(false)
    setReopenDone(false)
    if (sub && hasFeedbackThread) fetchThread(sub.id)
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchSignedUrl() {
    if (!sub) return
    setUrlLoading(true)
    try {
      const res = await fetch(`/api/task/signed-url?submissionId=${sub.id}`)
      const data = await res.json()
      if (data.url) window.open(data.url, '_blank')
    } finally {
      setUrlLoading(false)
    }
  }

  async function sendMessage() {
    if (!sub || !msgInput.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/task/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: sub.id, content: msgInput }),
      })
      if (res.ok) {
        const data = await res.json()
        setThread(prev => [...prev, data])
        setMsgInput('')
        router.refresh()
      }
    } finally {
      setSending(false)
    }
  }

  async function reopen() {
    if (!selectedId || !reopenDate || reopenLoading) return
    setReopenLoading(true)
    try {
      const res = await fetch(`/api/task/${taskId}/reopen`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedId, newDeadline: reopenDate }),
      })
      if (res.ok) {
        setReopenMode(false)
        setReopenDone(true)
        router.refresh()
      }
    } finally {
      setReopenLoading(false)
    }
  }

  return (
    <div className="flex min-h-[360px]" style={{ maxHeight: 680 }}>

      {/* ── Left: student list ─────────────────────────── */}
      <div className="w-56 flex-shrink-0 border-r border-gray-100 overflow-y-auto">
        {students.length === 0 && (
          <p className="p-4 text-xs text-gray-400 text-center">Nessun corsista.</p>
        )}
        {students.map(s => {
          const sub = submissionMap[s.id]
          const active = selectedId === s.id
          return (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition border-l-2 ${
                active
                  ? 'bg-blue-50 border-blue-500'
                  : 'border-transparent hover:bg-gray-50'
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-emerald-500 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                {s.full_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{s.full_name}</p>
                <div className="mt-0.5">
                  <StatusBadge sub={sub} />
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Right: detail panel ────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {!selectedStudent ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400">Seleziona un corsista</p>
          </div>
        ) : !sub ? (
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <User size={14} className="text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">{selectedStudent.full_name}</span>
              <span className="text-xs text-gray-400">{selectedStudent.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-50 rounded-xl p-4">
              <AlertCircle size={14} /> Nessuna consegna ancora.
            </div>
            {/* Reopen even without submission (to set deadline) */}
            <ReopenSection
              taskId={taskId}
              studentId={selectedStudent.id}
              reopenMode={reopenMode}
              setReopenMode={setReopenMode}
              reopenDate={reopenDate}
              setReopenDate={setReopenDate}
              reopenLoading={reopenLoading}
              reopenDone={reopenDone}
              onReopen={reopen}
              label="Estendi deadline per questo corsista"
            />
          </div>
        ) : (
          <div className="p-5 space-y-4">

            {/* Student header */}
            <div className="flex items-center gap-2 flex-wrap">
              <User size={14} className="text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">{selectedStudent.full_name}</span>
              <span className="text-xs text-gray-400">{selectedStudent.email}</span>
              <span className="ml-auto text-xs text-gray-400">
                Versione {sub.version_number} · {new Date(sub.submitted_at).toLocaleDateString('it-IT', {
                  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </span>
            </div>

            {/* Notes */}
            {sub.notes && (
              <div className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                <MessageSquare size={12} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <span>{sub.notes}</span>
              </div>
            )}

            {/* File section */}
            <div>
              {sub.file_deleted_at ? (
                <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                  <Trash2 size={12} />
                  File eliminato dopo la valutazione — archivia il tuo download locale se necessario
                </div>
              ) : sub.storage_path ? (
                <button
                  onClick={fetchSignedUrl}
                  disabled={urlLoading}
                  className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2 hover:bg-blue-100 transition w-fit"
                >
                  {urlLoading ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                  <span className="truncate max-w-[200px]">{sub.file_name ?? 'File allegato'}</span>
                  {sub.file_size && <span className="text-blue-400">· {formatSize(sub.file_size)}</span>}
                  <Download size={11} className="flex-shrink-0" />
                </button>
              ) : sub.file_url ? (
                <a
                  href={sub.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2 hover:bg-blue-100 transition w-fit"
                >
                  <FileText size={12} />
                  <span className="truncate max-w-[200px]">{sub.file_name ?? 'File allegato'}</span>
                  <Download size={11} />
                </a>
              ) : (
                <p className="text-xs text-gray-400 italic">Nessun file allegato.</p>
              )}
            </div>

            {/* Feedback thread (only singolo / microgruppo) */}
            {hasFeedbackThread && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                  <MessageSquare size={11} /> Thread feedback
                </p>

                {threadLoading ? (
                  <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                    <Loader2 size={12} className="animate-spin" /> Caricamento...
                  </div>
                ) : thread.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Nessun messaggio ancora.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {thread.map(msg => {
                      const isDocente = ['docente', 'super_admin', 'admin'].includes(msg.sender_role)
                      return (
                        <div
                          key={msg.id}
                          className={`text-xs rounded-xl px-3 py-2 max-w-[90%] ${
                            isDocente
                              ? 'bg-blue-50 text-blue-900 ml-auto'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <p className="font-semibold mb-0.5">
                            {msg.sender?.full_name ?? (isDocente ? 'Docente' : 'Studente')}
                            <span className="ml-2 font-normal text-gray-400">
                              {new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </p>
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Input nuovo messaggio (solo se non valutato) */}
                {sub.status !== 'valutato' && (
                  <div className="flex gap-2 pt-1">
                    <textarea
                      value={msgInput}
                      onChange={e => setMsgInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                      placeholder="Scrivi un feedback..."
                      rows={2}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!msgInput.trim() || sending}
                      className="self-end flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-white font-semibold disabled:opacity-50 transition"
                      style={{ backgroundColor: '#1EB8E5' }}
                    >
                      {sending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                      Invia
                    </button>
                  </div>
                )}

                {sub.status === 'valutato' && (
                  <p className="text-xs text-gray-400 italic">Thread chiuso — task valutata.</p>
                )}
              </div>
            )}

            {/* Valuta button */}
            <div className="border-t border-gray-100 pt-3">
              <ValutaBtn
                submissionId={sub.id}
                studentId={selectedStudent.id}
                taskTitle={taskTitle}
                courseId={courseId}
                gradingScale={gradingScale}
                initialGradeDecimal={sub.grade_decimal}
                initialFeedback={sub.feedback}
              />
            </div>

            {/* Reopen section (deadline extension) */}
            {sub.status === 'valutato' && (
              <ReopenSection
                taskId={taskId}
                studentId={selectedStudent.id}
                reopenMode={reopenMode}
                setReopenMode={setReopenMode}
                reopenDate={reopenDate}
                setReopenDate={setReopenDate}
                reopenLoading={reopenLoading}
                reopenDone={reopenDone}
                onReopen={reopen}
                label="Riapri per un nuovo invio"
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ReopenSection({
  taskId, studentId, reopenMode, setReopenMode, reopenDate, setReopenDate,
  reopenLoading, reopenDone, onReopen, label,
}: {
  taskId: string; studentId: string
  reopenMode: boolean; setReopenMode: (v: boolean) => void
  reopenDate: string; setReopenDate: (v: string) => void
  reopenLoading: boolean; reopenDone: boolean
  onReopen: () => void; label: string
}) {
  if (reopenDone) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
        <CheckCircle size={12} /> Deadline estesa — notifica inviata allo studente.
      </div>
    )
  }
  if (!reopenMode) {
    return (
      <button
        onClick={() => setReopenMode(true)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition"
      >
        <RotateCcw size={12} /> {label}
      </button>
    )
  }
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <label className="text-xs text-gray-600 font-medium">Nuova deadline:</label>
      <input
        type="date"
        value={reopenDate}
        onChange={e => setReopenDate(e.target.value)}
        className="text-xs px-2 py-1 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        min={new Date().toISOString().split('T')[0]}
      />
      <button
        onClick={onReopen}
        disabled={!reopenDate || reopenLoading}
        className="text-xs px-2.5 py-1 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
      >
        {reopenLoading ? <Loader2 size={10} className="animate-spin inline" /> : 'Conferma'}
      </button>
      <button onClick={() => setReopenMode(false)} className="text-xs text-gray-400 hover:text-gray-600">
        Annulla
      </button>
    </div>
  )
}
