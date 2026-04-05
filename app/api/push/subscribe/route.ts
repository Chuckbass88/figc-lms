/**
 * POST /api/push/subscribe   — salva subscription Web Push
 * DELETE /api/push/subscribe — rimuove subscription
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const body = await request.json()
  const { endpoint, keys } = body as { endpoint: string; keys: { p256dh: string; auth: string } }

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Dati subscription mancanti' }, { status: 400 })
  }

  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id:  user.id,
    platform: 'web',
    endpoint,
    p256dh:   keys.p256dh,
    auth_key: keys.auth,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,endpoint' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { endpoint } = await request.json()
  if (!endpoint) return NextResponse.json({ error: 'endpoint mancante' }, { status: 400 })

  await supabase.from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)

  return NextResponse.json({ ok: true })
}
