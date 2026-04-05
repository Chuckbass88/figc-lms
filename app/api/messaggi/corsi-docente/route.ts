/**
 * GET /api/messaggi/corsi-docente
 * Restituisce i corsi disponibili per il broadcast messaggi,
 * con i loro microgruppi.
 * - super_admin: tutti i corsi attivi
 * - docente: solo i corsi assegnati
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  let courseIds: string[] = []

  if (profile.role === 'super_admin') {
    const { data } = await admin.from('courses').select('id').eq('status', 'active')
    courseIds = (data ?? []).map(c => c.id)
  } else if (profile.role === 'docente') {
    const { data } = await admin.from('course_instructors').select('course_id').eq('instructor_id', user.id)
    courseIds = (data ?? []).map(c => c.course_id)
  } else {
    return NextResponse.json({ courses: [] })
  }

  if (courseIds.length === 0) return NextResponse.json({ courses: [] })

  const { data: courses } = await admin
    .from('courses')
    .select('id, name')
    .in('id', courseIds)
    .order('name')

  const { data: groups } = await admin
    .from('course_groups')
    .select('id, name, course_id')
    .in('course_id', courseIds)
    .order('name')

  const courseList = (courses ?? []).map(c => ({
    id: c.id,
    name: c.name,
    groups: (groups ?? []).filter(g => g.course_id === c.id).map(g => ({ id: g.id, name: g.name })),
  }))

  return NextResponse.json({ courses: courseList })
}
