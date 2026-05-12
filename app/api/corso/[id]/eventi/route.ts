import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!p || !['super_admin', 'admin'].includes(p.role)) return null
  return user
}

// POST /api/corso/[id]/eventi — crea nuovo evento
// Body: { data, ora_inizio, ora_fine, materia, note?, area_id? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })

  const { data, ora_inizio, ora_fine, materia, note, area_id, location } = await req.json()
  if (!data || !ora_inizio || !ora_fine || !materia) {
    return NextResponse.json({ error: 'data, ora_inizio, ora_fine e materia sono obbligatori' }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json({ error: 'data deve essere nel formato YYYY-MM-DD' }, { status: 400 })
  }

  const { data: evento, error } = await supabase
    .from('corso_eventi')
    .insert({ corso_id: id, data, ora_inizio, ora_fine, materia, note: note ?? null, area_id: area_id ?? null, location: location ?? null })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ evento })
}
