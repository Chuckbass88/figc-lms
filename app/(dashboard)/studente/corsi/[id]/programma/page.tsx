import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Coffee, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { ProgramWithDetails, ModuleType } from '@/lib/types'

const MODULE_TYPE_LABELS: Record<ModuleType, string> = {
  week: 'Settimana', module: 'Modulo', block: 'Blocco',
}

function formatTime(t: string | null) {
  if (!t) return ''
  return t.slice(0, 5)
}

function formatDate(d: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function ProgrammaStudente({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const [{ data: course }, { data: programBase }] = await Promise.all([
    supabase.from('courses').select('id, name').eq('id', courseId).single(),
    supabase.from('course_programs')
      .select('id')
      .eq('course_id', courseId)
      .eq('visibility', 'students')
      .eq('is_fork', false)
      .order('created_at')
      .limit(1)
      .maybeSingle(),
  ])

  if (!course) notFound()

  let program: ProgramWithDetails | null = null
  if (programBase) {
    const { data } = await supabase
      .from('course_programs')
      .select(`*, creator:profiles!created_by(id, full_name), modules:program_modules(*, days:program_days(*, blocks:program_blocks(*, instructor:profiles!instructor_id(id, full_name))))`)
      .eq('id', programBase.id)
      .single()
    if (data) {
      data.modules?.sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index)
      data.modules?.forEach((m: { days?: { order_index: number; blocks?: { order_index: number }[] }[] }) => {
        m.days?.sort((a, b) => a.order_index - b.order_index)
        m.days?.forEach(d => d.blocks?.sort((a, b) => a.order_index - b.order_index))
      })
      program = data as ProgramWithDetails
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href={`/studente/corsi/${courseId}`} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit">
          <ArrowLeft size={15} /> {course.name}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Programma del Corso</h2>
            <p className="text-gray-500 text-sm mt-1">{course.name}</p>
          </div>
          {program && (
            <a href={`/api/programma/${program.id}/export-pdf?studentView=1`} target="_blank" rel="noopener" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition">
              <FileText size={14} /> Scarica PDF
            </a>
          )}
        </div>
      </div>

      {!program ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-16 text-center">
          <Clock size={40} className="text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Il programma del corso non è ancora disponibile.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {program.modules.map(mod => (
            <div key={mod.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded mr-2">{MODULE_TYPE_LABELS[mod.type as ModuleType]}</span>
                <span className="text-sm font-semibold text-gray-800">{mod.title}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {mod.days.map(day => (
                  <div key={day.id} className="px-5 py-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      {day.title || 'Giornata'}{day.day_date && <span className="font-normal normal-case ml-1">— {formatDate(day.day_date)}</span>}
                    </p>
                    <div className="space-y-1.5">
                      {(day.blocks ?? []).map(block => (
                        <div key={block.id} className={`flex items-start gap-4 rounded-lg px-3 py-2 ${block.is_break ? 'bg-amber-50 border border-amber-100' : 'bg-gray-50 border border-gray-100'}`}>
                          <div className="flex-shrink-0 w-20 text-right pt-0.5">
                            {block.start_time && (
                              <span className="text-xs font-mono font-semibold text-blue-700">
                                {formatTime(block.start_time)}{block.end_time && `–${formatTime(block.end_time)}`}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${block.is_break ? 'text-amber-700' : 'text-gray-800'}`}>
                              {block.is_break && <Coffee size={12} className="inline mr-1 text-amber-500" />}
                              {block.title}
                            </p>
                            {block.description && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{block.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
