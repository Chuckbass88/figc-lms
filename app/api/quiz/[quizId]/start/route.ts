import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

interface LibQ {
  id: string
  text: string
  source: 'docente' | 'globale'
  options: { text: string; is_correct: boolean }[]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export async function POST(_req: Request, { params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: quiz } = await supabase
    .from('course_quizzes')
    .select('id, course_id, from_library, pool_categories, pool_difficolta, extract_count, available_from, available_until, created_by')
    .eq('id', quizId)
    .single()
  if (!quiz) return NextResponse.json({ error: 'Quiz non trovato' }, { status: 404 })

  const q = quiz as unknown as {
    course_id: string; from_library: boolean
    pool_categories: string[]; pool_difficolta: string[]; extract_count: number | null
    available_from: string | null; available_until: string | null; created_by: string
  }

  if (!q.from_library) {
    return NextResponse.json({ error: 'Quiz non da libreria' }, { status: 400 })
  }

  const { data: enrollment } = await supabase
    .from('course_enrollments')
    .select('status').eq('course_id', q.course_id).eq('student_id', user.id).single()
  if (!enrollment) return NextResponse.json({ error: 'Non iscritto al corso' }, { status: 403 })

  const now = new Date()
  if (q.available_from && new Date(q.available_from) > now)
    return NextResponse.json({ error: 'Quiz non ancora disponibile' }, { status: 403 })
  if (q.available_until && new Date(q.available_until) < now)
    return NextResponse.json({ error: 'Quiz chiuso' }, { status: 403 })

  const admin = createAdminClient()

  // Tentativo esistente?
  const { data: existing } = await admin
    .from('quiz_attempts')
    .select('id, submitted_at')
    .eq('quiz_id', quizId).eq('student_id', user.id)
    .maybeSingle()

  if (existing?.submitted_at) {
    return NextResponse.json({ error: 'Quiz già completato' }, { status: 409 })
  }

  // Resume: tentativo in corso → restituisci lo snapshot esistente
  if (existing && !existing.submitted_at) {
    const { data: snap } = await admin
      .from('quiz_attempt_questions')
      .select('id, text, order_index, quiz_attempt_options(id, text, order_index)')
      .eq('attempt_id', existing.id)
      .order('order_index')
    const questions = (snap ?? []).map(s => ({
      id: s.id,
      text: s.text,
      options: ((s.quiz_attempt_options as { id: string; text: string; order_index: number }[]) ?? [])
        .sort((a, b) => a.order_index - b.order_index)
        .map(o => ({ id: o.id, text: o.text })),
    }))
    return NextResponse.json({ ok: true, attemptId: existing.id, questions })
  }

  // ── Estrazione dalla libreria ──────────────────────────────────────────────
  const cats = q.pool_categories ?? []
  const diffs = q.pool_difficolta ?? []

  // Globale
  let gQ = admin.from('question_library')
    .select('id, text, category, difficulty, question_library_options(text, is_correct)')
  if (cats.length) gQ = gQ.in('category', cats)
  if (diffs.length) gQ = gQ.in('difficulty', diffs)
  const { data: globali } = await gQ

  // Personale del docente creatore + condivise
  let dQ = admin.from('docente_question_library')
    .select('id, text, category, difficulty, created_by, is_shared, docente_question_library_options(text, is_correct)')
    .or(`created_by.eq.${q.created_by},is_shared.eq.true`)
  if (cats.length) dQ = dQ.in('category', cats)
  if (diffs.length) dQ = dQ.in('difficulty', diffs)
  const { data: docenti } = await dQ

  const pool: LibQ[] = [
    ...((globali ?? []).map(r => ({
      id: r.id as string,
      text: r.text as string,
      source: 'globale' as const,
      options: ((r.question_library_options as { text: string; is_correct: boolean }[]) ?? []),
    }))),
    ...((docenti ?? []).map(r => ({
      id: r.id as string,
      text: r.text as string,
      source: 'docente' as const,
      options: ((r.docente_question_library_options as { text: string; is_correct: boolean }[]) ?? []),
    }))),
  ].filter(p => p.options.length >= 2 && p.options.some(o => o.is_correct))

  if (pool.length === 0) {
    return NextResponse.json({
      error: 'Nessuna domanda disponibile nella libreria per i filtri impostati. Aggiungi domande alla libreria.',
    }, { status: 400 })
  }

  const n = Math.min(q.extract_count ?? pool.length, pool.length)
  const picked = shuffle(pool).slice(0, n)

  // Crea tentativo in corso
  const { data: attempt, error: aErr } = await admin
    .from('quiz_attempts')
    .insert({
      quiz_id: quizId,
      student_id: user.id,
      score: 0,
      total: picked.length,
      passed: false,
      started_at: now.toISOString(),
      submitted_at: null,
    })
    .select('id')
    .single()
  if (aErr || !attempt) {
    return NextResponse.json({ error: aErr?.message ?? 'Errore creazione tentativo' }, { status: 500 })
  }

  // Snapshot domande + opzioni (mescolate)
  const out: { id: string; text: string; options: { id: string; text: string }[] }[] = []
  for (let i = 0; i < picked.length; i++) {
    const p = picked[i]
    const { data: aq } = await admin
      .from('quiz_attempt_questions')
      .insert({
        attempt_id: attempt.id,
        source: p.source,
        lib_question_id: p.id,
        text: p.text,
        points: 1,
        order_index: i,
      })
      .select('id')
      .single()
    if (!aq) continue
    const shuffledOpts = shuffle(p.options)
    const { data: insertedOpts } = await admin
      .from('quiz_attempt_options')
      .insert(shuffledOpts.map((o, j) => ({
        attempt_question_id: aq.id,
        text: o.text,
        is_correct: o.is_correct,
        order_index: j,
      })))
      .select('id, text, order_index')
    out.push({
      id: aq.id,
      text: p.text,
      options: (insertedOpts ?? [])
        .sort((a, b) => a.order_index - b.order_index)
        .map(o => ({ id: o.id, text: o.text })),
    })
  }

  return NextResponse.json({ ok: true, attemptId: attempt.id, questions: out })
}
