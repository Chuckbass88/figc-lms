/**
 * POST /api/quiz/importa-libreria-docente
 * Importa domande da Excel nella libreria personale del docente.
 * Formato Excel identico all'import admin: question, answer_1..10, correct_1..10, category_1
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface ParsedQuestion {
  text: string
  category: string | null
  options: { text: string; is_correct: boolean }[]
}

async function parseQuizExcel(buffer: ArrayBuffer): Promise<ParsedQuestion[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx')
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
  const PLACEHOLDERS = ['category name', 'another category', 'maybe yet another category']
  const questions: ParsedQuestion[] = []

  for (const row of rows) {
    const text = String(row['question'] ?? '').trim()
    if (!text) continue
    const options: { text: string; is_correct: boolean }[] = []
    for (let i = 1; i <= 10; i++) {
      const optText = String(row[`answer_${i}`] ?? '').trim()
      if (!optText) break
      const correctVal = row[`correct_${i}`]
      options.push({ text: optText, is_correct: correctVal === 1 || correctVal === '1' || correctVal === true })
    }
    if (options.length < 2 || !options.some(o => o.is_correct)) continue
    let category = String(row['category_1'] ?? '').trim() || null
    if (category && PLACEHOLDERS.includes(category.toLowerCase())) category = null
    questions.push({ text, category, options })
  }
  return questions
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['docente', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'File mancante' }, { status: 400 })

  let questions: ParsedQuestion[]
  try {
    questions = await parseQuizExcel(await file.arrayBuffer())
  } catch {
    return NextResponse.json({ error: 'Errore nella lettura del file Excel' }, { status: 400 })
  }
  if (questions.length === 0) return NextResponse.json({ error: 'Nessuna domanda valida trovata' }, { status: 400 })

  let imported = 0, skipped = 0
  for (const q of questions) {
    const { data: inserted, error: qErr } = await supabase
      .from('docente_question_library')
      .insert({ text: q.text, category: q.category, created_by: user.id })
      .select('id').single()

    if (qErr || !inserted) { skipped++; continue }

    const { error: optErr } = await supabase.from('docente_question_library_options').insert(
      q.options.map((o, i) => ({ question_id: inserted.id, text: o.text, is_correct: o.is_correct, order_index: i }))
    )
    if (optErr) { await supabase.from('docente_question_library').delete().eq('id', inserted.id); skipped++ }
    else imported++
  }

  return NextResponse.json({ imported, skipped, total: questions.length })
}
