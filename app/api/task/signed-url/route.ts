import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const submissionId = searchParams.get('submissionId')
  if (!submissionId) return NextResponse.json({ error: 'submissionId mancante' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const { data: sub } = await supabase
    .from('task_submissions')
    .select('storage_path, file_name, file_deleted_at, student_id')
    .eq('id', submissionId)
    .single()

  if (!sub) return NextResponse.json({ error: 'Submission non trovata' }, { status: 404 })

  // Accesso privato: solo lo studente proprietario o lo staff del corso
  const isStaff = ['docente', 'super_admin', 'admin'].includes(profile?.role ?? '')
  const isOwner = sub.student_id === user.id
  if (!isStaff && !isOwner) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  if (sub.file_deleted_at) return NextResponse.json({ error: 'File eliminato' }, { status: 410 })
  if (!sub.storage_path) return NextResponse.json({ error: 'Nessun file allegato' }, { status: 404 })

  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from('task-submissions')
    .createSignedUrl(sub.storage_path, 7200) // 2 ore

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ url: data.signedUrl, fileName: sub.file_name })
}
