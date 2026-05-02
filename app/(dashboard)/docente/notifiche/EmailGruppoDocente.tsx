'use client'

import { useState } from 'react'
import { Mail, Loader2, CheckCircle, BookOpen, Users, User } from 'lucide-react'

interface Course { id: string; name: string }
interface Group { id: string; name: string; courseId: string }
interface Student { id: string; full_name: string; email: string; courseId: string }

interface Props {
  courses: Course[]
  groups: Group[]
  students: Student[]
}

type RecipientType = 'all' | 'group' | 'student'

export default function EmailGruppoDocente({ courses, groups, students }: Props) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '')
  const [recipientType, setRecipientType] = useState<RecipientType>('all')
  const [groupId, setGroupId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number } | null>(null)
  const [error, setError] = useState('')

  const courseGroups = groups.filter(g => g.courseId === courseId)
  const courseStudents = students.filter(s => s.courseId === courseId)

  function handleCourseChange(id: string) {
    setCourseId(id)
    setGroupId('')
    setStudentId('')
  }

  function handleRecipientTypeChange(type: RecipientType) {
    setRecipientType(type)
    setGroupId('')
    setStudentId('')
  }

  async function send() {
    if (!courseId || !subject.trim() || !body.trim()) return
    if (recipientType === 'group' && !groupId) return
    if (recipientType === 'student' && !studentId) return

    setSending(true)
    setError('')
    setResult(null)

    const res = await fetch('/api/email/invia-gruppo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId,
        recipientType,
        groupId: recipientType === 'group' ? groupId : undefined,
        studentId: recipientType === 'student' ? studentId : undefined,
        subject: subject.trim(),
        body: body.trim(),
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Errore durante l\'invio')
    } else {
      setResult({ sent: data.sent })
      setSubject('')
      setBody('')
    }
    setSending(false)
  }

  if (courses.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <BookOpen size={32} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Nessun corso assegnato. Non puoi inviare email.</p>
      </div>
    )
  }

  const canSend =
    courseId &&
    subject.trim() &&
    body.trim() &&
    (recipientType === 'all' ||
      (recipientType === 'group' && groupId) ||
      (recipientType === 'student' && studentId))

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
      {/* Corso */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Corso</label>
        <select
          value={courseId}
          onChange={e => handleCourseChange(e.target.value)}
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Destinatari */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Destinatari</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleRecipientTypeChange('all')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition ${
              recipientType === 'all'
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <Users size={14} />
            Tutti i corsisti
          </button>
          {courseGroups.length > 0 && (
            <button
              type="button"
              onClick={() => handleRecipientTypeChange('group')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition ${
                recipientType === 'group'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <Users size={14} />
              Microgruppo
            </button>
          )}
          <button
            type="button"
            onClick={() => handleRecipientTypeChange('student')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition ${
              recipientType === 'student'
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <User size={14} />
            Singolo corsista
          </button>
        </div>

        {recipientType === 'group' && (
          <select
            value={groupId}
            onChange={e => setGroupId(e.target.value)}
            className="mt-3 w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Seleziona microgruppo…</option>
            {courseGroups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        )}

        {recipientType === 'student' && (
          <select
            value={studentId}
            onChange={e => setStudentId(e.target.value)}
            className="mt-3 w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Seleziona corsista…</option>
            {courseStudents.map(s => (
              <option key={s.id} value={s.id}>{s.full_name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Oggetto */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Oggetto *</label>
        <input
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="es. Aggiornamento sul corso di questa settimana"
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Corpo */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Messaggio *</label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Scrivi il testo dell'email per i corsisti..."
          rows={6}
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <p className="text-xs text-gray-400 mt-1.5">
          I corsisti riceveranno questa email dalla casella noreply@coachlab.it con il tuo nome come mittente.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <CheckCircle size={16} />
          <span>Email inviata a <strong>{result.sent}</strong> {result.sent === 1 ? 'corsista' : 'corsisti'}.</span>
        </div>
      )}

      <button
        onClick={send}
        disabled={sending || !canSend}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 hover:opacity-90 transition"
        style={{ backgroundColor: '#1565C0' }}
      >
        {sending ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
        {sending ? 'Invio in corso...' : 'Invia email'}
      </button>
    </div>
  )
}
