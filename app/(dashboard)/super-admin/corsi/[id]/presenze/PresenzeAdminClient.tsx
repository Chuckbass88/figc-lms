'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, X, Loader2, Users, Calendar, Award } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import EsportaCSV from './EsportaCSV'

interface Student { id: string; full_name: string }
interface Attendance { student_id: string; present: boolean }
interface Session { id: string; title: string; session_date: string; attendances: Attendance[] }

interface Props {
  courseId: string
  courseName: string
  initialSessions: Session[]
  students: Student[]
}

export default function PresenzeAdminClient({ courseId, courseName, initialSessions, students }: Props) {
  const [sessions, setSessions] = useState(initialSessions)
  const [toggling, setToggling] = useState<string | null>(null) // `${sessionId}-${studentId}`
  const supabase = createClient()

  async function toggle(sessionId: string, studentId: string, current: boolean) {
    const key = `${sessionId}-${studentId}`
    setToggling(key)
    await supabase
      .from('attendances')
      .upsert({ session_id: sessionId, student_id: studentId, present: !current }, { onConflict: 'session_id,student_id' })
    setSessions(prev => prev.map(s => s.id !== sessionId ? s : {
      ...s,
      attendances: s.attendances.some(a => a.student_id === studentId)
        ? s.attendances.map(a => a.student_id === studentId ? { ...a, present: !current } : a)
        : [...s.attendances, { student_id: studentId, present: !current }],
    }))
    setToggling(null)
  }

  function presenceRate(studentId: string) {
    if (sessions.length === 0) return null
    const present = sessions.filter(s => s.attendances.some(a => a.student_id === studentId && a.present)).length
    return { present, total: sessions.length, pct: Math.round((present / sessions.length) * 100) }
  }

  // Costruisce attendanceMap per CSV export
  const attendanceMap: Record<string, Record<string, boolean>> = {}
  for (const student of students) {
    attendanceMap[student.id] = {}
    for (const s of sessions) {
      const att = s.attendances.find(a => a.student_id === student.id)
      attendanceMap[student.id][s.id] = att?.present ?? false
    }
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <Calendar size={32} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Nessuna sessione registrata per questo corso.</p>
        <p className="text-gray-400 text-xs mt-1">Le sessioni vengono create dai docenti nel registro presenze.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* CSV export */}
      <div className="flex justify-end">
        <EsportaCSV
          courseName={courseName}
          sessions={sessions.map(s => ({ id: s.id, title: s.title, session_date: s.session_date }))}
          students={students}
          attendanceMap={attendanceMap}
        />
      </div>

      {/* Matrice presenze interattiva */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Users size={15} className="text-gray-500" />
          <h3 className="font-semibold text-gray-900 text-sm">Riepilogo presenze</h3>
          <span className="ml-auto text-xs text-gray-400">Clicca su una cella per modificare</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide sticky left-0 bg-gray-50 z-10">
                  Corsista
                </th>
                {sessions.map(s => (
                  <th key={s.id} className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center whitespace-nowrap">
                    <div>{new Date(s.session_date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}</div>
                    <div className="text-gray-400 font-normal normal-case truncate max-w-[80px] mx-auto" title={s.title}>
                      {s.title.length > 10 ? s.title.slice(0, 10) + '…' : s.title}
                    </div>
                  </th>
                ))}
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Totale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.map(student => {
                const rate = presenceRate(student.id)
                return (
                  <tr key={student.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-5 py-3 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: '#1565C0' }}>
                          {student.full_name.charAt(0)}
                        </div>
                        <Link href={`/super-admin/utenti/${student.id}`} className="font-medium text-gray-900 whitespace-nowrap hover:text-blue-700 transition">{student.full_name}</Link>
                      </div>
                    </td>
                    {sessions.map(s => {
                      const att = s.attendances.find(a => a.student_id === student.id)
                      const isPresent = att?.present ?? false
                      const key = `${s.id}-${student.id}`
                      const isToggling = toggling === key
                      return (
                        <td key={s.id} className="px-3 py-3 text-center">
                          <button
                            onClick={() => toggle(s.id, student.id, isPresent)}
                            disabled={isToggling}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center mx-auto transition ${
                              isPresent
                                ? 'bg-green-100 hover:bg-red-100 text-green-600 hover:text-red-500'
                                : 'bg-red-50 hover:bg-green-100 text-red-400 hover:text-green-600'
                            } disabled:opacity-40`}
                            title={isPresent ? 'Presente — clicca per segnare assente' : 'Assente — clicca per segnare presente'}
                          >
                            {isToggling
                              ? <Loader2 size={12} className="animate-spin text-gray-400" />
                              : isPresent
                                ? <Check size={13} />
                                : <X size={13} />
                            }
                          </button>
                        </td>
                      )
                    })}
                    <td className="px-5 py-3 text-center">
                      {rate ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-xs font-bold ${rate.pct >= 75 ? 'text-green-700' : rate.pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                            {rate.pct}%
                          </span>
                          <span className="text-xs text-gray-400">{rate.present}/{rate.total}</span>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Riepilogo idoneità */}
      {students.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <Award size={15} className="text-indigo-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Riepilogo Idoneità</h3>
            <span className="ml-auto text-xs text-gray-400">
              {(() => {
                const idonei = students.filter(s => {
                  const r = presenceRate(s.id)
                  return r && r.pct >= 75
                }).length
                return `${idonei}/${students.length} idonei`
              })()}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {[...students]
              .map(s => ({ ...s, rate: presenceRate(s.id) }))
              .sort((a, b) => (b.rate?.pct ?? -1) - (a.rate?.pct ?? -1))
              .map(s => {
                const rate = s.rate
                const idoneo = rate && rate.pct >= 75
                return (
                  <div key={s.id} className="px-5 py-3 flex items-center gap-4">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: '#1565C0' }}>
                      {s.full_name.charAt(0)}
                    </div>
                    <Link href={`/super-admin/utenti/${s.id}`} className="flex-1 text-sm font-medium text-gray-900 truncate hover:text-blue-700 transition">{s.full_name}</Link>
                    {rate ? (
                      <>
                        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                          <div
                            className={`h-full rounded-full ${rate.pct >= 75 ? 'bg-green-500' : rate.pct >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                            style={{ width: `${rate.pct}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold w-9 text-right flex-shrink-0 ${rate.pct >= 75 ? 'text-green-700' : rate.pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {rate.pct}%
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${idoneo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {idoneo ? 'Idoneo' : 'Non idoneo'}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 flex-shrink-0">Nessuna presenza</span>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Dettaglio sessioni */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Calendar size={15} className="text-gray-500" />
          <h3 className="font-semibold text-gray-900 text-sm">Sessioni</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {sessions.map(s => {
            const present = s.attendances.filter(a => a.present).length
            return (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(s.session_date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{present}/{students.length}</p>
                    <p className="text-xs text-gray-400">presenti</p>
                  </div>
                  <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: students.length > 0 ? `${(present / students.length) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
