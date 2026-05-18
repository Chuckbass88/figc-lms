import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Cleanup TTL "transient relay": elimina i file delle consegne le cui task
// hanno deadline superata da oltre TTL_DAYS e che non sono già stati rimossi.
// Risolve l'accumulo di storage per task mai valutate.
//
// Invocato da: Vercel Cron (header Authorization: Bearer CRON_SECRET)
// oppure manualmente da un super_admin loggato.

const TTL_DAYS = 30

export async function GET(request: Request) {
  // Auth: cron secret OPPURE super_admin
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const isCron = !!cronSecret && authHeader === `Bearer ${cronSecret}`

  if (!isCron) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }
  }

  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - TTL_DAYS * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  // Candidate: file ancora presente, non già cancellato
  const { data: subs, error } = await admin
    .from('task_submissions')
    .select('id, storage_path, task_id, course_tasks(due_date)')
    .not('storage_path', 'is', null)
    .is('file_deleted_at', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const scaduti = (subs ?? []).filter(s => {
    const t = (s as unknown as { course_tasks: { due_date: string | null } | null }).course_tasks
    const due = t?.due_date
    return !!due && due < cutoff
  })

  let cleaned = 0
  const errors: string[] = []
  for (const s of scaduti) {
    const path = (s as { storage_path: string }).storage_path
    const { error: rmErr } = await admin.storage.from('task-submissions').remove([path])
    if (rmErr) { errors.push(`${(s as { id: string }).id}: ${rmErr.message}`); continue }
    await admin.from('task_submissions')
      .update({ file_deleted_at: new Date().toISOString() })
      .eq('id', (s as { id: string }).id)
    cleaned++
  }

  return NextResponse.json({
    ok: true,
    ttlDays: TTL_DAYS,
    cutoff,
    scanned: subs?.length ?? 0,
    expired: scaduti.length,
    cleaned,
    errors: errors.length ? errors : undefined,
  })
}
