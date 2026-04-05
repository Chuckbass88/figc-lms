/**
 * POST /api/admin/importa-corsisti
 * Importa corsisti da file CSV o Excel.
 * Crea account mancanti e iscrive tutti al corso.
 * FormData: file (CSV o xlsx), courseId
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const DEFAULT_PASSWORD = 'Cambia2025!'

interface Row { nome: string; cognome: string; email: string }

function parseCSV(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  // Trova indici colonne dall'header
  const header = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase())
  const nomeIdx = header.findIndex(h => h === 'nome')
  const cognomeIdx = header.findIndex(h => h === 'cognome')
  const emailIdx = header.findIndex(h => h.includes('email') || h.includes('mail'))
  if (emailIdx === -1) return []

  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.replace(/"/g, '').trim())
    return {
      nome: nomeIdx >= 0 ? cols[nomeIdx] ?? '' : '',
      cognome: cognomeIdx >= 0 ? cols[cognomeIdx] ?? '' : '',
      email: cols[emailIdx] ?? '',
    }
  }).filter(r => r.email.includes('@'))
}

async function parseXLSX(buffer: ArrayBuffer): Promise<Row[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx')
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const data: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
    return data.map(row => {
      const keys = Object.keys(row).map(k => k.toLowerCase())
      const get = (pattern: RegExp) => {
        const key = Object.keys(row).find(k => pattern.test(k.toLowerCase())) ?? ''
        return String(row[key] ?? '').trim()
      }
      return {
        nome: get(/^nome$/),
        cognome: get(/^cognome$/),
        email: get(/email|mail/),
      }
    }).filter(r => r.email.includes('@'))
  } catch {
    return []
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const courseId = formData.get('courseId') as string | null

  if (!file || !courseId) return NextResponse.json({ error: 'File o courseId mancante' }, { status: 400 })

  // Parse file
  let rows: Row[] = []
  const fileName = file.name.toLowerCase()
  const mimeType = file.type.toLowerCase()
  const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') ||
    mimeType.includes('spreadsheetml') || mimeType.includes('ms-excel')
  const isCSV = fileName.endsWith('.csv') || mimeType.includes('csv') || mimeType.includes('text/')

  if (isExcel) {
    const buffer = await file.arrayBuffer()
    rows = await parseXLSX(buffer)
  } else if (isCSV || (!isExcel && !isCSV)) {
    // Tenta sempre come CSV in fallback
    const text = await file.text()
    rows = parseCSV(text)
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Nessuna riga valida trovata. Verifica le colonne: Nome, Cognome, Email' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Carica iscrizioni esistenti
  const { data: existing } = await admin
    .from('course_enrollments')
    .select('student_id')
    .eq('course_id', courseId)
  const alreadyEnrolled = new Set(existing?.map(e => e.student_id) ?? [])

  let created = 0
  let enrolled = 0
  let skipped = 0
  const errors: { row: number; email: string; reason: string }[] = []
  const newIds: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const { nome, cognome, email } = rows[i]
    const rowNum = i + 2

    if (!email || !email.includes('@')) {
      errors.push({ row: rowNum, email, reason: 'Email non valida' })
      continue
    }

    const fullName = [nome, cognome].filter(Boolean).join(' ') || email.split('@')[0]

    // Verifica se l'utente esiste già
    const { data: existingUsers } = await admin.auth.admin.listUsers()
    const existingUser = existingUsers?.users.find(u => u.email?.toLowerCase() === email.toLowerCase())

    let userId: string

    if (existingUser) {
      userId = existingUser.id
    } else {
      // Crea utente
      const { data: authData, error: authErr } = await admin.auth.admin.createUser({
        email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      })
      if (authErr || !authData.user) {
        errors.push({ row: rowNum, email, reason: authErr?.message ?? 'Errore creazione account' })
        continue
      }
      userId = authData.user.id
      // Aggiorna profilo
      await admin.from('profiles').update({
        full_name: fullName,
        role: 'studente',
        is_active: true,
      }).eq('id', userId)
      created++
      newIds.push(userId)
    }

    // Iscrivi al corso
    if (alreadyEnrolled.has(userId)) {
      skipped++
      continue
    }

    const { error: enrollErr } = await admin.from('course_enrollments').upsert({
      course_id: courseId,
      student_id: userId,
      status: 'active',
      enrolled_at: new Date().toISOString(),
    }, { onConflict: 'course_id,student_id' })

    if (enrollErr) {
      errors.push({ row: rowNum, email, reason: 'Errore iscrizione: ' + enrollErr.message })
    } else {
      enrolled++
      alreadyEnrolled.add(userId)
    }
  }

  return NextResponse.json({ created, enrolled, skipped, errors, newIds })
}
