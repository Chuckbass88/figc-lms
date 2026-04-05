'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, FileText, Download, MessageSquare, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import ValutaBtn from './ValutaBtn'

interface Student { id: string; full_name: string; email: string }
interface Submission {
  id: string; student_id: string; file_url: string | null; file_name: string | null
  file_size: number | null; notes: string | null; submitted_at: string
  grade: string | null; feedback: string | null
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ConsegneList({
  students,
  submissionMap,
  taskTitle,
}: {
  students: Student[]
  submissionMap: Record<string, Submission>
  taskTitle: string
}) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="divide-y divide-gray-50">
      {students.map(student => {
        const sub = submissionMap[student.id]
        const isOpen = expanded === student.id

        const statusBadge = !sub ? (
          <span className="flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            <AlertCircle size={11} /> Non consegnato
          </span>
        ) : sub.grade ? (
          <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
            <CheckCircle size={11} /> Valutato · {sub.grade}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
            <Clock size={11} /> Consegnato
          </span>
        )

        return (
          <div key={student.id}>
            {/* Riga compatta */}
            <div
              className={`px-5 py-3 flex items-center gap-3 ${sub ? 'cursor-pointer hover:bg-gray-50 transition' : ''}`}
              onClick={() => sub && setExpanded(isOpen ? null : student.id)}
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {student.full_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{student.full_name}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {statusBadge}
                {sub && (
                  <span className="text-gray-300">
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                )}
              </div>
            </div>

            {/* Dettaglio espandibile */}
            {sub && isOpen && (
              <div className="px-5 pb-4 ml-11 space-y-2 border-t border-gray-50 pt-3">
                <p className="text-xs text-gray-400">
                  Consegnato il {new Date(sub.submitted_at).toLocaleDateString('it-IT', {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
                {sub.notes && (
                  <div className="flex items-start gap-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                    <MessageSquare size={12} className="text-gray-400 flex-shrink-0 mt-0.5" />
                    <span>{sub.notes}</span>
                  </div>
                )}
                {sub.file_url && (
                  <a
                    href={sub.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2 hover:bg-blue-100 transition w-fit"
                  >
                    <FileText size={12} />
                    <span className="truncate max-w-[220px]">{sub.file_name ?? 'File allegato'}</span>
                    {sub.file_size && <span className="text-blue-400 flex-shrink-0">· {formatSize(sub.file_size)}</span>}
                    <Download size={11} className="flex-shrink-0" />
                  </a>
                )}
                {sub.grade && (
                  <div className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
                    <span className="font-semibold">Voto:</span> {sub.grade}
                    {sub.feedback && <span className="ml-2 text-gray-500">· {sub.feedback}</span>}
                  </div>
                )}
                <div className="pt-1">
                  <ValutaBtn
                    submissionId={sub.id}
                    studentId={student.id}
                    taskTitle={taskTitle}
                    initialGrade={sub.grade}
                    initialFeedback={sub.feedback}
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}
      {students.length === 0 && (
        <p className="px-5 py-8 text-sm text-gray-400 text-center">Nessun corsista iscritto al corso.</p>
      )}
    </div>
  )
}
