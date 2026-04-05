'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X, Users, UserCheck, GraduationCap, ChevronDown, ChevronUp, Trash2, Loader2, Pencil, Check } from 'lucide-react'

interface Person { id: string; full_name: string; email: string }
interface Group {
  id: string
  name: string
  description: string | null
  created_at: string
  course_group_members: { student_id: string; profiles: Person | null }[]
  course_group_instructors: { instructor_id: string; profiles: Person | null }[]
}

interface Props {
  course: { id: string; name: string }
  initialGroups: Group[]
  courseDocenti: Person[]
  courseStudenti: Person[]
  backPath?: string
}

export default function GruppiClient({ course, initialGroups, courseDocenti, courseStudenti, backPath }: Props) {
  const router = useRouter()
  const defaultBackPath = `/super-admin/corsi/${course.id}/gestione`
  const resolvedBackPath = backPath ?? defaultBackPath

  const [groups, setGroups] = useState(initialGroups)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Crea gruppo
  async function createGroup() {
    if (!newName.trim()) return
    setCreating(true)
    const res = await fetch('/api/gruppi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: course.id, name: newName.trim(), description: newDesc.trim() || null }),
    })
    const json = await res.json()
    if (res.ok && json.group) {
      setGroups(prev => [...prev, { ...json.group, course_group_members: [], course_group_instructors: [] }])
      setNewName('')
      setNewDesc('')
      setShowForm(false)
      setExpanded(json.group.id)
    }
    setCreating(false)
  }

  // Modifica gruppo
  async function saveGroupEdit(groupId: string) {
    if (!editName.trim()) return
    setSavingEdit(true)
    const res = await fetch('/api/gruppi', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, name: editName.trim(), description: editDesc.trim() || null }),
    })
    if (res.ok) {
      setGroups(prev => prev.map(g => g.id === groupId
        ? { ...g, name: editName.trim(), description: editDesc.trim() || null }
        : g
      ))
    }
    setEditingGroup(null)
    setSavingEdit(false)
  }

  // Elimina gruppo
  async function deleteGroup(groupId: string) {
    if (!confirm('Eliminare questo gruppo?')) return
    await fetch('/api/gruppi', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId }),
    })
    setGroups(prev => prev.filter(g => g.id !== groupId))
    if (expanded === groupId) setExpanded(null)
  }

  // Aggiungi corsista al gruppo
  async function addMember(groupId: string, student: Person) {
    setLoading(`m-${groupId}-${student.id}`)
    await fetch('/api/gruppi/membri', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, studentId: student.id }),
    })
    setGroups(prev => prev.map(g => g.id === groupId
      ? { ...g, course_group_members: [...g.course_group_members, { student_id: student.id, profiles: student }] }
      : g
    ))
    setLoading(null)
  }

  // Rimuovi corsista dal gruppo
  async function removeMember(groupId: string, studentId: string) {
    setLoading(`m-${groupId}-${studentId}`)
    await fetch('/api/gruppi/membri', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, studentId }),
    })
    setGroups(prev => prev.map(g => g.id === groupId
      ? { ...g, course_group_members: g.course_group_members.filter(m => m.student_id !== studentId) }
      : g
    ))
    setLoading(null)
  }

  // Aggiungi docente al gruppo
  async function addInstructor(groupId: string, docente: Person) {
    setLoading(`i-${groupId}-${docente.id}`)
    await fetch('/api/gruppi/istruttori', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, instructorId: docente.id }),
    })
    setGroups(prev => prev.map(g => g.id === groupId
      ? { ...g, course_group_instructors: [...g.course_group_instructors, { instructor_id: docente.id, profiles: docente }] }
      : g
    ))
    setLoading(null)
  }

  // Rimuovi docente dal gruppo
  async function removeInstructor(groupId: string, instructorId: string) {
    setLoading(`i-${groupId}-${instructorId}`)
    await fetch('/api/gruppi/istruttori', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, instructorId }),
    })
    setGroups(prev => prev.map(g => g.id === groupId
      ? { ...g, course_group_instructors: g.course_group_instructors.filter(i => i.instructor_id !== instructorId) }
      : g
    ))
    setLoading(null)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push(resolvedBackPath)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3"
        >
          <ArrowLeft size={15} /> Torna alla gestione partecipanti
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Microgruppi</h2>
            <p className="text-gray-500 text-sm mt-1">{course.name} &middot; {groups.length} {groups.length === 1 ? 'gruppo' : 'gruppi'}</p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition hover:opacity-90"
            style={{ backgroundColor: '#1565C0' }}
          >
            <Plus size={15} />
            Crea nuovo microgruppo
          </button>
        </div>
      </div>

      {/* Form nuovo gruppo */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <p className="font-semibold text-gray-800 text-sm">Crea nuovo gruppo</p>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nome gruppo (es. Gruppo A)"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            placeholder="Descrizione (opzionale)"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="flex gap-3">
            <button
              onClick={() => { setShowForm(false); setNewName(''); setNewDesc('') }}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              Annulla
            </button>
            <button
              onClick={createGroup}
              disabled={creating || !newName.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition disabled:opacity-60"
              style={{ backgroundColor: '#1565C0' }}
            >
              {creating && <Loader2 size={13} className="animate-spin" />}
              Crea gruppo
            </button>
          </div>
        </div>
      )}

      {/* Lista gruppi */}
      <div className="space-y-3">
        {groups.map(group => {
          const isOpen = expanded === group.id
          const memberIds = new Set(group.course_group_members.map(m => m.student_id))
          const instructorIds = new Set(group.course_group_instructors.map(i => i.instructor_id))
          const availableStudenti = courseStudenti.filter(s => !memberIds.has(s.id))
          const availableDocenti = courseDocenti.filter(d => !instructorIds.has(d.id))

          return (
            <div key={group.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Header gruppo */}
              {editingGroup === group.id ? (
                <div className="px-5 py-4 space-y-2" onClick={e => e.stopPropagation()}>
                  <p className="text-xs font-semibold text-blue-700 mb-1">Modifica gruppo</p>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Nome gruppo"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    placeholder="Descrizione (opzionale)"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingGroup(null)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={() => saveGroupEdit(group.id)}
                      disabled={savingEdit || !editName.trim()}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-sm font-semibold disabled:opacity-60 transition"
                      style={{ backgroundColor: '#1565C0' }}
                    >
                      {savingEdit ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Salva
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => setExpanded(isOpen ? null : group.id)}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ backgroundColor: '#1565C0' }}>
                    <Users size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{group.name}</p>
                    {group.description && <p className="text-xs text-gray-400 truncate">{group.description}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs text-gray-400 mr-1">
                      {group.course_group_members.length} cors. · {group.course_group_instructors.length} doc.
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); setEditingGroup(group.id); setEditName(group.name); setEditDesc(group.description ?? '') }}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-300 hover:text-blue-500 transition"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteGroup(group.id) }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition"
                    >
                      <Trash2 size={13} />
                    </button>
                    {isOpen ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                  </div>
                </div>
              )}

              {/* Contenuto gruppo */}
              {isOpen && (
                <div className="border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">

                  {/* Docenti del gruppo */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <UserCheck size={14} className="text-blue-500" />
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Docenti</p>
                    </div>
                    <div className="space-y-1.5 mb-3">
                      {group.course_group_instructors.map(i => (
                        <div key={i.instructor_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-blue-50">
                          <span className="text-sm font-medium text-gray-800 flex-1 truncate">{i.profiles?.full_name}</span>
                          <button
                            onClick={() => removeInstructor(group.id, i.instructor_id)}
                            disabled={loading === `i-${group.id}-${i.instructor_id}`}
                            className="text-blue-400 hover:text-red-500 transition disabled:opacity-40"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {group.course_group_instructors.length === 0 && (
                        <p className="text-xs text-gray-400">Nessun docente assegnato</p>
                      )}
                    </div>
                    {availableDocenti.length > 0 && (
                      <div className="space-y-1">
                        {availableDocenti.map(d => (
                          <button
                            key={d.id}
                            onClick={() => addInstructor(group.id, d)}
                            disabled={loading === `i-${group.id}-${d.id}`}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 text-left transition disabled:opacity-40 text-sm text-gray-600"
                          >
                            <Plus size={11} className="text-blue-400 flex-shrink-0" />
                            {d.full_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Corsisti del gruppo */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <GraduationCap size={14} className="text-green-500" />
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Corsisti</p>
                    </div>
                    <div className="space-y-1.5 mb-3 max-h-40 overflow-y-auto">
                      {group.course_group_members.map(m => (
                        <div key={m.student_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-green-50">
                          <span className="text-sm font-medium text-gray-800 flex-1 truncate">{m.profiles?.full_name}</span>
                          <button
                            onClick={() => removeMember(group.id, m.student_id)}
                            disabled={loading === `m-${group.id}-${m.student_id}`}
                            className="text-green-400 hover:text-red-500 transition disabled:opacity-40"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {group.course_group_members.length === 0 && (
                        <p className="text-xs text-gray-400">Nessun corsista assegnato</p>
                      )}
                    </div>
                    {availableStudenti.length > 0 && (
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {availableStudenti.map(s => (
                          <button
                            key={s.id}
                            onClick={() => addMember(group.id, s)}
                            disabled={loading === `m-${group.id}-${s.id}`}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 text-left transition disabled:opacity-40 text-sm text-gray-600"
                          >
                            <Plus size={11} className="text-green-400 flex-shrink-0" />
                            {s.full_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {groups.length === 0 && !showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400 mb-3">Nessun gruppo creato per questo corso.</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ backgroundColor: '#1565C0' }}
            >
              Crea il primo gruppo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
