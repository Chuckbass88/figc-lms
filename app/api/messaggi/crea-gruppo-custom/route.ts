/**
 * POST /api/messaggi/crea-gruppo-custom
 * Crea (o trova) una chat di gruppo condivisa.
 * Supporta: group_type = 'corso' | 'microgruppo' | 'libero'
 * Body:
 *   group_type: 'corso' | 'microgruppo' | 'libero'
 *   course_id?: string          // richiesto per 'corso' e 'microgruppo'
 *   group_id?: string           // richiesto per 'microgruppo'
 *   participant_ids?: string[]  // richiesto per 'libero'
 *   name?: string               // nome del gruppo (opzionale per libero)
 *   content: string             // primo messaggio
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (!profile || (profile.role !== 'super_admin' && profile.role !== 'docente')) {
    return NextResponse.json({ error: 'Solo docenti e admin possono creare gruppi' }, { status: 403 })
  }

  const body = await request.json()
  const { group_type, course_id, group_id, participant_ids, name, content } = body

  if (!content?.trim()) return NextResponse.json({ error: 'Messaggio obbligatorio' }, { status: 400 })
  if (!['corso', 'microgruppo', 'libero'].includes(group_type)) {
    return NextResponse.json({ error: 'group_type non valido' }, { status: 400 })
  }

  const admin = createAdminClient()
  let conversationId: string
  let groupName = name?.trim()

  if (group_type === 'corso' || group_type === 'microgruppo') {
    if (!course_id) return NextResponse.json({ error: 'course_id obbligatorio' }, { status: 400 })

    const { data: course } = await admin.from('courses').select('id, name').eq('id', course_id).single()
    if (!course) return NextResponse.json({ error: 'Corso non trovato' }, { status: 404 })

    if (group_type === 'microgruppo' && !group_id) {
      return NextResponse.json({ error: 'group_id obbligatorio per microgruppo' }, { status: 400 })
    }

    // Cerca conversazione esistente per questo corso/microgruppo
    let existingQuery = admin.from('conversations')
      .select('id')
      .eq('type', 'group')
      .eq('group_type', group_type)
      .eq('course_id', course_id)

    if (group_type === 'microgruppo' && group_id) {
      existingQuery = existingQuery.eq('group_id', group_id)
    }

    const { data: existing } = await existingQuery.maybeSingle()

    if (existing) {
      conversationId = existing.id
      await admin.from('conversation_participants')
        .upsert({ conversation_id: conversationId, user_id: user.id, role: 'admin' })
    } else {
      // Costruisci nome gruppo
      if (!groupName) {
        if (group_type === 'microgruppo' && group_id) {
          const { data: grp } = await admin.from('course_groups').select('name').eq('id', group_id).single()
          groupName = `${grp?.name ?? 'Microgruppo'} — ${course.name}`
        } else {
          groupName = `Gruppo: ${course.name}`
        }
      }

      const { data: newConv, error: convErr } = await admin
        .from('conversations')
        .insert({
          type: 'group',
          group_type,
          name: groupName,
          course_id,
          group_id: group_id ?? null,
          moderator_id: user.id,
          created_by: user.id,
        })
        .select('id').single()

      if (convErr || !newConv) return NextResponse.json({ error: convErr?.message ?? 'Errore' }, { status: 500 })
      conversationId = newConv.id

      // Recupera partecipanti
      let participantIds: string[] = [user.id]

      if (group_type === 'corso') {
        const [{ data: enrollments }, { data: instructors }] = await Promise.all([
          admin.from('course_enrollments').select('student_id').eq('course_id', course_id).eq('status', 'active'),
          admin.from('course_instructors').select('instructor_id').eq('course_id', course_id),
        ])
        participantIds = [...new Set([
          user.id,
          ...(enrollments ?? []).map(e => e.student_id),
          ...(instructors ?? []).map(i => i.instructor_id),
        ])]
      } else if (group_type === 'microgruppo' && group_id) {
        const { data: members } = await admin
          .from('course_group_members')
          .select('student_id')
          .eq('group_id', group_id)
        const { data: instructors } = await admin
          .from('course_instructors').select('instructor_id').eq('course_id', course_id)
        participantIds = [...new Set([
          user.id,
          ...(members ?? []).map(m => m.student_id),
          ...(instructors ?? []).map(i => i.instructor_id),
        ])]
      }

      await admin.from('conversation_participants').insert(
        participantIds.map(uid => ({
          conversation_id: conversationId,
          user_id: uid,
          role: uid === user.id ? 'admin' : 'member',
        }))
      )

      await admin.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: `${profile.full_name} ha creato il gruppo "${groupName}"`,
        type: 'system',
      })
    }
  } else {
    // Libero: partecipanti scelti manualmente
    if (!participant_ids?.length) {
      return NextResponse.json({ error: 'Seleziona almeno un partecipante' }, { status: 400 })
    }

    const allIds = [...new Set([user.id, ...participant_ids])]
    if (!groupName) groupName = `Gruppo di ${profile.full_name}`

    const { data: newConv, error: convErr } = await admin
      .from('conversations')
      .insert({
        type: 'group',
        group_type: 'libero',
        name: groupName,
        moderator_id: user.id,
        created_by: user.id,
      })
      .select('id').single()

    if (convErr || !newConv) return NextResponse.json({ error: convErr?.message ?? 'Errore' }, { status: 500 })
    conversationId = newConv.id

    await admin.from('conversation_participants').insert(
      allIds.map(uid => ({
        conversation_id: conversationId,
        user_id: uid,
        role: uid === user.id ? 'admin' : 'member',
      }))
    )

    await admin.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: `${profile.full_name} ha creato il gruppo "${groupName}"`,
      type: 'system',
    })
  }

  // Messaggio utente
  const { data: msg } = await admin.from('messages').insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: content.trim(),
    type: 'text',
  }).select('id').single()

  // Partecipanti + notifiche
  const { data: parts } = await admin
    .from('conversation_participants').select('user_id').eq('conversation_id', conversationId)
  const otherIds = (parts ?? []).map(p => p.user_id).filter(id => id !== user.id)

  if (otherIds.length > 0) {
    await admin.from('notifications').insert(
      otherIds.map(uid => ({
        user_id: uid,
        type: 'message',
        body: content.trim().slice(0, 80),
        data: { conversationId },
      }))
    )
  }

  return NextResponse.json({ conversationId, participants: (parts ?? []).length })
}
