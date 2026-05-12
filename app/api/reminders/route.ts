import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data, error } = await supabase
    .from('personal_reminders')
    .select('*')
    .eq('user_id', user.id)
    .order('remind_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { title, description, remind_at, notify_type } = await request.json()
  if (!title?.trim() || !remind_at) {
    return NextResponse.json({ error: 'Titolo e data/ora obbligatori' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('personal_reminders')
    .insert({
      user_id: user.id,
      title: title.trim(),
      description: description?.trim() || null,
      remind_at,
      notify_type: notify_type || 'both',
      sent: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
