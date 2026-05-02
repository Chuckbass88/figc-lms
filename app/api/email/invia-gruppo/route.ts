/**
 * POST /api/email/invia-gruppo
 * Invia un'email personalizzata a tutti i corsisti di un corso,
 * a un microgruppo, o a un singolo corsista.
 * Body: { courseId, recipientType, groupId?, studentId?, subject, body }
 * Returns: { ok: true, sent: number }
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { InviaEmailGruppoSchema, zodError } from '@/lib/schemas'
import { sendEmail, emailDiGruppo } from '@/lib/email'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { z } from 'zod'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const rl = checkRateLimit(`${user.id}:email-gruppo`, RATE_LIMITS.notifiche)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Troppi invii in poco tempo. Riprova tra qualche secondo.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  let parsed: z.infer<typeof InviaEmailGruppoSchema>
  try {
    parsed = InviaEmailGruppoSchema.parse(await request.json())
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: zodError(err) }, { status: 400 })
    }
    return NextResponse.json({ error: 'Payload non valido' }, { status: 400 })
  }

  const { courseId, recipientType, groupId, studentId, subject, body } = parsed

  // Verifica autorizzazione: super_admin può tutto, docente solo per i suoi corsi
  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 403 })

  if (profile.role !== 'super_admin') {
    const { data: isInstructor } = await supabase
      .from('course_instructors')
      .select('instructor_id')
      .eq('course_id', courseId)
      .eq('instructor_id', user.id)
      .single()
    if (!isInstructor) return NextResponse.json({ error: 'Non autorizzato per questo corso' }, { status: 403 })
  }

  const admin = createAdminClient()

  // Recupera nome corso
  const { data: course } = await admin.from('courses').select('name').eq('id', courseId).single()
  const courseName = course?.name ?? ''
  const senderName = profile.full_name ?? 'Il tuo docente'
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://coachlab.it') + '/studente/corsi/' + courseId

  // Determina destinatari in base al tipo
  let recipientIds: string[] = []

  if (recipientType === 'all') {
    const { data: enrollments } = await admin
      .from('course_enrollments')
      .select('student_id')
      .eq('course_id', courseId)
      .eq('status', 'active')
    recipientIds = (enrollments ?? []).map(e => e.student_id)
  } else if (recipientType === 'group' && groupId) {
    const { data: members } = await admin
      .from('course_group_members')
      .select('student_id')
      .eq('group_id', groupId)
    recipientIds = (members ?? []).map(m => m.student_id)
  } else if (recipientType === 'student' && studentId) {
    recipientIds = [studentId]
  }

  if (recipientIds.length === 0) {
    return NextResponse.json({ error: 'Nessun destinatario trovato' }, { status: 400 })
  }

  // Recupera email e nomi dei destinatari
  const { data: recipients } = await admin
    .from('profiles')
    .select('id, full_name, email')
    .in('id', recipientIds)

  if (!recipients || recipients.length === 0) {
    return NextResponse.json({ error: 'Nessun profilo destinatario trovato' }, { status: 400 })
  }

  // Invia email a ciascun destinatario
  let sent = 0
  for (const recipient of recipients) {
    if (!recipient.email) continue
    const tmpl = emailDiGruppo({
      recipientName: recipient.full_name ?? 'Corsista',
      senderName,
      subject,
      body,
      courseName,
      appUrl,
    })
    await sendEmail({ ...tmpl, to: recipient.email })
    sent++
  }

  return NextResponse.json({ ok: true, sent })
}
