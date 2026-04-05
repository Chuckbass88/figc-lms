'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, UserCheck, GraduationCap, Plus, X, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ImportaCorsistiBtn from './ImportaCorsistiBtn'

interface Person { id: string; full_name: string; email: string }

interface Props {
  course: { id: string; name: string }
  allDocenti: Person[]
  allStudenti: Person[]
  assignedInstructorIds: string[]
  enrolledStudentIds: string[]
}

export default function GestioneCorsoClient({
  course,
  allDocenti,
  allStudenti,
  assignedInstructorIds,
  enrolledStudentIds,
}: Props) {
  const router = useRouter()
  const [instructorIds, setInstructorIds] = useState(new Set(assignedInstructorIds))
  const [studentIds, setStudentIds] = useState(new Set(enrolledStudentIds))
  const [searchDocenti, setSearchDocenti] = useState('')
  const [searchStudenti, setSearchStudenti] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  const supabase = createClient()

  // --- Docenti ---
  async function addInstructor(id: string) {
    setLoading(id)
    await supabase.from('course_instructors').insert({ course_id: course.id, instructor_id: id })
    setInstructorIds(prev => new Set([...prev, id]))
    setLoading(null)
  }

  async function removeInstructor(id: string) {
    setLoading(id)
    await supabase.from('course_instructors')
      .delete().eq('course_id', course.id).eq('instructor_id', id)
    setInstructorIds(prev => { const s = new Set(prev); s.delete(id); return s })
    setLoading(null)
  }

  // --- Studenti ---
  async function addStudent(id: string) {
    setLoading(id)
    await supabase.from('course_enrollments')
      .upsert({ course_id: course.id, student_id: id, status: 'active' }, { onConflict: 'course_id,student_id' })
    setStudentIds(prev => new Set([...prev, id]))
    setLoading(null)
  }

  async function removeStudent(id: string) {
    setLoading(id)
    await supabase.from('course_enrollments')
      .delete().eq('course_id', course.id).eq('student_id', id)
    setStudentIds(prev => { const s = new Set(prev); s.delete(id); return s })
    setLoading(null)
  }

  const assignedDocenti = allDocenti.filter(d => instructorIds.has(d.id))
  const availableDocenti = allDocenti.filter(d =>
    !instructorIds.has(d.id) &&
    (d.full_name.toLowerCase().includes(searchDocenti.toLowerCase()) ||
     d.email.toLowerCase().includes(searchDocenti.toLowerCase()))
  )
  const enrolledStudenti = allStudenti.filter(s => studentIds.has(s.id))
  const availableStudenti = allStudenti.filter(s =>
    !studentIds.has(s.id) &&
    (s.full_name.toLowerCase().includes(searchStudenti.toLowerCase()) ||
     s.email.toLowerCase().includes(searchStudenti.toLowerCase()))
  )

  async function addAllVisible() {
    if (availableStudenti.length === 0) return
    setLoading('bulk')
    const rows = availableStudenti.map(s => ({
      course_id: course.id, student_id: s.id, status: 'active',
    }))
    await supabase.from('course_enrollments').upsert(rows, { onConflict: 'course_id,student_id' })
    setStudentIds(prev => new Set([...prev, ...availableStudenti.map(s => s.id)]))
    setLoading(null)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/super-admin/corsi')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3"
        >
          <ArrowLeft size={15} /> Torna ai corsi
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gestione partecipanti</h2>
            <p className="text-gray-500 text-sm mt-1">{course.name}</p>
          </div>
          <ImportaCorsistiBtn
            courseId={course.id}
            onImported={newIds => setStudentIds(prev => new Set([...prev, ...newIds]))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* === DOCENTI === */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <UserCheck size={16} className="text-blue-600" />
            <h3 className="font-semibold text-gray-900">Docenti assegnati</h3>
            <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {instructorIds.size}
            </span>
          </div>

          {/* Assegnati */}
          <div className="divide-y divide-gray-50 min-h-[60px]">
            {assignedDocenti.map(d => (
              <div key={d.id} className="px-5 py-2.5 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#1565C0' }}>
                  {d.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{d.full_name}</p>
                  <p className="text-xs text-gray-400 truncate">{d.email}</p>
                </div>
                <button
                  onClick={() => removeInstructor(d.id)}
                  disabled={loading === d.id}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition disabled:opacity-40"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            {assignedDocenti.length === 0 && (
              <p className="px-5 py-4 text-sm text-gray-400">Nessun docente assegnato.</p>
            )}
          </div>

          {/* Aggiungi docente */}
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Aggiungi docente</p>
            <div className="relative mb-2">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchDocenti}
                onChange={e => setSearchDocenti(e.target.value)}
                placeholder="Cerca per nome o email..."
                className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              />
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {availableDocenti.map(d => (
                <button
                  key={d.id}
                  onClick={() => addInstructor(d.id)}
                  disabled={loading === d.id}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white border border-transparent hover:border-blue-200 text-left transition disabled:opacity-40 group"
                >
                  <Plus size={13} className="text-blue-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{d.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">{d.email}</p>
                  </div>
                </button>
              ))}
              {availableDocenti.length === 0 && searchDocenti && (
                <p className="text-xs text-gray-400 px-3 py-2">Nessun risultato.</p>
              )}
              {availableDocenti.length === 0 && !searchDocenti && allDocenti.length === instructorIds.size && (
                <p className="text-xs text-gray-400 px-3 py-2">Tutti i docenti sono già assegnati.</p>
              )}
            </div>
          </div>
        </div>

        {/* === CORSISTI === */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <GraduationCap size={16} className="text-green-600" />
            <h3 className="font-semibold text-gray-900">Corsisti iscritti</h3>
            <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              {studentIds.size}
            </span>
          </div>

          {/* Iscritti */}
          <div className="divide-y divide-gray-50 min-h-[60px] max-h-64 overflow-y-auto">
            {enrolledStudenti.map(s => (
              <div key={s.id} className="px-5 py-2.5 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-emerald-500">
                  {s.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.full_name}</p>
                  <p className="text-xs text-gray-400 truncate">{s.email}</p>
                </div>
                <button
                  onClick={() => removeStudent(s.id)}
                  disabled={loading === s.id}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition disabled:opacity-40"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            {enrolledStudenti.length === 0 && (
              <p className="px-5 py-4 text-sm text-gray-400">Nessun corsista iscritto.</p>
            )}
          </div>

          {/* Aggiungi corsista */}
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Aggiungi corsista</p>
              {availableStudenti.length > 1 && (
                <button
                  onClick={addAllVisible}
                  disabled={loading === 'bulk'}
                  className="flex items-center gap-1 text-xs font-semibold text-green-700 hover:text-green-800 bg-green-100 hover:bg-green-200 px-2.5 py-1 rounded-lg transition disabled:opacity-50"
                >
                  <Plus size={11} />
                  Aggiungi tutti ({availableStudenti.length})
                </button>
              )}
            </div>
            <div className="relative mb-2">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchStudenti}
                onChange={e => setSearchStudenti(e.target.value)}
                placeholder="Cerca per nome o email..."
                className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              />
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {availableStudenti.map(s => (
                <button
                  key={s.id}
                  onClick={() => addStudent(s.id)}
                  disabled={loading === s.id || loading === 'bulk'}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white border border-transparent hover:border-green-200 text-left transition disabled:opacity-40"
                >
                  <Plus size={13} className="text-green-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">{s.email}</p>
                  </div>
                </button>
              ))}
              {availableStudenti.length === 0 && searchStudenti && (
                <p className="text-xs text-gray-400 px-3 py-2">Nessun risultato.</p>
              )}
              {availableStudenti.length === 0 && !searchStudenti && (
                <p className="text-xs text-gray-400 px-3 py-2">Tutti i corsisti sono già iscritti.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
