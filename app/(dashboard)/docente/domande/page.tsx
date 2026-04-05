export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ImportaExcelDocenteBtn from './ImportaExcelDocenteBtn'
import DocenteLibreriaClient from './DocenteLibreriaClient'

export default async function DocenteLibreriaDomandePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['docente', 'super_admin'].includes(profile.role)) notFound()

  const [{ data: mine }, { data: shared }, { data: cats }] = await Promise.all([
    supabase
      .from('docente_question_library')
      .select('id, text, category, difficulty, is_shared, imported_at, docente_question_library_options(id, text, is_correct, order_index)')
      .eq('created_by', user.id)
      .order('imported_at', { ascending: false }),
    supabase
      .from('docente_question_library')
      .select('id, text, category, difficulty, is_shared, imported_at, created_by, docente_question_library_options(id, text, is_correct, order_index), profiles(full_name)')
      .eq('is_shared', true)
      .neq('created_by', user.id)
      .order('imported_at', { ascending: false }),
    supabase
      .from('question_categories')
      .select('id, name, scope, created_by')
      .or(`scope.eq.system,created_by.eq.${user.id}`)
      .order('name'),
  ])

  type LibOption = { id: string; text: string; is_correct: boolean; order_index: number }
  type LibQuestion = {
    id: string; text: string; category: string | null; difficulty: string | null
    is_shared: boolean; imported_at: string
    docente_question_library_options: LibOption[]
    profiles?: { full_name: string } | null
  }
  type Category = { id: string; name: string; scope: string; created_by: string | null }

  const myQuestions = (mine as unknown as LibQuestion[]) ?? []
  const sharedQuestions = (shared as unknown as LibQuestion[]) ?? []
  const categories = (cats as unknown as Category[]) ?? []

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">La mia libreria domande</h2>
          <p className="text-gray-500 text-sm mt-1">
            {myQuestions.length} domande · {myQuestions.filter(q => q.is_shared).length} condivise
          </p>
        </div>
        <ImportaExcelDocenteBtn />
      </div>

      <DocenteLibreriaClient
        myQuestions={myQuestions}
        sharedQuestions={sharedQuestions}
        categories={categories}
      />
    </div>
  )
}
