/**
 * POST /api/messaggi/invia-gruppo
 * Invia un messaggio a tutti i corsisti di un corso o di un microgruppo.
 * Body: { courseId, groupId?, content }
 * Crea una conversazione 1:1 con ciascun destinatario e invia il messaggio.
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { courseId, groupId, content } = await request.json()
  if (!courseId || !content?.trim()) {
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Recupera nome corso e (opzionalmente) microgruppo per il titolo della conversazione
  const { data: courseData } = await admin.from('courses').select('name').eq('id', courseId).single()
  const courseName = (courseData as any)?.name ?? ''

  let convName = courseName
  let studentIds: string[] = []

  if (groupId) {
    // Microgruppo specifico
    const { data: groupData } = await admin.from('course_groups').select('name').eq('id', groupId).single()
    const groupName = (groupData as any)?.name ?? ''
    convName = groupName ? `${groupName} — ${courseName}` : courseName

    const { data } = await admin
      .from('course_group_members')
      .select('student_id')
      .eq('group_id', groupId)
    studentIds = (data ?? []).map(m => m.student_id)
  } else {
    // Tutti i corsisti del corso
    const { data } = await admin
      .from('course_enrollments')
      .select('student_id')
      .eq('course_id', courseId)
      .eq('status', 'active')
    studentIds = (data ?? []).map(e => e.student_id)
  }

  // Rimuovi il mittente dalla lista
  studentIds = studentIds.filter(id => id !== user.id)

  if (studentIds.length === 0) {
    return NextResponse.json({ error: 'Nessun corsista trovato nel gruppo selezionato' }, { status: 400 })
  }

  let sent = 0
  let failed = 0

  for (const otherUserId of studentIds) {
    // Cerca conversazione 1:1 esistente
    const { data: myConvs } = await admin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id)

    const myConvIds = (myConvs ?? []).map(c => c.conversation_id)
    let conversationId: string | null = null

    if (myConvIds.length > 0) {
      const { data: shared } = await admin
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', otherUserId)
        .in('conversation_id', myConvIds)
      if (shared && shared.length > 0) conversationId = shared[0].conversation_id
    }

    // Crea conversazione se non esiste
    if (!conversationId) {
      const { data: conv, error: convErr } = await admin
        .from('conversations')
        .insert({ type: 'direct', name: convName || null, is_suspended: false, created_by: user.id })
        .select('id').single()
      if (convErr || !conv) { failed++; continue }
      conversationId = conv.id
      await admin.from('conversation_participants').insert([
        { conversation_id: conversationId, user_id: user.id },
        { conversation_id: conversationId, user_id: otherUserId },
      ])
    }

    // Invia messaggio
    const { error: msgErr } = await admin.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
    })

    if (msgErr) { failed++; continue }

    // Notifica in-app
    await admin.from('notifications').insert({
      user_id: otherUserId,
      type:    'message',
      title:   'Nuovo messaggio',
      body:    convName ? `Messaggio da ${convName}` : 'Hai ricevuto un nuovo messaggio.',
      data:    { url: `/messaggi/${conversationId}` },
    })

    sent++
  }

  return NextResponse.json({ sent, failed, total: studentIds.length })
}
