'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Eye, EyeOff, Users, GitFork, ExternalLink, FileText, Presentation, Globe } from 'lucide-react'
import ProgrammaEditor from '@/components/programma/ProgrammaEditor'
import type { ProgramWithDetails, ProgramVisibility } from '@/lib/types'

interface Props {
  courseId: string
  courseName: string
  programs: ProgramWithDetails[]
  courseInstructors: { id: string; full_name: string }[]
  courseSessions: { id: string; title: string; session_date: string }[]
  role: 'super_admin' | 'docente'
  currentUserId: string
}

const VISIBILITY_LABELS: Record<ProgramVisibility, { label: string; icon: React.ReactNode; color: string }> = {
  private:     { label: 'Privato',          icon: <EyeOff size={13} />,  color: 'text-gray-500 bg-gray-100' },
  instructors: { label: 'Docenti del corso', icon: <Users size={13} />,   color: 'text-blue-600 bg-blue-50' },
  students:    { label: 'Studenti',          icon: <Globe size={13} />,   color: 'text-green-600 bg-green-50' },
}

export default function ProgrammaPageClient({ courseId, courseName, programs: initialPrograms, courseInstructors, courseSessions, role, currentUserId }: Props) {
  const [programs, setPrograms] = useState(initialPrograms)
  const [selectedId, setSelectedId] = useState<string | null>(initialPrograms[0]?.id ?? null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [loading, setLoading] = useState(false)

  const selected = programs.find(p => p.id === selectedId) ?? null
  const isOwner = selected ? (role === 'super_admin' || selected.created_by === currentUserId) : false

  async function handleCreate() {
    if (!newTitle.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/programma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, title: newTitle.trim() }),
      })
      if (res.ok) {
        const newProg = await res.json()
        await refreshPrograms()
        setSelectedId(newProg.id)
        setCreatingNew(false)
        setNewTitle('')
      }
    } finally { setLoading(false) }
  }

  async function handleFork(programId: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/programma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, title: `Copia — ${selected?.title}`, parentId: programId }),
      })
      if (res.ok) {
        const fork = await res.json()
        await refreshPrograms()
        setSelectedId(fork.id)
      }
    } finally { setLoading(false) }
  }

  async function handleVisibility(visibility: ProgramVisibility) {
    if (!selectedId) return
    setLoading(true)
    try {
      await fetch(`/api/programma/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility }),
      })
      await refreshPrograms()
    } finally { setLoading(false) }
  }

  async function handleDelete() {
    if (!selectedId || !confirm('Eliminare questo programma? L\'azione è irreversibile.')) return
    setLoading(true)
    try {
      await fetch(`/api/programma/${selectedId}`, { method: 'DELETE' })
      await refreshPrograms()
      setSelectedId(programs.filter(p => p.id !== selectedId)[0]?.id ?? null)
    } finally { setLoading(false) }
  }

  async function refreshPrograms() {
    const res = await fetch(`/api/programma?courseId=${courseId}`)
    if (res.ok) setPrograms(await res.json())
  }

  async function reloadSelected() {
    if (!selectedId) return
    const res = await fetch(`/api/programma/${selectedId}`)
    if (res.ok) {
      const prog = await res.json()
      setPrograms(prev => prev.map(p => p.id === selectedId ? prog : p))
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Link href={`/${role === 'super_admin' ? 'super-admin' : 'docente'}/corsi/${courseId}`} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit">
          <ArrowLeft size={15} /> {courseName}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Programma del Corso</h2>
            <p className="text-gray-500 text-sm mt-1">{courseName}</p>
          </div>
          <button onClick={() => { setCreatingNew(true); setNewTitle('') }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 transition" style={{ backgroundColor: '#1565C0' }}>
            <Plus size={15} /> Nuovo programma
          </button>
        </div>
      </div>

      {creatingNew && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-blue-800">Nuovo programma</p>
          <div className="flex gap-2">
            <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreatingNew(false) }} placeholder="Es. Programma Blocco 1 — Tattica" autoFocus className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
            <button onClick={handleCreate} disabled={loading || !newTitle.trim()} className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50">Crea</button>
            <button onClick={() => setCreatingNew(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200">Annulla</button>
          </div>
        </div>
      )}

      {programs.length === 0 && !creatingNew ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-16 text-center">
          <FileText size={40} className="text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Nessun programma ancora.</p>
          <button onClick={() => setCreatingNew(true)} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: '#1565C0' }}>
            <Plus size={15} /> Crea il primo programma
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-[240px_1fr] gap-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 mb-3">Programmi</p>
            {programs.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectedId(p.id); reloadSelected() }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition ${selectedId === p.id ? 'bg-blue-600 text-white shadow' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                <p className="font-medium truncate">{p.title}</p>
                {p.is_fork && <p className={`text-xs mt-0.5 ${selectedId === p.id ? 'text-blue-200' : 'text-amber-500'}`}>Copia personale</p>}
                <div className={`flex items-center gap-1 mt-1 text-xs ${selectedId === p.id ? 'text-blue-200' : VISIBILITY_LABELS[p.visibility as ProgramVisibility].color}`}>
                  {VISIBILITY_LABELS[p.visibility as ProgramVisibility].icon}
                  {VISIBILITY_LABELS[p.visibility as ProgramVisibility].label}
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {selected && (
              <>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800 flex-1 truncate">{selected.title}</span>

                  {isOwner && (
                    <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
                      {(['private', 'instructors', 'students'] as ProgramVisibility[]).map(v => (
                        <button key={v} onClick={() => handleVisibility(v)} disabled={loading} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition ${selected.visibility === v ? VISIBILITY_LABELS[v].color + ' shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                          {VISIBILITY_LABELS[v].icon} {VISIBILITY_LABELS[v].label}
                        </button>
                      ))}
                    </div>
                  )}

                  {!isOwner && role === 'docente' && (
                    <button onClick={() => handleFork(selected.id)} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition">
                      <GitFork size={13} /> Crea mia copia
                    </button>
                  )}

                  <a href={`/api/programma/${selected.id}/export-pdf`} target="_blank" rel="noopener" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition">
                    <FileText size={13} /> PDF
                  </a>
                  <a href={`/api/programma/${selected.id}/export-pptx`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition">
                    <Presentation size={13} /> PPTX
                  </a>

                  {selected.visibility === 'students' && (
                    <Link href={`/studente/corsi/${courseId}/programma`} target="_blank" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 transition">
                      <ExternalLink size={13} /> Anteprima studente
                    </Link>
                  )}

                  {isOwner && (
                    <button onClick={handleDelete} disabled={loading} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 transition">
                      Elimina
                    </button>
                  )}
                </div>

                <ProgrammaEditor
                  program={selected}
                  courseInstructors={courseInstructors}
                  courseSessions={courseSessions}
                  readOnly={!isOwner}
                  onProgramChange={reloadSelected}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
