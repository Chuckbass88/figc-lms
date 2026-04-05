'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import EliminaValutazioneBtn from './EliminaValutazioneBtn'
import NuovaValutazioneApertaForm from './NuovaValutazioneApertaForm'

type Student = { id: string; full_name: string }

type PracticalEval = {
  id: string
  student_id: string
  evaluation_date: string
  session_label: string | null
  final_score: number | null
  global_note: string | null
  template_name: string
  student_name: string
  scores: { criterion_name: string; section_name: string; score: number; note: string | null }[]
}

type OpenEval = {
  id: string
  student_id: string
  student_name: string
  voto: number
  tipo: string
  commento: string | null
  created_at: string
}

interface Props {
  courseId: string
  students: Student[]
  initialPractical: PracticalEval[]
  initialOpen: OpenEval[]
}

function scoreColor(n: number) {
  if (n <= 4) return 'text-red-600 bg-red-50'
  if (n <= 6) return 'text-amber-700 bg-amber-50'
  if (n <= 8) return 'text-blue-700 bg-blue-50'
  return 'text-green-700 bg-green-50'
}

export default function ValutazioniClient({ courseId, students, initialPractical, initialOpen }: Props) {
  const [practical, setPractical] = useState(initialPractical)
  const [open, setOpen] = useState(initialOpen)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function deletePractical(id: string) { setPractical(p => p.filter(e => e.id !== id)) }
  function deleteOpen(id: string) { setOpen(p => p.filter(e => e.id !== id)) }

  const total = practical.length + open.length

  return (
    <div className="space-y-4">

      {/* Form voto aperto */}
      <NuovaValutazioneApertaForm
        courseId={courseId}
        students={students}
        onSaved={() => window.location.reload()}
      />

      {total === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Nessuna valutazione registrata.</p>
          <p className="text-xs mt-1">Crea una valutazione pratica o un voto aperto.</p>
        </div>
      )}

      {/* Valutazioni pratiche */}
      {practical.map(ev => {
        const expanded = expandedId === ev.id
        const sections = ev.scores.reduce((acc, s) => {
          if (!acc[s.section_name]) acc[s.section_name] = []
          acc[s.section_name].push(s)
          return acc
        }, {} as Record<string, typeof ev.scores>)

        return (
          <div key={ev.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900">{ev.student_name}</span>
                  <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{ev.template_name}</span>
                  {ev.session_label && (
                    <span className="text-xs text-gray-400 italic">{ev.session_label}</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(ev.evaluation_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              {ev.final_score != null && (
                <span className={`text-lg font-black px-3 py-1 rounded-xl flex-shrink-0 ${scoreColor(ev.final_score)}`}>
                  {Number(ev.final_score).toFixed(1)}
                </span>
              )}
              <EliminaValutazioneBtn id={ev.id} tipo="pratica" onDeleted={() => deletePractical(ev.id)} />
            </div>

            {/* Expand/collapse scores */}
            <button
              onClick={() => setExpandedId(expanded ? null : ev.id)}
              className="w-full flex items-center justify-center gap-1 py-2 text-xs text-gray-400 hover:text-gray-600 border-t border-gray-50 hover:bg-gray-50 transition"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expanded ? 'Nascondi dettaglio' : 'Vedi punteggi'}
            </button>

            {expanded && (
              <div className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-100">
                {Object.entries(sections).map(([sectionName, scores]) => (
                  <div key={sectionName}>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{sectionName}</p>
                    <div className="space-y-1.5">
                      {scores.map(s => (
                        <div key={s.criterion_name} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-700">{s.criterion_name}</span>
                          <div className="flex items-center gap-2">
                            {s.note && <span className="text-xs text-gray-400 italic truncate max-w-[100px]">{s.note}</span>}
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg flex-shrink-0 ${scoreColor(s.score)}`}>{s.score}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {ev.global_note && (
                  <div className="mt-2 pt-3 border-t border-gray-100">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Note qualitative</p>
                    <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{ev.global_note}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Valutazioni aperte */}
      {open.map(ev => (
        <div key={ev.id} className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">{ev.student_name}</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium capitalize">{ev.tipo}</span>
            </div>
            {ev.commento && <p className="text-xs text-gray-500 mt-1">{ev.commento}</p>}
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(ev.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <span className={`text-lg font-black px-3 py-1 rounded-xl flex-shrink-0 ${scoreColor(ev.voto)}`}>
            {Number(ev.voto).toFixed(1)}
          </span>
          <EliminaValutazioneBtn id={ev.id} tipo="aperta" onDeleted={() => deleteOpen(ev.id)} />
        </div>
      ))}
    </div>
  )
}
