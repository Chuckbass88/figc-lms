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
  const courseName = course?.name ?? ''

  program.modules?.sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index)
  program.modules?.forEach((m: { days?: { order_index: number; blocks?: { order_index: number }[] }[] }) => {
    m.days?.sort((a, b) => a.order_index - b.order_index)
    m.days?.forEach(d => d.blocks?.sort((a, b) => a.order_index - b.order_index))
  })

  const pptxgenjs = (await import('pptxgenjs')).default
  const prs = new pptxgenjs()
  prs.layout = 'LAYOUT_WIDE'  // 33.87 x 19.05 cm (16:9 landscape)

  // Colori brand
  const NAVY = '0D1B4B'
  const BLUE = '1565C0'
  const GOLD = 'C8A84B'
  const WHITE = 'FFFFFF'
  const LIGHTBG = 'F8F9FA'
  const BREAKBG = 'FFFBEB'
  const BREAKTEXT = '92400E'
  const GRAY = '6B7280'

  // Slide di copertina
  const cover = prs.addSlide()
  cover.background = { color: NAVY }
  cover.addShape(prs.ShapeType.rect, { x: 0, y: 7.5, w: 13.33, h: 0.08, fill: { color: GOLD } })
  cover.addText(program.title, { x: 0.5, y: 2.5, w: 12, h: 1.5, fontSize: 32, bold: true, color: WHITE, align: 'left' })
  cover.addText(courseName, { x: 0.5, y: 4.2, w: 12, h: 0.6, fontSize: 16, color: 'BDC3D8', align: 'left' })
  cover.addText('CoachLab', { x: 0.5, y: 6.8, w: 12, h: 0.5, fontSize: 12, color: GOLD, align: 'left' })

  // Una slide per ogni giornata di ogni modulo
  for (const mod of (program.modules as (ProgramModule & { days: (ProgramDay & { blocks: ProgramBlock[] })[] })[])) {
    for (const day of (mod.days || [])) {
      const slide = prs.addSlide()
      slide.background = { color: WHITE }

      // Header blu
      slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 1.2, fill: { color: BLUE } })
      // Badge modulo
      slide.addShape(prs.ShapeType.rect, { x: 0.3, y: 0.2, w: 1.6, h: 0.4, fill: { color: 'rgba(255,255,255,0.2)' }, line: { color: 'FFFFFF', width: 0.5 } })
      slide.addText(`${MODULE_TYPE_LABELS[mod.type] || mod.type} — ${mod.title}`, { x: 0.3, y: 0.22, w: 1.6, h: 0.36, fontSize: 8, color: WHITE, align: 'center', bold: true })
      // Titolo giornata
      const dayTitle = `${day.title || 'Giornata'}${day.day_date ? ` — ${formatDate(day.day_date)}` : ''}`
      slide.addText(dayTitle, { x: 2.1, y: 0.2, w: 9, h: 0.8, fontSize: 18, bold: true, color: WHITE, align: 'left', valign: 'middle' })
      // Logo
      slide.addText('CoachLab', { x: 11.5, y: 0.4, w: 1.6, h: 0.4, fontSize: 10, color: GOLD, align: 'right' })
      // Linea dorata footer
      slide.addShape(prs.ShapeType.rect, { x: 0, y: 7.3, w: 13.33, h: 0.06, fill: { color: GOLD } })

      // Tabella blocchi
      const startY = 1.4
      const rowH = 0.52
      const blocks = day.blocks || []

      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i]
        const y = startY + i * rowH
        if (y + rowH > 7.2) break  // Evita overflow

        const isBreak = b.is_break
        const bgColor = isBreak ? BREAKBG : (i % 2 === 0 ? WHITE : LIGHTBG)
        const titleColor = isBreak ? BREAKTEXT : NAVY

        // Sfondo riga
        slide.addShape(prs.ShapeType.rect, { x: 0.3, y, w: 12.73, h: rowH - 0.04, fill: { color: bgColor } })

        // Orario
        const timeStr = b.start_time
          ? `${formatTime(b.start_time)}${b.end_time ? `–${formatTime(b.end_time)}` : ''}`
          : ''
        slide.addText(timeStr, { x: 0.3, y: y + 0.08, w: 1.5, h: rowH - 0.2, fontSize: 11, bold: true, color: BLUE, align: 'center', fontFace: 'Courier New' })

        // Separatore verticale
        slide.addShape(prs.ShapeType.rect, { x: 1.85, y: y + 0.05, w: 0.02, h: rowH - 0.14, fill: { color: isBreak ? 'D97706' : 'E5E7EB' } })

        // Titolo blocco
        const instrText = !studentView && (b.instructor_name || (b as { instructor?: { full_name: string } }).instructor?.full_name)
          ? ` — ${b.instructor_name || (b as { instructor?: { full_name: string } }).instructor?.full_name}` : ''

        slide.addText(b.title + instrText, {
          x: 2.0, y: y + 0.06, w: 10.8, h: rowH - 0.15,
          fontSize: 11, bold: isBreak, color: titleColor, align: 'left', valign: 'middle',
        })

        if (b.description && !isBreak) {
          slide.addText(b.description, {
            x: 2.0, y: y + 0.28, w: 10.8, h: 0.22,
            fontSize: 9, color: GRAY, align: 'left',
          })
        }
      }

      if (blocks.length === 0) {
        slide.addText('Nessun blocco orario definito', { x: 0.5, y: 3.5, w: 12, h: 0.5, fontSize: 12, color: GRAY, align: 'center', italic: true })
      }
    }
  }

  const buffer = await prs.write({ outputType: 'nodebuffer' }) as Buffer
  const filename = encodeURIComponent(`${program.title}.pptx`)

  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as ArrayBuffer)
  const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
  return new Response(arrayBuf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
