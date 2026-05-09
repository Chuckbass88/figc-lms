import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_PERMISSIONS } from '@/lib/types'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { data: callerProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (callerProfile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Solo super_admin' }, { status: 403 })
  }

  const { data } = await supabase
    .from('admin_permissions')
    .select('*')
    .eq('admin_user_id', userId)

  const permMap: Record<string, boolean> = {}
  ADMIN_PERMISSIONS.forEach(key => { permMap[key] = false })
  ;(data ?? []).forEach(p => { permMap[p.permission_key] = p.enabled })

  return NextResponse.json({ permissions: permMap })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Solo super_admin' }, { status: 403 })
  }

  const { permission_key, enabled } = await req.json()
  if (!ADMIN_PERMISSIONS.includes(permission_key) || typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'Parametri non validi' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('admin_permissions')
    .upsert({
      admin_user_id: userId,
      permission_key,
      enabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'admin_user_id,permission_key' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, record: data })
}
