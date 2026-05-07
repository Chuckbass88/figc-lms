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

function formatDateLong(d: string | null) {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateShort(d: string | null) {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

const C = {
  navy:      '#0D1B4B',
  blue:      '#1565C0',
  blueMid:   '#1E88E5',
  gold:      '#C8A84B',
  goldDark:  '#A08030',
  white:     '#FFFFFF',
  gray:      '#6B7280',
  grayLight: '#9CA3AF',
  bg:        '#F8F9FA',
  breakBg:   '#FFFBEB',
  breakText: '#92400E',
  amber:     '#D97706',
  border:    '#E5E7EB',
}

const styles = StyleSheet.create({
  // ── Pagine ────────────────────────────────────────────────
  coverPage: { backgroundColor: C.navy, flexDirection: 'column' },
  dayPage:   { backgroundColor: C.white, flexDirection: 'column' },

  // ── Copertina ─────────────────────────────────────────────
  coverTopBar:    { backgroundColor: C.gold, height: 5 },
  coverBody:      { flex: 1, padding: 48, justifyContent: 'flex-end' },
  coverOverline:  { fontSize: 9, color: C.gold, fontFamily: 'Helvetica-Bold', letterSpacing: 2, marginBottom: 20, textTransform: 'uppercase' },
  coverTitle:     { fontSize: 34, fontFamily: 'Helvetica-Bold', color: C.white, marginBottom: 10, lineHeight: 1.2 },
  coverCourse:    { fontSize: 15, color: '#BDC3D8', marginBottom: 6 },
  coverLocation:  { fontSize: 12, color: '#8892B0', marginBottom: 4 },
  coverDates:     { fontSize: 12, color: '#8892B0', marginBottom: 32 },
  coverDivider:   { backgroundColor: C.gold, height: 1, width: 60, marginBottom: 32 },
  coverFooter:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  coverBrand:     { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.gold, letterSpacing: 1 },
  coverGenDate:   { fontSize: 9, color: '#4A5568' },
  coverBottomBar: { backgroundColor: C.gold, height: 3 },

  // ── Header giornata ────────────────────────────────────────
  dayHeader:      { backgroundColor: C.blue, paddingHorizontal: 28, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  dayModBadge:    { backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginRight: 12, flexShrink: 0 },
  dayModText:     { fontSize: 8, color: C.white, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },
  dayTitleBlock:  { flex: 1 },
  dayTitle:       { fontSize: 16, fontFamily: 'Helvetica-Bold', color: C.white },
  dayDate:        { fontSize: 9, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  dayBrand:       { fontSize: 9, color: C.gold, fontFamily: 'Helvetica-Bold', letterSpacing: 1, flexShrink: 0 },

  // ── Contenuto ─────────────────────────────────────────────
  content:        { flex: 1, paddingHorizontal: 28, paddingTop: 14, paddingBottom: 10 },
  emptyMsg:       { fontSize: 11, color: C.grayLight, textAlign: 'center', marginTop: 50 },

  // ── Riga fascia oraria ─────────────────────────────────────
  row:            { flexDirection: 'row', minHeight: 28, marginBottom: 4, borderRadius: 5, overflow: 'hidden' },
  rowNormal:      { backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
  rowAlt:         { backgroundColor: C.bg,    borderWidth: 1, borderColor: C.border },
  rowBreak:       { backgroundColor: C.breakBg, borderWidth: 1, borderColor: '#FDE68A' },

  timeCol:        { width: 68, paddingHorizontal: 8, paddingVertical: 6, justifyContent: 'center', alignItems: 'flex-end', backgroundColor: 'rgba(0,0,0,0.03)' },
  timeText:       { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.blue },
  timeBreak:      { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.amber },

  divCol:         { width: 3, backgroundColor: C.blue, opacity: 0.15 },
  divColBreak:    { width: 3, backgroundColor: C.amber },

  mainCol:        { flex: 1, paddingHorizontal: 10, paddingVertical: 5, justifyContent: 'center' },
  blockTitle:     { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.navy },
  blockBreak:     { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.breakText },
  blockDesc:      { fontSize: 9, color: C.gray, marginTop: 2, lineHeight: 1.4 },
  instrText:      { fontSize: 9, color: C.blueMid, fontFamily: 'Helvetica-Bold', marginTop: 2 },

  // ── Footer ────────────────────────────────────────────────
  footer:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    paddingHorizontal: 28, paddingBottom: 10, paddingTop: 4 },
  footerLine:     { backgroundColor: C.gold, height: 2 },
  footerText:     { fontSize: 8, color: C.grayLight },
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

  const { data: course } = await supabase
    .from('courses')
    .select('name, location, start_date, end_date')
    .eq('id', program.course_id)
    .single()

  const courseName = course?.name ?? ''
  const courseLocation = course?.location ?? ''

  program.modules?.sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index)
  program.modules?.forEach((m: { days?: { order_index: number; blocks?: { order_index: number }[] }[] }) => {
    m.days?.sort((a, b) => a.order_index - b.order_index)
    m.days?.forEach(d => {
      d.blocks?.sort((a: { start_time?: string | null; order_index: number }, b: { start_time?: string | null; order_index: number }) => {
        if (!a.start_time && !b.start_time) return a.order_index - b.order_index
        if (!a.start_time) return 1
        if (!b.start_time) return -1
        return a.start_time.localeCompare(b.start_time)
      })
    })
  })

  const modules = program.modules as (ProgramModule & { days: (ProgramDay & { blocks: ProgramBlock[] })[] })[]

  // Calcola range date dalle giornate del programma
  const allDates = modules.flatMap(m => m.days ?? []).map(d => d.day_date).filter(Boolean) as string[]
  allDates.sort()
  const dateFrom = allDates[0] ?? null
  const dateTo = allDates[allDates.length - 1] ?? null
  const dateRange = dateFrom
    ? (dateTo && dateTo !== dateFrom
        ? `${formatDateShort(dateFrom)} – ${formatDateShort(dateTo)}`
        : formatDateLong(dateFrom))
    : ''

  const generatedOn = new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

  const PdfDoc = () => (
    <Document title={program.title} author="CoachLab">
      {/* ── Copertina ──────────────────────────────────── */}
      <Page size="A4" orientation="landscape" style={styles.coverPage}>
        <View style={styles.coverTopBar} />
        <View style={styles.coverBody}>
          <Text style={styles.coverOverline}>CoachLab — Programma del corso</Text>
          <Text style={styles.coverTitle}>{program.title}</Text>
          <Text style={styles.coverCourse}>{courseName}</Text>
          {courseLocation ? <Text style={styles.coverLocation}>{courseLocation}</Text> : null}
          {dateRange ? <Text style={styles.coverDates}>{dateRange}</Text> : null}
          <View style={styles.coverDivider} />
          <View style={styles.coverFooter}>
            <Text style={styles.coverBrand}>COACHLAB</Text>
            <Text style={styles.coverGenDate}>Generato il {generatedOn}</Text>
          </View>
        </View>
        <View style={styles.coverBottomBar} />
      </Page>

      {/* ── Una pagina per ogni giornata ───────────────── */}
      {modules.flatMap(mod =>
        (mod.days ?? []).map(day => {
          const blocks = day.blocks ?? []
          const dayTitleText = day.title || 'Giornata'
          const dayDateText = day.day_date ? formatDateLong(day.day_date) : ''
          const modLabel = `${MODULE_TYPE_LABELS[mod.type] || mod.type} — ${mod.title}`

          return (
            <Page key={day.id} size="A4" orientation="landscape" style={styles.dayPage}>
              {/* Header */}
              <View style={styles.dayHeader}>
                <View style={styles.dayModBadge}>
                  <Text style={styles.dayModText}>{modLabel}</Text>
                </View>
                <View style={styles.dayTitleBlock}>
                  <Text style={styles.dayTitle}>{dayTitleText}</Text>
                  {dayDateText ? <Text style={styles.dayDate}>{dayDateText}</Text> : null}
                </View>
                <Text style={styles.dayBrand}>COACHLAB</Text>
              </View>

              {/* Fasce orarie */}
              <View style={styles.content}>
                {blocks.length === 0 ? (
                  <Text style={styles.emptyMsg}>Nessuna fascia oraria definita per questa giornata</Text>
                ) : null}
                {blocks.map((b, i) => {
                  const timeStr = b.start_time
                    ? `${formatTime(b.start_time)}${b.end_time ? `–${formatTime(b.end_time)}` : ''}`
                    : ''
                  const instrName = !studentView
                    ? (b.instructor_name || (b as { instructor?: { full_name: string } }).instructor?.full_name || '')
                    : ''
                  const rowStyle = b.is_break ? styles.rowBreak : (i % 2 === 0 ? styles.rowNormal : styles.rowAlt)

                  return (
                    <View key={b.id} style={[styles.row, rowStyle]}>
                      <View style={styles.timeCol}>
                        <Text style={b.is_break ? styles.timeBreak : styles.timeText}>{timeStr || '—'}</Text>
                      </View>
                      <View style={b.is_break ? styles.divColBreak : styles.divCol} />
                      <View style={styles.mainCol}>
                        <Text style={b.is_break ? styles.blockBreak : styles.blockTitle}>{b.title}</Text>
                        {b.description && !b.is_break ? <Text style={styles.blockDesc}>{b.description}</Text> : null}
                        {instrName ? <Text style={styles.instrText}>{instrName}</Text> : null}
                      </View>
                    </View>
                  )
                })}
              </View>

              {/* Footer */}
              <View style={styles.footerLine} />
              <View style={styles.footer}>
                <Text style={styles.footerText}>{courseName}{courseLocation ? ` — ${courseLocation}` : ''}</Text>
                <Text style={styles.footerText}>{program.title}</Text>
                <Text style={styles.footerText}>CoachLab — {generatedOn}</Text>
              </View>
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
