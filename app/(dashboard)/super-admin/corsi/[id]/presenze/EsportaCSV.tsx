'use client'

import { Download } from 'lucide-react'

interface Session {
  id: string
  title: string
  session_date: string
}

interface Student {
  id: string
  full_name: string
}

interface AttendanceMap {
  [studentId: string]: {
    [sessionId: string]: boolean
  }
}

interface Props {
  courseName: string
  sessions: Session[]
  students: Student[]
  attendanceMap: AttendanceMap
}

export default function EsportaCSV({ courseName, sessions, students, attendanceMap }: Props) {
  function exportCSV() {
    const sessionsSorted = [...sessions].sort(
      (a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
    )

    const headers = [
      'Corsista',
      ...sessionsSorted.map(s =>
        new Date(s.session_date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
        ' - ' + s.title
      ),
      'Presenze',
      'Totale sessioni',
      '% Presenza',
    ]

    const rows = students.map(student => {
      const attendances = attendanceMap[student.id] ?? {}
      const present = sessionsSorted.filter(s => attendances[s.id]).length
      const total = sessionsSorted.length
      const pct = total > 0 ? Math.round((present / total) * 100) : 0
      return [
        student.full_name,
        ...sessionsSorted.map(s => (attendances[s.id] ? 'P' : 'A')),
        present,
        total,
        `${pct}%`,
      ]
    })

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `presenze_${courseName.replace(/\s+/g, '_')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={exportCSV}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition"
    >
      <Download size={14} /> Esporta CSV
    </button>
  )
}
