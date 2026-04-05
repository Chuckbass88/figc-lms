import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, ClipboardCheck, ChevronDown } from 'lucide-react'

function scoreColor(n: number) {
  if (n <= 4) return 'text-red-600 bg-red-50 border-red-100'
  if (n <= 6) return 'text-amber-700 bg-amber-50 border-amber-100'
  if (n <= 8) return 'text-blue-700 bg-blue-50 border-blue-100'
  return 'text-green-700 bg-green-50 border-green-100'
}

function scoreLabel(n: number) {
  if (n <= 4) return 'Insufficiente'
  if (n <= 6) return 'Sufficiente'
  if (n <= 8) return 'Buono'
  return 'Ottimo'
}

export default async function StudenteValutazioniPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: enrollment } = await supabase
    .from('course_enrollments').select('status')
    .eq('course_id', id).eq('student_id', user.id).single()

  if (!enrollment) notFound()

  const [
    { data: course },
    { data: practicalRaw },
    { data: openRaw },
  ] = await Promise.all([
    supabase.from('courses').select('id, name').eq('id', id).single(),
    supabase.from('practical_evaluations')
      .select(`
        id, evaluation_date, session_label, final_score, global_note,
        evaluation_templates(name),
        practical_evaluation_scores(
          score, note,
          evaluation_template_criteria(
            name, position,
            evaluation_template_sections(name, position)
          )
        )
      `)
      .eq('course_id', id)
      .eq('student_id', user.id)
      .order('evaluation_date', { ascending: false }),
    supabase.from('course_evaluations')
      .select('id, voto, tipo, commento, created_at')
      .eq('course_id', id)
      .eq('student_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  if (!course) notFound()

  type RawPractical = {
    id: string; evaluation_date: string; session_label: string | null
    final_score: number | null; global_note: string | null
    evaluation_templates: { name: string } | null
    practical_evaluation_scores: {
      score: number; note: string | null
      evaluation_template_criteria: {
        name: string; position: number
        evaluation_template_sections: { name: string; position: number } | null
      } | null
    }[]
  }

  const practical = (practicalRaw as unknown as RawPractical[] ?? []).map(ev => {
    // Raggruppa per sezione
    const sections: Record<string, { name: string; position: number; criteria: { name: string; score: number; note: string | null }[] }> = {}
    for (const s of ev.practical_evaluation_scores) {
      const secName = s.evaluation_template_criteria?.evaluation_template_sections?.name ?? 'Altro'
      const secPos = s.evaluation_template_criteria?.evaluation_template_sections?.position ?? 0
      if (!sections[secName]) sections[secName] = { name: secName, position: secPos, criteria: [] }
      sections[secName].criteria.push({
        name: s.evaluation_template_criteria?.name ?? '',
        score: s.score,
        note: s.note,
      })
    }
    return {
      id: ev.id,
      evaluation_date: ev.evaluation_date,
      session_label: ev.session_label,
      final_score: ev.final_score,
      global_note: ev.global_note,
      template_name: ev.evaluation_templates?.name ?? 'Valutazione',
      sections: Object.values(sections).sort((a, b) => a.position - b.position),
    }
  })

  type RawOpen = { id: string; voto: number; tipo: string; commento: string | null; created_at: string }
  const openEvals = (openRaw as unknown as RawOpen[] ?? [])

  const allScores = [
    ...practical.map(p => p.final_score).filter(Boolean) as number[],
    ...openEvals.map(o => o.voto),
  ]
  const mediaGlobale = allScores.length > 0
    ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1)
    : null

  const SECTION_COLORS = ['border-amber-200 bg-amber-50', 'border-blue-200 bg-blue-50', 'border-emerald-200 bg-emerald-50']

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <Link href={`/studente/corsi/${id}`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit">
          <ArrowLeft size={15} /> {course.name}
        </Link>
        <div className="flex items-center gap-2">
          <ClipboardCheck size={18} className="text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Le mie valutazioni</h2>
        </div>
      </div>

      {/* Media globale */}
      {mediaGlobale && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
          <div className={`text-4xl font-black px-5 py-3 rounded-2xl border ${scoreColor(Number(mediaGlobale))}`}>
            {mediaGlobale}
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Media complessiva</p>
            <p className={`text-base font-bold mt-0.5 ${Number(mediaGlobale) <= 4 ? 'text-red-600' : Number(mediaGlobale) <= 6 ? 'text-amber-700' : Number(mediaGlobale) <= 8 ? 'text-blue-700' : 'text-green-700'}`}>
              {scoreLabel(Number(mediaGlobale))}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">su {allScores.length} valutazioni</p>
          </div>
        </div>
      )}

      {/* Valutazioni pratiche */}
      {practical.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Prove pratiche</h3>
          {practical.map(ev => (
            <details key={ev.id} className="group bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none select-none">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{ev.template_name}</span>
                    {ev.session_label && <span className="text-xs text-gray-400 italic">{ev.session_label}</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(ev.evaluation_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                {ev.final_score != null && (
                  <span className={`text-xl font-black px-3 py-1.5 rounded-xl border flex-shrink-0 ${scoreColor(ev.final_score)}`}>
                    {Number(ev.final_score).toFixed(1)}
                  </span>
                )}
                <ChevronDown size={14} className="text-gray-400 flex-shrink-0 group-open:rotate-180 transition-transform" />
              </summary>

              <div className="px-4 pb-4 pt-1 space-y-4 border-t border-gray-100">
                {ev.sections.map((section, sIdx) => (
                  <div key={section.name}>
                    <div className={`inline-block text-xs font-bold px-2 py-0.5 rounded-lg border mb-2 ${SECTION_COLORS[sIdx % 3]}`}>
                      {section.name}
                    </div>
                    <div className="space-y-2">
                      {section.criteria.map(c => (
                        <div key={c.name} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-700">{c.name}</span>
                          <div className="flex items-center gap-2">
                            {c.note && <span className="text-xs text-gray-400 italic truncate max-w-[80px]">{c.note}</span>}
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border flex-shrink-0 ${scoreColor(c.score)}`}>
                              {c.score}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {ev.global_note && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Note del docente</p>
                    <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{ev.global_note}</p>
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      )}

      {/* Valutazioni aperte */}
      {openEvals.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Voti aperti</h3>
          {openEvals.map(ev => (
            <div key={ev.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 capitalize">{ev.tipo}</span>
                </div>
                {ev.commento && <p className="text-xs text-gray-500 mt-1">{ev.commento}</p>}
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(ev.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <span className={`text-xl font-black px-3 py-1.5 rounded-xl border flex-shrink-0 ${scoreColor(ev.voto)}`}>
                {Number(ev.voto).toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}

      {practical.length === 0 && openEvals.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <ClipboardCheck size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nessuna valutazione ancora registrata.</p>
        </div>
      )}
    </div>
  )
}
