import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/programma?courseId=xxx — lista programmi per un corso
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const courseId = searchParams.get('courseId')
  if (!courseId) return NextResponse.json({ error: 'courseId mancante' }, { status: 400 })

  const { data, error } = await supabase
    .from('course_programs')
    .select('*, creator:profiles!created_by(id, full_name)')
    .eq('course_id', courseId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/programma — crea nuovo programma (o fork)
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  const body = await request.json()
  const { courseId, title, parentId } = body

  if (!courseId) return NextResponse.json({ error: 'courseId mancante' }, { status: 400 })

  // Verifica che l'utente sia docente del corso o super_admin
  if (profile?.role !== 'super_admin') {
    const { data: isInstructor } = await supabase
      .from('course_instructors')
      .select('instructor_id')
      .eq('course_id', courseId)
      .eq('instructor_id', user.id)
      .single()
    if (!isInstructor) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('course_programs')
    .insert({
      course_id: courseId,
      title: title || 'Programma',
      created_by: user.id,
      parent_id: parentId || null,
      is_fork: !!parentId,
      visibility: 'private',
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Se è un fork, copia la struttura dell'originale
  if (parentId) {
    await copyProgramStructure(supabase, parentId, data.id)
  }

  return NextResponse.json(data)
}

async function copyProgramStructure(supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>, fromProgramId: string, toProgramId: string) {
  const { data: modules } = await supabase
    .from('program_modules')
    .select('*, days:program_days(*, blocks:program_blocks(*))')
    .eq('program_id', fromProgramId)
    .order('order_index')

  if (!modules) return

  for (const mod of modules) {
    const { data: newMod } = await supabase
      .from('program_modules')
      .insert({ program_id: toProgramId, title: mod.title, type: mod.type, order_index: mod.order_index })
      .select('id').single()
    if (!newMod) continue

    for (const day of (mod.days || [])) {
      const { data: newDay } = await supabase
        .from('program_days')
        .insert({ module_id: newMod.id, program_id: toProgramId, title: day.title, day_date: day.day_date, order_index: day.order_index })
        .select('id').single()
      if (!newDay) continue

      for (const block of (day.blocks || [])) {
        await supabase.from('program_blocks').insert({
          day_id: newDay.id,
          program_id: toProgramId,
          start_time: block.start_time,
          end_time: block.end_time,
          title: block.title,
          description: block.description,
          instructor_id: block.instructor_id,
          instructor_name: block.instructor_name,
          is_break: block.is_break,
          order_index: block.order_index,
        })
      }
    }
  }
}
