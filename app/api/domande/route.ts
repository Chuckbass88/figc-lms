import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/domande?category=X&difficulty=Y&q=testo
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const difficulty = searchParams.get('difficulty')
  const q = searchParams.get('q')

  let query = supabase
    .from('question_library')
    .select('id, text, category, difficulty, question_library_options(id, text, is_correct, order_index)')
    .order('imported_at', { ascending: false })
    .limit(300)

  if (category) query = query.eq('category', category)
  if (difficulty) query = query.eq('difficulty', difficulty)
  if (q) query = query.ilike('text', `%${q}%`)

  const { data } = await query

  // Recupera anche i valori distinti di category e difficulty per i filtri
  const { data: meta } = await supabase
    .from('question_library')
    .select('category, difficulty')

  const categories = [...new Set((meta ?? []).map(r => r.category).filter(Boolean))].sort() as string[]
  const difficulties = [...new Set((meta ?? []).map(r => r.difficulty).filter(Boolean))].sort() as string[]

  return NextResponse.json({ questions: data ?? [], categories, difficulties })
}

// POST /api/domande — aggiunge una domanda manuale alla libreria
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'docente'].includes(profile.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { text, category, difficulty, options } = await request.json()
  if (!text?.trim() || !Array.isArray(options) || options.length < 2) {
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
  }
  if (!(options as { isCorrect: boolean }[]).some(o => o.isCorrect)) {
    return NextResponse.json({ error: 'Almeno una risposta deve essere corretta' }, { status: 400 })
  }

  const { data: q, error } = await supabase
    .from('question_library')
    .insert({
      text: text.trim(),
      category: category?.trim() || null,
      difficulty: difficulty || 'medio',
      created_by: user.id,
    })
    .select()
    .single()

  if (error || !q) return NextResponse.json({ error: error?.message }, { status: 500 })

  await supabase.from('question_library_options').insert(
    (options as { text: string; isCorrect: boolean }[])
      .filter(o => o.text?.trim())
      .map((o, i) => ({
        question_id: q.id,
        text: o.text.trim(),
        is_correct: o.isCorrect,
        order_index: i,
      }))
  )

  return NextResponse.json({ ok: true, id: q.id })
}
