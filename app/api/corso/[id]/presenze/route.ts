import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireInstructor(supabase: Awaited<ReturnType<typeof createClient>>, corsoId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!p) return null
  if (['super_admin', 'admin'].includes(p.role)) return user
  const { data: instr } = await supabase
    .from('course_instructors').select('instructor_id')
    .eq('course_id', corsoId).eq('instructor_id', user.id).single()
  if (!instr) return null
  return user
}

// GET /api/corso/[id]/presenze?data=YYYY-MM-DD (opzionale — ometti per tutte le date)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  if (!await requireInstructor(supabase, id)) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })

  const data = new URL(req.url).searchParams.get('data')
  if (data && !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json({ error: 'data deve essere nel formato YYYY-MM-DD' }, { status: 400 })
  }
  let query = supabase
    .from('corso_presenze')
    .select('id, corso_id, student_id, data, present, note_assenza, created_by, created_at')
    .eq('corso_id', id)
  if (data) query = query.eq('data', data)

  const { data: presenze, error } = await query.order('data').order('student_id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ presenze: presenze ?? [] })
}

// POST /api/corso/[id]/presenze
// Body: { student_id, data, present, note_assenza? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const user = await requireInstructor(supabase, id)
  if (!user) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })

  const { student_id, data, present, note_assenza } = await req.json()
  if (!student_id || !data || present === undefined) {
    return NextResponse.json({ error: 'student_id, data e present sono obbligatori' }, { status: 400 })
  }
  if (typeof present !== 'boolean') {
    return NextResponse.json({ error: 'present deve essere un boolean' }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json({ error: 'data deve essere nel formato YYYY-MM-DD' }, { status: 400 })
  }

  const { data: result, error } = await supabase
    .from('corso_presenze')
    .upsert(
      { corso_id: id, student_id, data, present, note_assenza: note_assenza ?? null, created_by: user.id },
      { onConflict: 'corso_id,student_id,data' }
    )
    .select('id, corso_id, student_id, data, present, note_assenza, created_by, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ presenza: result })
}
