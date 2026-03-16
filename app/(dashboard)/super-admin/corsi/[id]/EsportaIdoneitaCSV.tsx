'use client'

export type StudentIdoneitaRow = {
  full_name: string
  email: string
  presenzePct: number | null
  idoneoPresenze: boolean | null
  quizCompletati: number
  quizSuperati: number
  totalQuizzes: number
}

export default function EsportaIdoneitaCSV({
  courseName,
  students,
}: {
  courseName: string
  students: StudentIdoneitaRow[]
}) {
  function handleExport() {
    const header = ['Corsista', 'Email', 'Presenze %', 'Idoneo (presenze)', 'Quiz completati', 'Quiz superati']
    const rows = students.map(s => [
      s.full_name,
      s.email,
      s.presenzePct !== null ? `${s.presenzePct}%` : 'N/D',
      s.idoneoPresenze === null ? 'N/D' : s.idoneoPresenze ? 'Sì' : 'No',
      `${s.quizCompletati}/${s.totalQuizzes}`,
      String(s.quizSuperati),
    ])

    const csvContent = [header, ...rows]
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `idoneita_${courseName.replace(/\s+/g, '_')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition"
      title="Esporta idoneità corsisti in CSV"
    >
      ↓ CSV Idoneità
    </button>
  )
}
