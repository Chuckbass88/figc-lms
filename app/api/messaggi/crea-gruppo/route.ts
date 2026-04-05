/**
 * POST /api/messaggi/crea-gruppo
 * Crea (o recupera) una chat di gruppo per un corso e invia il primo messaggio.
 * Solo super_admin e docenti del corso.
 * Body: { courseId, content }
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { courseId, content } = await request.json()
  if (!courseId || !content?.trim()) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (!profile || (profile.role !== 'super_admin' && profile.role !== 'docente')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const admin = createAdminClient()

  // Dati corso
  const { data: course } = await admin.from('courses').select('id, name').eq('id', courseId).single()
  if (!course) return NextResponse.json({ error: 'Corso non trovato' }, { status: 404 })

  // Trova conversazione gruppo esistente per questo corso
  type ExistingConv = { id: string }
  const { data: existing } = await admin
    .from('conversations')
    .select('id')
    .eq('type', 'group')
    .eq('course_id', courseId)
    .single() as { data: ExistingConv | null }

  let conversationId: string

  if (existing) {
    conversationId = existing.id
    // Assicurati che l'utente corrente sia partecipante
    await admin.from('conversation_participants')
      .upsert({ conversation_id: conversationId, user_id: user.id, role: 'admin' })
  } else {
    // Crea nuova conversazione gruppo
    const { data: newConv, error: convErr } = await admin
      .from('conversations')
      .insert({ type: 'group', name: `Gruppo: ${course.name}`, course_id: courseId, created_by: user.id })
      .select('id').single()

    if (convErr || !newConv) return NextResponse.json({ error: convErr?.message ?? 'Errore' }, { status: 500 })
    conversationId = newConv.id

    // Aggiungi tutti i corsisti attivi + istruttori
    const [{ data: enrollments }, { data: instructors }] = await Promise.all([
      admin.from('course_enrollments').select('student_id').eq('course_id', courseId).eq('status', 'active'),
      admin.from('course_instructors').select('instructor_id').eq('course_id', courseId),
    ])

    const participantIds = [
      ...new Set([
        user.id,
        ...(enrollments ?? []).map(e => e.student_id),
        ...(instructors ?? []).map(i => i.instructor_id),
      ])
    ]

    await admin.from('conversation_participants').insert(
      participantIds.map(uid => ({
        conversation_id: conversationId,
        user_id: uid,
        role: (uid === user.id || (instructors ?? []).some(i => i.instructor_id === uid)) ? 'admin' : 'member',
      }))
    )

    // Messaggio di sistema
    await admin.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: `${profile.full_name} ha creato il gruppo "${course.name}"`,
      type: 'system',
    })
  }

  // Invia il messaggio dell'utente
  await admin.from('messages').insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: content.trim(),
    type: 'text',
  })

  // Conta partecipanti per risposta
  const { data: parts } = await admin
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
  const total = (parts ?? []).length
  const sent  = total - 1

  // Notifica agli altri
  const otherIds = (parts ?? []).map(p => p.user_id).filter(id => id !== user.id)
  if (otherIds.length > 0) {
    await admin.from('notifications').insert(
      otherIds.map(uid => ({
        user_id: uid,
        title:   `Nuovo messaggio nel gruppo ${course.name}`,
        message: content.trim().slice(0, 80),
        read:    false,
      }))
    )
  }

  return NextResponse.json({ conversationId, sent, total })
}
