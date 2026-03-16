'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowUpDown, ArrowUp, ArrowDown, Download, BookOpen, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react'

interface CourseReport {
  id: string
  name: string
  status: string
  category: string | null
  totalSessions: number
  totalStudents: number
  avgAttendance: number | null
  presentTotal: number
  possibleTotal: number
}

interface StudentReport {
  id: string
  full_name: string
  email: string
  coursesCount: number
  totalSessions: number
  presentTotal: number
  avgAttendance: number | null
  courses: { id: string; name: string; sessions: number; present: number; pct: number | null }[]
}

interface IdoneitaRow {
  id: string
  full_name: string
  email: string
  presenzePct: number | null
  idoneoPresenze: boolean | null
  quizCompletati: number
  quizSuperati: number
  totalQuiz: number
  taskConsegnati: number
  totalTask: number
  corsiIdonei: number
  corsiTotali: number
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  draft: 'bg-amber-100 text-amber-700',
}
const STATUS_LABELS: Record<string, string> = {
  active: 'Attivo', completed: 'Completato', draft: 'Bozza',
}

type CourseSortKey = 'name' | 'status' | 'totalSessions' | 'totalStudents' | 'avgAttendance'
type StudentSortKey = 'full_name' | 'coursesCount' | 'totalSessions' | 'avgAttendance'
type IdoneitaSortKey = 'full_name' | 'presenzePct' | 'corsiIdonei' | 'quizSuperati' | 'taskConsegnati'
type SortDir = 'asc' | 'desc'

