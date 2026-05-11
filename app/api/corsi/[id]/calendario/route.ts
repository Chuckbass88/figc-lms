import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: corsoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 403 })

  const isAdmin = ['super_admin', 'admin'].includes(profile.role)

  if (!isAdmin) {
    if (profile.role === 'docente') {
      const { data: assigned } = await supabase
        .from('course_instructors').select('id').eq('course_id', corsoId).eq('instructor_id', user.id).single()
      if (!assigned) return NextResponse.json({ error: 'Non assegnato a questo corso' }, { status: 403 })
    } else if (profile.role === 'studente') {
      const { data: enrolled } = await supabase
        .from('course_enrollments').select('id').eq('course_id', corsoId).eq('student_id', user.id).eq('status', 'active').single()
      if (!enrolled) return NextResponse.json({ error: 'Non iscritto a questo corso' }, { status: 403 })
    } else {
      return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
    }
  }

  const { data: eventi, error } = await supabase
    .from('corso_eventi')
    .select('*, area:aree(id, nome)')
    .eq('corso_id', corsoId)
    .order('data')
    .order('ora_inizio')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: corso } = await supabase
    .from('courses').select('id, name, location, start_date, end_date').eq('id', corsoId).single()

  return NextResponse.json({ eventi: eventi ?? [], corso, role: profile.role })
}
