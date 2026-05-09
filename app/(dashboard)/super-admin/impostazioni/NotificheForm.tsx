'use client'

import { useState } from 'react'
import { Send, Loader2, Check } from 'lucide-react'

interface User { id: string; full_name: string; role: string }
interface Course { id: string; name: string }
interface Group { id: string; name: string; courseId: string }

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin', docente: 'Docente', studente: 'Corsista',
}

export default function NotificheForm({
  users,
  courses = [],
  groups = [],
}: {
  users: User[]
  courses?: Course[]
  groups?: Group[]
}) {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [target, setTarget] = useState('all')
  const [courseId, setCourseId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  const groupsForCourse = groups.filter(g => g.courseId === courseId)

  function handleTargetChange(val: string) {
    setTarget(val)
    setCourseId('')
    setGroupId('')
  }

  async function send() {
    if (!title.trim() || !message.trim()) return
    if ((target === 'course' || target === 'group') && !courseId) return
    if (target === 'group' && !groupId) return
    setSending(true)
    setResult(null)
    const res = await fetch('/api/notifiche/invia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, message, target, courseId: courseId || undefined, groupId: groupId || undefined }),
    })
    const data = await res.json()
    if (res.ok) {
      setResult({ ok: true, text: `Notifica inviata a ${data.sent} ${data.sent === 1 ? 'utente' : 'utenti'}.` })
      setTitle('')
      setMessage('')
      setTarget('all')
      setCourseId('')
      setGroupId('')
    } else {
      setResult({ ok: false, text: data.error ?? "Errore durante l'invio" })
    }
    setSending(false)
  }

  const inputCls = "w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 bg-white"
  const inputStyle = { '--tw-ring-color': '#1EB8E5' } as React.CSSProperties

  return (
    <div className="space-y-4">
      {/* Tipo destinatario */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Tipo destinatari</label>
        <select
          value={target}
          onChange={e => handleTargetChange(e.target.value)}
          className={inputCls} style={inputStyle}
        >
          <option value="all">Tutti gli utenti</option>
          <option value="docenti">Solo Docenti</option>
          <option value="studenti">Solo Corsisti</option>
          {courses.length > 0 && <option value="course">Corsisti di un corso</option>}
          {groups.length > 0 && <option value="group">Membri di un microgruppo</option>}
          <optgroup label="Utente specifico">
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.full_name} ({ROLE_LABELS[u.role] ?? u.role})
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Selezione corso (per target=course o group) */}
      {(target === 'course' || target === 'group') && (
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Corso</label>
          <select
            value={courseId}
            onChange={e => { setCourseId(e.target.value); setGroupId('') }}
            className={inputCls} style={inputStyle}
          >
            <option value="">— Seleziona corso —</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      {/* Selezione microgruppo */}
      {target === 'group' && courseId && (
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Microgruppo</label>
          <select
            value={groupId}
            onChange={e => setGroupId(e.target.value)}
            className={inputCls} style={inputStyle}
          >
            <option value="">— Seleziona microgruppo —</option>
            {groupsForCourse.length === 0 && <option disabled>Nessun microgruppo in questo corso</option>}
            {groupsForCourse.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      )}

      {/* Titolo */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Titolo</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Es. Aggiornamento calendario"
          maxLength={100}
          className={inputCls} style={inputStyle}
        />
      </div>

      {/* Messaggio */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Messaggio</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Scrivi il messaggio da inviare..."
          rows={4}
          maxLength={500}
          className={`${inputCls} resize-none`} style={inputStyle}
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/500</p>
      </div>

      {result && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${result.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {result.ok && <Check size={14} />}
          {result.text}
        </div>
      )}

      <button
        onClick={send}
        disabled={
          sending ||
          !title.trim() ||
          !message.trim() ||
          ((target === 'course' || target === 'group') && !courseId) ||
          (target === 'group' && !groupId)
        }
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white text-sm font-semibold transition disabled:opacity-60 hover:opacity-90"
        style={{ backgroundColor: '#1EB8E5' }}
      >
        {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        {sending ? 'Invio in corso...' : 'Invia notifica'}
      </button>
    </div>
  )
}
