import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { ProgramBlock, ProgramDay, ProgramModule } from '@/lib/types'

type Params = { params: Promise<{ id: string }> }

const MODULE_TYPE_LABELS: Record<string, string> = {
  week: 'Settimana', module: 'Modulo', block: 'Blocco',
}

function formatTime(t: string | null) {
  if (!t) return ''
  return t.slice(0, 5)
}

function formatDate(d: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function buildHtml(program: {
  title: string
  modules: (ProgramModule & { days: (ProgramDay & { blocks: ProgramBlock[] })[] })[]
}, studentView: boolean, courseName: string) {
  const moduleRows = program.modules.map(mod => {
    const daysHtml = mod.days.map(day => {
      const blocksHtml = (day.blocks ?? []).map(b => {
        const timeStr = b.start_time ? `${formatTime(b.start_time)}${b.end_time ? `–${formatTime(b.end_time)}` : ''}` : ''
        const instructorStr = !studentView && (b.instructor_name || (b as { instructor?: { full_name: string } }).instructor?.full_name)
          ? `<span class="instructor">${b.instructor_name || (b as { instructor?: { full_name: string } }).instructor?.full_name}</span>` : ''
        return `
          <tr class="${b.is_break ? 'break-row' : ''}">
            <td class="time">${timeStr}</td>
            <td class="content">
              <span class="block-title">${b.title}</span>
              ${b.description ? `<span class="block-desc">${b.description}</span>` : ''}
              ${instructorStr}
            </td>
          </tr>`
      }).join('')

      return `
        <div class="day-section">
          <div class="day-header">${day.title || 'Giornata'}${day.day_date ? ` — ${formatDate(day.day_date)}` : ''}</div>
          <table class="blocks-table">
            <tbody>${blocksHtml}</tbody>
          </table>
        </div>`
    }).join('')

    return `
      <div class="module-section">
        <div class="module-header">
          <span class="module-type">${MODULE_TYPE_LABELS[mod.type] || mod.type}</span>
          ${mod.title}
        </div>
        ${daysHtml}
      </div>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; background: white; }
  .page { padding: 32px 40px; }
  .header { border-bottom: 3px solid #c8a84b; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
  .header-title { font-size: 22px; font-weight: 700; color: #1565C0; }
  .header-course { font-size: 13px; color: #666; margin-top: 4px; }
  .header-logo { font-size: 11px; color: #999; text-align: right; }
  .module-section { margin-bottom: 28px; }
  .module-header { background: #1565C0; color: white; padding: 8px 14px; font-size: 13px; font-weight: 700; border-radius: 6px 6px 0 0; display: flex; align-items: center; gap: 8px; }
  .module-type { background: rgba(255,255,255,0.2); font-size: 10px; padding: 2px 8px; border-radius: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .day-section { margin-bottom: 16px; }
  .day-header { font-size: 11px; font-weight: 700; color: #c8a84b; text-transform: uppercase; letter-spacing: 0.8px; padding: 8px 14px 4px; border-bottom: 1px solid #f0e8d0; margin-bottom: 4px; }
  .blocks-table { width: 100%; border-collapse: collapse; }
  .blocks-table tr { border-bottom: 1px solid #f5f5f5; }
  .blocks-table tr:last-child { border-bottom: none; }
  .break-row { background: #fffbeb; }
  td { padding: 7px 14px; vertical-align: top; }
  td.time { width: 100px; font-family: monospace; font-size: 12px; font-weight: 700; color: #1565C0; white-space: nowrap; }
  .break-row td.time { color: #d97706; }
  td.content { font-size: 12px; }
  .block-title { display: block; font-weight: 600; color: #1a1a2e; }
  .break-row .block-title { color: #92400e; font-weight: 700; }
  .block-desc { display: block; color: #666; font-size: 11px; margin-top: 2px; }
  .instructor { display: block; color: #1565C0; font-size: 11px; font-weight: 600; margin-top: 2px; }
  .footer { border-top: 2px solid #c8a84b; margin-top: 24px; padding-top: 10px; text-align: center; font-size: 10px; color: #999; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="header-title">${program.title}</div>
      <div class="header-course">${courseName}</div>
    </div>
    <div class="header-logo">CoachLab</div>
  </div>
  ${moduleRows}
  <div class="footer">Generato da CoachLab — ${new Date().toLocaleDateString('it-IT')}</div>
</div>
</body>
</html>`
}

export async function GET(request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const studentView = searchParams.get('studentView') === '1'

  const { data: program, error } = await supabase
    .from('course_programs')
    .select(`*, modules:program_modules(*, days:program_days(*, blocks:program_blocks(*, instructor:profiles!instructor_id(id, full_name))))`)
    .eq('id', id)
    .single()

  if (error || !program) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const { data: course } = await supabase.from('courses').select('name').eq('id', program.course_id).single()

  program.modules?.sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index)
  program.modules?.forEach((m: { days?: { order_index: number; blocks?: { order_index: number }[] }[] }) => {
    m.days?.sort((a, b) => a.order_index - b.order_index)
    m.days?.forEach(d => d.blocks?.sort((a, b) => a.order_index - b.order_index))
  })

  const html = buildHtml(program, studentView, course?.name ?? '')

  try {
    const puppeteer = await import('puppeteer')
    const browser = await puppeteer.default.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ format: 'A4', landscape: true, printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } })
    await browser.close()

    const filename = encodeURIComponent(`${program.title}.pdf`)
    return new Response(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch {
    // Fallback: restituisce HTML stampabile se puppeteer fallisce
    return new Response(html, { headers: { 'Content-Type': 'text/html' } })
  }
}
