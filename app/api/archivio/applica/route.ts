import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { archivio_id, corso_id } = await req.json()
  if (!archivio_id || !corso_id) {
    return NextResponse.json({ error: 'archivio_id e corso_id obbligatori' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('corso_archivio')
    .upsert({ archivio_id, corso_id, abilitato: true, added_by: user.id }, { onConflict: 'archivio_id,corso_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, record: data })
}
