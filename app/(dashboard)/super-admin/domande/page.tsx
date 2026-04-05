export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Share2, CheckCircle } from 'lucide-react'
import ImportaExcelBtn from './ImportaExcelBtn'
import AggiungiDomandaBtn from './AggiungiDomandaBtn'
import ArchivioClient from './ArchivioClient'

export default async function LibreriaDomandePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [
    { data: general },
    { data: docente },
    { data: cats },
  ] = await Promise.all([
    supabase
      .from('question_library')
      .select('id, text, category, difficulty, question_library_options(id, text, is_correct, order_index)')
      .order('imported_at', { ascending: false }),
    supabase
      .from('docente_question_library')
      .select('id, text, category, difficulty, is_shared, imported_at, created_by, docente_question_library_options(id, text, is_correct, order_index), profiles(full_name)')
      .eq('is_shared', true)
      .order('imported_at', { ascending: false }),
    supabase
      .from('question_categories')
      .select('id, name, scope, created_by')
      .or(`scope.eq.system,created_by.eq.${user.id}`)
      .order('name'),
  ])

  type LibOption = { id: string; text: string; is_correct: boolean; order_index: number }
  type GenQuestion = { id: string; text: string; category: string | null; difficulty: string | null; question_library_options: LibOption[] }
  type DocQuestion = { id: string; text: string; category: string | null; difficulty: string | null; is_shared: boolean; imported_at: string; docente_question_library_options: LibOption[]; profiles: { full_name: string } | null }
  type Category = { id: string; name: string; scope: string; created_by: string | null }

  const generalQs = (general as unknown as GenQuestion[]) ?? []
  const docenteQs = (docente as unknown as DocQuestion[]) ?? []
  const categories = (cats as unknown as Category[]) ?? []

  const difficultyColors: Record<string, string> = {
    facile: 'bg-green-100 text-green-700',
    medio: 'bg-amber-100 text-amber-700',
    difficile: 'bg-red-100 text-red-700',
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10">

      {/* Archivio generale */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Archivio Domande</h2>
            <p className="text-gray-500 text-sm mt-1">
              {generalQs.length} domande · {categories.filter(c => c.scope === 'system').length} categorie di sistema
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <AggiungiDomandaBtn categories={categories.map(c => c.name)} />
            <ImportaExcelBtn />
          </div>
        </div>

        <ArchivioClient
          initialQuestions={generalQs}
          initialCategories={categories}
        />
      </div>

      {/* Domande condivise dai docenti */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Share2 size={20} className="text-indigo-500" />
            Condivise dai Docenti
          </h2>
          <p className="text-gray-500 text-sm mt-1">{docenteQs.length} domande condivise</p>
        </div>

        {docenteQs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <Share2 size={28} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nessuna domanda condivisa</p>
          </div>
        ) : (
          <div className="space-y-3">
            {docenteQs.map(q => {
              const opts = [...q.docente_question_library_options].sort((a, b) => a.order_index - b.order_index)
              return (
                <div key={q.id} className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        {q.category && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700">{q.category}</span>}
                        {q.difficulty && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColors[q.difficulty] ?? 'bg-gray-100 text-gray-600'}`}>{q.difficulty}</span>}
                        {q.profiles && <span className="text-xs text-gray-400">di {q.profiles.full_name}</span>}
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{q.text}</p>
                      <div className="mt-2 space-y-1">
                        {opts.map(opt => (
                          <p key={opt.id} className={`text-xs flex items-center gap-1.5 ${opt.is_correct ? 'text-green-700 font-semibold' : 'text-gray-500'}`}>
                            {opt.is_correct
                              ? <CheckCircle size={11} className="flex-shrink-0" />
                              : <span className="w-2.5 h-2.5 rounded-full border border-gray-300 inline-block flex-shrink-0" />
                            }
                            {opt.text}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