export default function ReportClient({ reports, studentReports, idoneitaReports }: {
  reports: CourseReport[]
  studentReports: StudentReport[]
  idoneitaReports: IdoneitaRow[]
}) {
  const [tab, setTab] = useState<'corsi' | 'corsisti' | 'idoneita'>('corsi')

  // — Corsi state —
  const [courseSortKey, setCourseSortKey] = useState<CourseSortKey>('avgAttendance')
  const [courseSortDir, setCourseSortDir] = useState<SortDir>('desc')
  const [statusFilter, setStatusFilter] = useState('all')
  const [courseSearch, setCourseSearch] = useState('')

  // — Corsisti state —
  const [studentSortKey, setStudentSortKey] = useState<StudentSortKey>('avgAttendance')
  const [studentSortDir, setStudentSortDir] = useState<SortDir>('desc')
  const [studentSearch, setStudentSearch] = useState('')
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)

  // — Idoneità state —
  const [idoneitaSortKey, setIdoneitaSortKey] = useState<IdoneitaSortKey>('presenzePct')
  const [idoneitaSortDir, setIdoneitaSortDir] = useState<SortDir>('desc')
  const [idoneitaSearch, setIdoneitaSearch] = useState('')
  const [idoneitaFilter, setIdoneitaFilter] = useState<'all' | 'idonei' | 'non_idonei'>('all')

  function handleCourseSort(key: CourseSortKey) {
    if (courseSortKey === key) setCourseSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setCourseSortKey(key); setCourseSortDir('desc') }
  }
  function handleStudentSort(key: StudentSortKey) {
    if (studentSortKey === key) setStudentSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setStudentSortKey(key); setStudentSortDir('desc') }
  }
  function handleIdoneitaSort(key: IdoneitaSortKey) {
    if (idoneitaSortKey === key) setIdoneitaSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setIdoneitaSortKey(key); setIdoneitaSortDir('desc') }
  }

  const filteredCourses = useMemo(() => {
    let list = reports.filter(r => {
      const matchStatus = statusFilter === 'all' || r.status === statusFilter
      const matchSearch = r.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
        (r.category ?? '').toLowerCase().includes(courseSearch.toLowerCase())
      return matchStatus && matchSearch
    })
    return [...list].sort((a, b) => {
      let av: number | string = a[courseSortKey] ?? (courseSortDir === 'asc' ? Infinity : -Infinity)
      let bv: number | string = b[courseSortKey] ?? (courseSortDir === 'asc' ? Infinity : -Infinity)
      if (typeof av === 'string' && typeof bv === 'string')
        return courseSortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return courseSortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }, [reports, courseSortKey, courseSortDir, statusFilter, courseSearch])

  const filteredStudents = useMemo(() => {
    let list = studentReports.filter(s =>
      s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(studentSearch.toLowerCase())
    )
    return [...list].sort((a, b) => {
      let av: number | string = a[studentSortKey] ?? (studentSortDir === 'asc' ? Infinity : -Infinity)
      let bv: number | string = b[studentSortKey] ?? (studentSortDir === 'asc' ? Infinity : -Infinity)
      if (typeof av === 'string' && typeof bv === 'string')
        return studentSortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return studentSortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }, [studentReports, studentSortKey, studentSortDir, studentSearch])

  const filteredIdoneita = useMemo(() => {
    let list = idoneitaReports.filter(s => {
      const matchSearch = s.full_name.toLowerCase().includes(idoneitaSearch.toLowerCase()) ||
        s.email.toLowerCase().includes(idoneitaSearch.toLowerCase())
      const matchFilter = idoneitaFilter === 'all' ||
        (idoneitaFilter === 'idonei' && s.idoneoPresenze === true) ||
        (idoneitaFilter === 'non_idonei' && s.idoneoPresenze === false)
      return matchSearch && matchFilter
    })
    return [...list].sort((a, b) => {
      const av = a[idoneitaSortKey] ?? (idoneitaSortDir === 'asc' ? Infinity : -Infinity)
      const bv = b[idoneitaSortKey] ?? (idoneitaSortDir === 'asc' ? Infinity : -Infinity)
      if (typeof av === 'string' && typeof bv === 'string')
        return idoneitaSortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return idoneitaSortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }, [idoneitaReports, idoneitaSortKey, idoneitaSortDir, idoneitaSearch, idoneitaFilter])

  function exportCourseCSV() {
    const headers = ['Corso', 'Categoria', 'Stato', 'Sessioni', 'Corsisti', 'Presenti', 'Possibili', 'Media %']
    const rows = filteredCourses.map(r => [
      r.name, r.category ?? '', STATUS_LABELS[r.status] ?? r.status,
      r.totalSessions, r.totalStudents, r.presentTotal, r.possibleTotal,
      r.avgAttendance !== null ? `${r.avgAttendance}%` : '—',
    ])
    downloadCSV([headers, ...rows], `report_corsi_${new Date().toISOString().split('T')[0]}.csv`)
  }

  function exportStudentCSV() {
    const headers = ['Corsista', 'Email', 'Corsi', 'Sessioni', 'Presenti', 'Media %']
    const rows = filteredStudents.map(s => [
      s.full_name, s.email, s.coursesCount, s.totalSessions, s.presentTotal,
      s.avgAttendance !== null ? `${s.avgAttendance}%` : '—',
    ])
    downloadCSV([headers, ...rows], `report_corsisti_${new Date().toISOString().split('T')[0]}.csv`)
  }

  function exportIdoneitaCSV() {
    const headers = ['Corsista', 'Email', 'Presenze %', 'Idoneo', 'Corsi idonei', 'Quiz superati', 'Quiz totali', 'Task consegnati', 'Task totali']
    const rows = filteredIdoneita.map(s => [
      s.full_name, s.email,
      s.presenzePct !== null ? `${s.presenzePct}%` : '—',
      s.idoneoPresenze === null ? '—' : s.idoneoPresenze ? 'Sì' : 'No',
      `${s.corsiIdonei}/${s.corsiTotali}`,
      s.quizSuperati, s.totalQuiz,
      s.taskConsegnati, s.totalTask,
    ])
    downloadCSV([headers, ...rows], `report_idoneita_${new Date().toISOString().split('T')[0]}.csv`)
  }

  function downloadCSV(rows: (string | number)[][], filename: string) {
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  function CourseSortIcon({ col }: { col: CourseSortKey }) {
    if (courseSortKey !== col) return <ArrowUpDown size={12} className="text-gray-400 inline ml-1" />
    return courseSortDir === 'asc'
      ? <ArrowUp size={12} className="text-blue-600 inline ml-1" />
      : <ArrowDown size={12} className="text-blue-600 inline ml-1" />
  }
  function StudentSortIcon({ col }: { col: StudentSortKey }) {
    if (studentSortKey !== col) return <ArrowUpDown size={12} className="text-gray-400 inline ml-1" />
    return studentSortDir === 'asc'
      ? <ArrowUp size={12} className="text-blue-600 inline ml-1" />
      : <ArrowDown size={12} className="text-blue-600 inline ml-1" />
  }
  function IdoneitaSortIcon({ col }: { col: IdoneitaSortKey }) {
    if (idoneitaSortKey !== col) return <ArrowUpDown size={12} className="text-gray-400 inline ml-1" />
    return idoneitaSortDir === 'asc'
      ? <ArrowUp size={12} className="text-blue-600 inline ml-1" />
      : <ArrowDown size={12} className="text-blue-600 inline ml-1" />
  }

  function AttendanceBar({ pct }: { pct: number }) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-xs font-bold w-9 text-right ${pct >= 75 ? 'text-green-700' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
          {pct}%
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tab selector */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('corsi')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition ${tab === 'corsi' ? 'text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
          style={tab === 'corsi' ? { backgroundColor: '#003DA5' } : {}}
        >
          Per Corso
        </button>
        <button
          onClick={() => setTab('corsisti')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition ${tab === 'corsisti' ? 'text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
          style={tab === 'corsisti' ? { backgroundColor: '#003DA5' } : {}}
        >
          Per Corsista
        </button>
        <button
          onClick={() => setTab('idoneita')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition ${tab === 'idoneita' ? 'text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
          style={tab === 'idoneita' ? { backgroundColor: '#003DA5' } : {}}
        >
          Idoneità
        </button>
      </div>

      {/* ──── TAB CORSI ──── */}
      {tab === 'corsi' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={courseSearch}
              onChange={e => setCourseSearch(e.target.value)}
              placeholder="Cerca per nome o categoria..."
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <div className="flex gap-1.5 bg-white border border-gray-200 rounded-xl p-1">
              {[
                { value: 'all', label: 'Tutti' },
                { value: 'active', label: 'Attivi' },
                { value: 'completed', label: 'Completati' },
                { value: 'draft', label: 'Bozze' },
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${statusFilter === f.value ? 'text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                  style={statusFilter === f.value ? { backgroundColor: '#003DA5' } : {}}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              onClick={exportCourseCSV}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 bg-white transition"
            >
              <Download size={14} /> Esporta CSV
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3">
                      <button onClick={() => handleCourseSort('name')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700">
                        Corso <CourseSortIcon col="name" />
                      </button>
                    </th>
                    <th className="text-center px-4 py-3">
                      <button onClick={() => handleCourseSort('status')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 mx-auto">
                        Stato <CourseSortIcon col="status" />
                      </button>
                    </th>
                    <th className="text-center px-4 py-3">
                      <button onClick={() => handleCourseSort('totalSessions')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 mx-auto">
                        Sessioni <CourseSortIcon col="totalSessions" />
                      </button>
                    </th>
                    <th className="text-center px-4 py-3">
                      <button onClick={() => handleCourseSort('totalStudents')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 mx-auto">
                        Corsisti <CourseSortIcon col="totalStudents" />
                      </button>
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Presenze</th>
                    <th className="px-5 py-3">
                      <button onClick={() => handleCourseSort('avgAttendance')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700">
                        Media % <CourseSortIcon col="avgAttendance" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredCourses.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-3">
                        <Link href={`/super-admin/corsi/${r.id}/presenze`} className="font-medium text-gray-900 hover:text-blue-700 transition block">
                          {r.name}
                        </Link>
                        {r.category && <span className="text-xs text-indigo-600 font-medium">{r.category}</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{r.totalSessions}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{r.totalStudents}</td>
                      <td className="px-4 py-3 text-center text-gray-500 text-xs">
                        {r.possibleTotal > 0 ? `${r.presentTotal}/${r.possibleTotal}` : '—'}
                      </td>
                      <td className="px-5 py-3 min-w-[140px]">
                        {r.avgAttendance !== null ? <AttendanceBar pct={r.avgAttendance} /> : <span className="text-xs text-gray-400">—</span>}
                      </td>
                    </tr>
                  ))}
                  {filteredCourses.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-sm">
                      {reports.length === 0 ? 'Nessun corso nel sistema.' : 'Nessun risultato per i filtri applicati.'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-gray-400 text-right">{filteredCourses.length} di {reports.length} corsi</p>
        </div>
      )}

      {/* ──── TAB CORSISTI ──── */}
      {tab === 'corsisti' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              placeholder="Cerca per nome o email..."
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <button
              onClick={exportStudentCSV}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 bg-white transition"
            >
              <Download size={14} /> Esporta CSV
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 w-8"></th>
                    <th className="text-left px-3 py-3">
                      <button onClick={() => handleStudentSort('full_name')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700">
                        Corsista <StudentSortIcon col="full_name" />
                      </button>
                    </th>
                    <th className="text-center px-4 py-3">
                      <button onClick={() => handleStudentSort('coursesCount')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 mx-auto">
                        Corsi <StudentSortIcon col="coursesCount" />
                      </button>
                    </th>
                    <th className="text-center px-4 py-3">
                      <button onClick={() => handleStudentSort('totalSessions')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 mx-auto">
                        Sessioni <StudentSortIcon col="totalSessions" />
                      </button>
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Presenti</th>
                    <th className="px-5 py-3">
                      <button onClick={() => handleStudentSort('avgAttendance')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700">
                        Media % <StudentSortIcon col="avgAttendance" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredStudents.map(s => {
                    const isExpanded = expandedStudent === s.id
                    return (
                      <>
                        <tr key={s.id} className="hover:bg-gray-50 transition">
                          <td className="px-5 py-3">
                            <button
                              onClick={() => setExpandedStudent(isExpanded ? null : s.id)}
                              className="text-gray-400 hover:text-gray-600 transition"
                              title={isExpanded ? 'Chiudi' : 'Espandi corsi'}
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </td>
                          <td className="px-3 py-3">
                            <Link href={`/super-admin/utenti/${s.id}`} className="font-medium text-gray-900 hover:text-blue-700 transition block">
                              {s.full_name}
                            </Link>
                            <p className="text-xs text-gray-400 truncate">{s.email}</p>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600">{s.coursesCount}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{s.totalSessions}</td>
                          <td className="px-4 py-3 text-center text-gray-500 text-xs">
                            {s.totalSessions > 0 ? `${s.presentTotal}/${s.totalSessions}` : '—'}
                          </td>
                          <td className="px-5 py-3 min-w-[140px]">
                            {s.avgAttendance !== null ? <AttendanceBar pct={s.avgAttendance} /> : <span className="text-xs text-gray-400">—</span>}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${s.id}-detail`} className="bg-blue-50/40">
                            <td></td>
                            <td colSpan={5} className="px-3 py-3">
                              <div className="space-y-1.5">
                                {s.courses.map(c => (
                                  <div key={c.id} className="flex items-center gap-3 text-xs">
                                    <BookOpen size={11} className="text-blue-400 flex-shrink-0" />
                                    <Link href={`/super-admin/corsi/${c.id}/presenze`} className="text-blue-700 hover:underline font-medium truncate flex-1">
                                      {c.name}
                                    </Link>
                                    <span className="text-gray-400 flex-shrink-0">{c.sessions} sess.</span>
                                    {c.pct !== null ? (
                                      <span className={`font-bold flex-shrink-0 ${c.pct >= 75 ? 'text-green-700' : c.pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                        {c.present}/{c.sessions} ({c.pct}%)
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 flex-shrink-0">—</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                  {filteredStudents.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-sm">
                      {studentReports.length === 0 ? 'Nessun corsista iscritto.' : 'Nessun risultato per la ricerca.'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-gray-400 text-right">{filteredStudents.length} di {studentReports.length} corsisti</p>
        </div>
      )}

      {/* ──── TAB IDONEITÀ ──── */}
      {tab === 'idoneita' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={idoneitaSearch}
              onChange={e => setIdoneitaSearch(e.target.value)}
              placeholder="Cerca per nome o email..."
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <div className="flex gap-1.5 bg-white border border-gray-200 rounded-xl p-1">
              {[
                { value: 'all', label: 'Tutti' },
                { value: 'idonei', label: 'Idonei' },
                { value: 'non_idonei', label: 'Non idonei' },
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => setIdoneitaFilter(f.value as typeof idoneitaFilter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${idoneitaFilter === f.value ? 'text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                  style={idoneitaFilter === f.value ? { backgroundColor: '#003DA5' } : {}}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              onClick={exportIdoneitaCSV}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 bg-white transition"
            >
              <Download size={14} /> Esporta CSV
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3">
                      <button onClick={() => handleIdoneitaSort('full_name')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700">
                        Corsista <IdoneitaSortIcon col="full_name" />
                      </button>
                    </th>
                    <th className="text-center px-4 py-3">
                      <button onClick={() => handleIdoneitaSort('presenzePct')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 mx-auto">
                        Presenze <IdoneitaSortIcon col="presenzePct" />
                      </button>
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Idoneo</th>
                    <th className="text-center px-4 py-3">
                      <button onClick={() => handleIdoneitaSort('corsiIdonei')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 mx-auto">
                        Corsi idonei <IdoneitaSortIcon col="corsiIdonei" />
                      </button>
                    </th>
                    <th className="text-center px-4 py-3">
                      <button onClick={() => handleIdoneitaSort('quizSuperati')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 mx-auto">
                        Quiz <IdoneitaSortIcon col="quizSuperati" />
                      </button>
                    </th>
                    <th className="text-center px-4 py-3">
                      <button onClick={() => handleIdoneitaSort('taskConsegnati')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 mx-auto">
                        Task <IdoneitaSortIcon col="taskConsegnati" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredIdoneita.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-3">
                        <Link href={`/super-admin/utenti/${s.id}`} className="font-medium text-gray-900 hover:text-blue-700 transition block truncate max-w-[200px]">
                          {s.full_name}
                        </Link>
                        <p className="text-xs text-gray-400 truncate">{s.email}</p>
                      </td>
                      <td className="px-4 py-3 min-w-[130px]">
                        {s.presenzePct !== null
                          ? <AttendanceBar pct={s.presenzePct} />
                          : <span className="text-xs text-gray-400 block text-center">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-center">
                        {s.idoneoPresenze === null
                          ? <span className="text-xs text-gray-400">—</span>
                          : s.idoneoPresenze
                          ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><CheckCircle size={10} /> Sì</span>
                          : <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full"><XCircle size={10} /> No</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-600">
                        <span className={s.corsiIdonei === s.corsiTotali && s.corsiTotali > 0 ? 'text-green-700 font-semibold' : ''}>
                          {s.corsiIdonei}/{s.corsiTotali}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-600">
                        {s.totalQuiz > 0
                          ? <><span className="text-green-700 font-semibold">{s.quizSuperati}</span>/{s.totalQuiz}</>
                          : <span className="text-gray-400">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-600">
                        {s.totalTask > 0
                          ? <><span className={s.taskConsegnati === s.totalTask ? 'text-green-700 font-semibold' : ''}>{s.taskConsegnati}</span>/{s.totalTask}</>
                          : <span className="text-gray-400">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                  {filteredIdoneita.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-sm">
                      {idoneitaReports.length === 0 ? 'Nessun corsista iscritto.' : 'Nessun risultato per i filtri applicati.'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-gray-400 text-right">{filteredIdoneita.length} di {idoneitaReports.length} corsisti</p>
        </div>
      )}
    </div>
  )
}
