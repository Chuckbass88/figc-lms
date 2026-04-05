/**
 * POST /api/quiz/importa-libreria
 * Importa domande da file Excel nella libreria domande interna.
 * FormData: file (.xlsx)
 * Formato atteso colonne Excel:
 *   question, answer_1..answer_10, correct_1..correct_10, category_1
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface ParsedQuestion {
  text: string
  category: string | null
  difficulty: string | null
  options: { text: string; is_correct: boolean }[]
}

async function parseQuizExcel(buffer: ArrayBuffer): Promise<ParsedQuestion[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx')
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

  const questions: ParsedQuestion[] = []

  for (const row of rows) {
    const text = String(row['question'] ?? '').trim()
    if (!text) continue

    // Trova le opzioni (answer_1..answer_10) e i flag correct_1..correct_10
    const options: { text: string; is_correct: boolean }[] = []
    for (let i = 1; i <= 10; i++) {
      const optText = String(row[`answer_${i}`] ?? '').trim()
      if (!optText) break
      const correctVal = row[`correct_${i}`]
      const isCorrect = correctVal === 1 || correctVal === '1' || correctVal === true
      options.push({ text: optText, is_correct: isCorrect })
    }

    if (options.length < 2) continue

    // Se nessuna opzione è marcata corretta, skippa
    if (!options.some(o => o.is_correct)) continue

    // Categoria/argomento: usa category_1 se presente e non è placeholder
    let category: string | null = String(row['category_1'] ?? '').trim() || null
    const PLACEHOLDER_CATEGORIES = ['category name', 'another category', 'maybe yet another category']
    if (category && PLACEHOLDER_CATEGORIES.includes(category.toLowerCase())) {
      category = null
    }

    // Difficoltà: colonna "difficulty" (es. "standard", "difficile", "medio")
    const diffRaw = String(row['difficulty'] ?? '').trim().toLowerCase()
    const difficulty: string | null = diffRaw || null

    questions.push({ text, category, difficulty, options })
  }

  return questions
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'File mancante' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  let questions: ParsedQuestion[]
  try {
    questions = await parseQuizExcel(buffer)
  } catch {
    return NextResponse.json({ error: 'Errore nella lettura del file Excel' }, { status: 400 })
  }

  if (questions.length === 0) {
    return NextResponse.json({ error: 'Nessuna domanda valida trovata nel file' }, { status: 400 })
  }

  let imported = 0
  let skipped = 0

  for (const q of questions) {
    const { data: inserted, error: qErr } = await supabase
      .from('question_library')
      .insert({
        text: q.text,
        category: q.category,
        difficulty: q.difficulty,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (qErr || !inserted) { skipped++; continue }

    const { error: optErr } = await supabase.from('question_library_options').insert(
      q.options.map((o, i) => ({
        question_id: inserted.id,
        text: o.text,
        is_correct: o.is_correct,
        order_index: i,
      }))
    )

    if (optErr) {
      // Rollback della domanda
      await supabase.from('question_library').delete().eq('id', inserted.id)
      skipped++
    } else {
      imported++
    }
  }

  return NextResponse.json({ imported, skipped, total: questions.length })
}
