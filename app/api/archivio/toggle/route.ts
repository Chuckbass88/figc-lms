import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { corso_archivio_id, abilitato } = await req.json()
  if (!corso_archivio_id || typeof abilitato !== 'boolean') {
    return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('corso_archivio')
    .update({ abilitato })
    .eq('id', corso_archivio_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, record: data })
}
