import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data, error } = await supabase
    .from('course_group_members')
    .select('student_id, profiles(id, full_name)')
    .eq('group_id', groupId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type Row = { student_id: string; profiles: { id: string; full_name: string } | null }
  const members = (data as unknown as Row[])
    .map(r => r.profiles)
    .filter(Boolean) as { id: string; full_name: string }[]

  return NextResponse.json(members)
}
