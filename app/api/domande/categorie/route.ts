import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/domande/categorie — lista categorie (system + personali dell'utente)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data } = await supabase
    .from('question_categories')
    .select('id, name, scope, created_by')
    .or(`scope.eq.system,created_by.eq.${user.id}`)
    .order('scope', { ascending: false }) // system first
    .order('name')

  return NextResponse.json({ categories: data ?? [] })
}

// POST /api/domande/categorie — crea nuova categoria
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'docente'].includes(profile.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { name, scope } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Nome mancante' }, { status: 400 })

  // Solo super_admin può creare categorie di sistema
  const finalScope = profile.role === 'super_admin' ? (scope ?? 'system') : 'personal'

  const { data: category, error } = await supabase
    .from('question_categories')
    .insert({ name: name.trim(), scope: finalScope, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ category })
}
