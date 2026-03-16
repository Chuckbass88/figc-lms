'use client'

import { Download } from 'lucide-react'

interface Student { id: string; full_name: string; email: string }
interface Attempt { student_id: string; score: number; total: number; passed: boolean; submitted_at: string }

export default function EsportaQuizCSV({
  quizTitle,
  students,
  attempts,
  passingScore,
}: {
  quizTitle: string
  students: Student[]
  attempts: Attempt[]
  passingScore: number
}) {
  function exportCSV() {
    const attemptMap = new Map(attempts.map(a => [a.student_id, a]))
    const rows: string[][] = [
      ['Corsista', 'Email', 'Punteggio', 'Totale', '%', 'Superato', 'Data'],
      ...students.map(s => {
        const a = attemptMap.get(s.id)
        if (!a) return [s.full_name, s.email, '', '', '', 'Non completato', '']
        const pct = Math.round((a.score / a.total) * 100)
        return [
          s.full_name,
          s.email,
          String(a.score),
          String(a.total),
          `${pct}%`,
          a.passed ? 'Sì' : 'No',
          new Date(a.submitted_at).toLocaleDateString('it-IT'),
        ]
      }),
    ]
    const csv = '\uFEFF' + rows.map(r => r.map(v => `"${v}"`).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `quiz-${quizTitle.replace(/\s+/g, '_')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={exportCSV}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
    >
      <Download size={14} /> Esporta CSV
    </button>
  )
}
