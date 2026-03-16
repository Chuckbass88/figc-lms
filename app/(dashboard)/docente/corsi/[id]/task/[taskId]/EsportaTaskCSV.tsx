'use client'

import { Download } from 'lucide-react'

interface StudentRow {
  full_name: string
  email: string
  submitted: boolean
  submitted_at: string | null
  file_name: string | null
  file_url: string | null
  notes: string | null
  grade: string | null
  feedback: string | null
}

interface Props {
  taskTitle: string
  rows: StudentRow[]
}

export default function EsportaTaskCSV({ taskTitle, rows }: Props) {
  function esporta() {
    const headers = ['Corsista', 'Email', 'Consegnato', 'Data consegna', 'File', 'Note', 'Voto', 'Feedback']
    const csvRows = rows.map(r => [
      r.full_name,
      r.email,
      r.submitted ? 'Sì' : 'No',
      r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('it-IT') : '',
      r.file_name ?? '',
      r.notes ?? '',
      r.grade ?? '',
      r.feedback ?? '',
    ])

    const csv = [headers, ...csvRows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `task_${taskTitle.replace(/[^a-zA-Z0-9]/g, '_')}_risultati.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={esporta}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
    >
      <Download size={12} /> Esporta CSV
    </button>
  )
}
