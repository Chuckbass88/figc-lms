'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowUpDown, ArrowUp, ArrowDown, Download, BookOpen, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react'

interface CourseDetail {
  id: string; name: string; sessions: number; present: number; pct: number | null
}

interface StudentRow {
  id: string; full_name: string; email: string
  presenzePct: number | null; idoneoPresenze: boolean | null
  quizCompletati: number; quizSuperati: number; totalQuiz: number
  taskConsegnati: number; totalTask: number
  corsiIdonei: number; corsiTotali: number
  courseDetails: CourseDetail[]
}

type SortKey = 'full_name' | 'presenzePct' | 'corsiIdonei' | 'quizSuperati' | 'taskConsegnati'
type SortDir = 'asc' | 'desc'

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

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== col) return <ArrowUpDown size={12} className="text-gray-400 inline ml-1" />
  return sortDir === 'asc'
    ? <ArrowUp size={12} className="text-blue-600 inline ml-1" />
    : <ArrowDown size={12} className="text-blue-600 inline ml-1" />
}

export default function ReportDocenteClient({
  studentReports,
}: {
  studentReports: StudentRow[]
}) {
  const [sortKey, setSortKey] = useState<SortKey>('presenzePct')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'idonei' | 'non_idonei'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const filtered = useMemo(() => {
    let list = studentReports.filter(s => {
      const matchSearch = s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase())
      const matchFilter = filter === 'all' ||
        (filter === 'idonei' && s.idoneoPresenze === true) ||
        (filter === 'non_idonei' && s.idoneoPresenze === false)
      return matchSearch && matchFilter
    })
    return [...list].sort((a, b) => {
      const av = a[sortKey] ?? (sortDir === 'asc' ? Infinity : -Infinity)
      const bv = b[sortKey] ?? (sortDir === 'asc' ? Infinity : -Infinity)
      if (typeof av === 'string' && typeof bv === 'string')
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }, [studentReports, sortKey, sortDir, search, filter])

  function exportCSV() {
    const headers = ['Corsista', 'Email', 'Presenze %', 'Idoneo', 'Corsi idonei', 'Quiz superati', 'Quiz totali', 'Task consegnati', 'Task totali']
    const rows = filtered.map(s => [
      s.full_name, s.email,
      s.presenzePct !== null ? `${s.presenzePct}%` : '—',
      s.idoneoPresenze === null ? '—' : s.idoneoPresenze ? 'Sì' : 'No',
      `${s.corsiIdonei}/${s.corsiTotali}`,
      s.quizSuperati, s.totalQuiz,
      s.taskConsegnati, s.totalTask,
    ])
    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `report_idoneita_${new Date().toISOString().split('T')[0]}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
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
              onClick={() => setFilter(f.value as typeof filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === f.value ? 'text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
              style={filter === f.value ? { backgroundColor: '#1565C0' } : {}}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 bg-white transition"
        >
          <Download size={14} /> Esporta CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 w-8"></th>
                <th className="text-left px-3 py-3">
                  <button onClick={() => handleSort('full_name')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700">
                    Corsista <SortIcon col="full_name" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </th>
                <th className="text-center px-4 py-3">
                  <button onClick={() => handleSort('presenzePct')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 mx-auto">
                    Presenze <SortIcon col="presenzePct" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Idoneo</th>
                <th className="text-center px-4 py-3">
                  <button onClick={() => handleSort('corsiIdonei')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 mx-auto">
                    Corsi idonei <SortIcon col="corsiIdonei" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </th>
                <th className="text-center px-4 py-3">
                  <button onClick={() => handleSort('quizSuperati')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 mx-auto">
                    Quiz <SortIcon col="quizSuperati" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </th>
                <th className="text-center px-4 py-3">
                  <button onClick={() => handleSort('taskConsegnati')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 mx-auto">
                    Task <SortIcon col="taskConsegnati" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(s => {
                const isExpanded = expandedId === s.id
                return (
                  <React.Fragment key={s.id}>
                    <tr key={s.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-3">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : s.id)}
                          className="text-gray-400 hover:text-gray-600 transition"
                          title={isExpanded ? 'Chiudi' : 'Espandi corsi'}
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <Link href={`/docente/corsisti/${s.id}`} className="font-medium text-gray-900 hover:text-blue-700 transition block truncate max-w-[200px]">
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
                    {isExpanded && (
                      <tr key={`${s.id}-detail`} className="bg-blue-50/40">
                        <td></td>
                        <td colSpan={6} className="px-3 py-3">
                          <div className="space-y-1.5">
                            {s.courseDetails.map(c => (
                              <div key={c.id} className="flex items-center gap-3 text-xs">
                                <BookOpen size={11} className="text-blue-400 flex-shrink-0" />
                                <Link href={`/docente/corsi/${c.id}/presenze`} className="text-blue-700 hover:underline font-medium truncate flex-1">
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
                  </React.Fragment>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">
                  {studentReports.length === 0 ? 'Nessun corsista iscritto.' : 'Nessun risultato per i filtri applicati.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-gray-400 text-right">{filtered.length} di {studentReports.length} corsisti</p>
    </div>
  )
}
