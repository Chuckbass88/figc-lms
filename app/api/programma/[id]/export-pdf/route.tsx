import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
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
  return new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

const NAVY = '#0D1B4B'
const BLUE = '#1565C0'
const GOLD = '#C8A84B'
const GRAY = '#6B7280'
const LIGHTBG = '#F8F9FA'
const BREAKBG = '#FFFBEB'
const BREAKTEXT = '#92400E'
const AMBERLINE = '#D97706'

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', backgroundColor: '#FFFFFF', padding: 0 },
  coverPage: { backgroundColor: NAVY, padding: 40, justifyContent: 'flex-end' },
  coverLine: { backgroundColor: GOLD, height: 3, marginBottom: 24 },
  coverTitle: { fontSize: 28, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', marginBottom: 8 },
  coverCourse: { fontSize: 14, color: '#BDC3D8', marginBottom: 40 },
  coverBrand: { fontSize: 11, color: GOLD },
  header: { backgroundColor: BLUE, paddingHorizontal: 24, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' },
  headerBadge: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginRight: 10 },
  headerBadgeText: { fontSize: 8, color: '#FFFFFF', fontFamily: 'Helvetica-Bold' },
  headerTitle: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', flex: 1 },
  headerBrand: { fontSize: 9, color: GOLD },
  footerLine: { backgroundColor: GOLD, height: 3 },
  content: { paddingHorizontal: 24, paddingTop: 10, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 3, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 4 },
  rowNormal: { backgroundColor: '#FFFFFF' },
  rowAlt: { backgroundColor: LIGHTBG },
  rowBreak: { backgroundColor: BREAKBG },
  timeCell: { width: 60, alignItems: 'flex-end', paddingRight: 10 },
  timeText: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BLUE },
  timeTextBreak: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: AMBERLINE },
  divider: { width: 1, backgroundColor: '#E5E7EB', marginRight: 10, alignSelf: 'stretch' },
  dividerBreak: { width: 1, backgroundColor: AMBERLINE, marginRight: 10, alignSelf: 'stretch' },
  contentCell: { flex: 1 },
  blockTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY },
  blockTitleBreak: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: BREAKTEXT },
  blockDesc: { fontSize: 9, color: GRAY, marginTop: 1 },
  instructor: { fontSize: 9, color: BLUE, fontFamily: 'Helvetica-Bold', marginTop: 1 },
  empty: { fontSize: 11, color: GRAY, textAlign: 'center', marginTop: 40 },
})

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

  const modules = program.modules as (ProgramModule & { days: (ProgramDay & { blocks: ProgramBlock[] })[] })[]

  const PdfDoc = () => (
    <Document title={program.title} author="CoachLab">
      <Page size="A4" orientation="landscape" style={styles.coverPage}>
        <View style={styles.coverLine} />
        <Text style={styles.coverTitle}>{program.title}</Text>
        <Text style={styles.coverCourse}>{courseName}</Text>
        <Text style={styles.coverBrand}>CoachLab</Text>
      </Page>

      {modules.flatMap(mod =>
        (mod.days ?? []).map(day => {
          const blocks = day.blocks ?? []
          const dayTitle = `${day.title || 'Giornata'}${day.day_date ? ` — ${formatDate(day.day_date)}` : ''}`
          return (
            <Page key={day.id} size="A4" orientation="landscape" style={styles.page}>
              <View style={styles.header}>
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>{MODULE_TYPE_LABELS[mod.type] || mod.type} — {mod.title}</Text>
                </View>
                <Text style={styles.headerTitle}>{dayTitle}</Text>
                <Text style={styles.headerBrand}>CoachLab</Text>
              </View>

              <View style={styles.content}>
                {blocks.length === 0 && (
                  <Text style={styles.empty}>Nessuna fascia oraria definita</Text>
                )}
                {blocks.map((b, i) => {
                  const timeStr = b.start_time
                    ? `${formatTime(b.start_time)}${b.end_time ? `–${formatTime(b.end_time)}` : ''}`
                    : ''
                  const instrName = !studentView
                    ? (b.instructor_name || (b as { instructor?: { full_name: string } }).instructor?.full_name || '')
                    : ''
                  return (
                    <View key={b.id} style={[styles.row, b.is_break ? styles.rowBreak : i % 2 === 0 ? styles.rowNormal : styles.rowAlt]}>
                      <View style={styles.timeCell}>
                        <Text style={b.is_break ? styles.timeTextBreak : styles.timeText}>{timeStr}</Text>
                      </View>
                      <View style={b.is_break ? styles.dividerBreak : styles.divider} />
                      <View style={styles.contentCell}>
                        <Text style={b.is_break ? styles.blockTitleBreak : styles.blockTitle}>{b.title}</Text>
                        {b.description && !b.is_break ? (
                          <Text style={styles.blockDesc}>{b.description}</Text>
                        ) : null}
                        {instrName ? (
                          <Text style={styles.instructor}>{instrName}</Text>
                        ) : null}
                      </View>
                    </View>
                  )
                })}
              </View>

              <View style={styles.footerLine} />
            </Page>
          )
        })
      )}
    </Document>
  )

  const buffer = await renderToBuffer(<PdfDoc />)
  const filename = encodeURIComponent(`${program.title}.pdf`)

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
