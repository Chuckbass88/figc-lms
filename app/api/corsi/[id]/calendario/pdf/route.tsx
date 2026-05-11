import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import type { CorsoEvento } from '@/lib/types'

type Params = { params: Promise<{ id: string }> }

const C = {
  navy: '#1B3768', cta: '#1EB8E5', white: '#FFFFFF',
  gray: '#6B7280', grayLight: '#E5E7EB', bg: '#F8FAFC',
}

const styles = StyleSheet.create({
  page: { backgroundColor: C.white, flexDirection: 'column', fontFamily: 'Helvetica' },
  header: { backgroundColor: C.navy, paddingHorizontal: 24, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.white },
  headerSub: { fontSize: 9, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  headerBrand: { fontSize: 9, color: C.cta, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  tableWrap: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  table: { borderWidth: 1, borderColor: C.grayLight, borderRadius: 4 },
  thead: { flexDirection: 'row', backgroundColor: 'rgba(27,55,104,0.06)', borderBottomWidth: 1, borderBottomColor: C.grayLight },
  thWeek: { width: 64, paddingHorizontal: 6, paddingVertical: 5 },
  thDay: { flex: 1, paddingHorizontal: 4, paddingVertical: 5, alignItems: 'center' },
  thText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.navy },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.grayLight, minHeight: 36 },
  trAlt: { backgroundColor: C.bg },
  tdWeek: { width: 64, paddingHorizontal: 6, paddingVertical: 4, borderRightWidth: 1, borderRightColor: C.grayLight },
  tdDay: { flex: 1, paddingHorizontal: 3, paddingVertical: 3, borderRightWidth: 1, borderRightColor: C.grayLight },
  tdDayLast: { flex: 1, paddingHorizontal: 3, paddingVertical: 3 },
  weekNum: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.navy },
  weekRange: { fontSize: 7, color: C.gray, marginTop: 1 },
  dayNum: { fontSize: 7, color: C.gray, textAlign: 'center', marginBottom: 2 },
  eventChip: { backgroundColor: 'rgba(27,55,104,0.08)', borderRadius: 2, paddingHorizontal: 3, paddingVertical: 2, marginBottom: 2 },
  eventMateria: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.navy },
  eventTime: { fontSize: 6, color: C.gray },
  footer: { paddingHorizontal: 16, paddingVertical: 6, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.grayLight },
  footerText: { fontSize: 7, color: C.gray },
})

function getMonday(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const m = new Date(d)
  m.setDate(d.getDate() + diff)
  return m
}

function toISO(d: Date): string { return d.toISOString().split('T')[0] }
function fmtTime(t: string): string { return t.slice(0, 5) }
function fmtWeekRange(mon: Date): string {
  const sat = new Date(mon)
  sat.setDate(mon.getDate() + 5)
  const o: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${mon.toLocaleDateString('it-IT', o)}–${sat.toLocaleDateString('it-IT', o)}`
}

const WEEKS_PER_PAGE = 4
const DAYS_HDR = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

interface PdfDocProps {
  corso: { id: string; name: string; location: string | null }
  eventi: CorsoEvento[]
}

function buildPdfDoc({ corso, eventi }: PdfDocProps) {
  const eventiPerData = new Map<string, CorsoEvento[]>()
  eventi.forEach(ev => {
    const list = eventiPerData.get(ev.data) ?? []
    list.push(ev)
    eventiPerData.set(ev.data, list)
  })

  const firstDate = eventi.length > 0 ? new Date(eventi[0].data + 'T12:00:00') : new Date()
  const lastDate = eventi.length > 0 ? new Date(eventi[eventi.length - 1].data + 'T12:00:00') : new Date()
  const startMon = getMonday(firstDate)

  const totalWeeks = Math.max(1, Math.ceil(
    (lastDate.getTime() - startMon.getTime()) / (7 * 24 * 3600 * 1000) + 1
  ))
  const totalPages = Math.max(1, Math.ceil(totalWeeks / WEEKS_PER_PAGE))

  const generatedOn = new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <Document title={`Calendario — ${corso.name}`} author="CoachLab">
      {Array.from({ length: totalPages }, (_, pi) => {
        const weeksOnPage: Date[] = []
        for (let w = 0; w < WEEKS_PER_PAGE; w++) {
          const mon = new Date(startMon)
          mon.setDate(startMon.getDate() + (pi * WEEKS_PER_PAGE + w) * 7)
          weeksOnPage.push(mon)
        }
        return (
          <Page key={pi} size="A4" orientation="landscape" style={styles.page}>
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>{corso.name}</Text>
                {corso.location ? <Text style={styles.headerSub}>{corso.location}</Text> : null}
              </View>
              <Text style={styles.headerBrand}>COACHLAB — Calendario</Text>
            </View>

            <View style={styles.tableWrap}>
              <View style={styles.table}>
                <View style={styles.thead}>
                  <View style={styles.thWeek}><Text style={styles.thText}>SETTIMANA</Text></View>
                  {DAYS_HDR.map(d => (
                    <View key={d} style={styles.thDay}><Text style={styles.thText}>{d}</Text></View>
                  ))}
                </View>
                <View>
                  {weeksOnPage.map((monday, wi) => {
                    const weekDates = [0, 1, 2, 3, 4, 5].map(i => {
                      const d = new Date(monday)
                      d.setDate(monday.getDate() + i)
                      return d
                    })
                    const isAlt = wi % 2 !== 0
                    return (
                      <View key={wi} style={[styles.tr, isAlt ? styles.trAlt : {}]}>
                        <View style={styles.tdWeek}>
                          <Text style={styles.weekNum}>Sett {pi * WEEKS_PER_PAGE + wi + 1}</Text>
                          <Text style={styles.weekRange}>{fmtWeekRange(monday)}</Text>
                        </View>
                        {weekDates.map((date, di) => {
                          const dateStr = toISO(date)
                          const dayEvts = eventiPerData.get(dateStr) ?? []
                          const isLast = di === 5
                          return (
                            <View key={di} style={isLast ? styles.tdDayLast : styles.tdDay}>
                              <Text style={styles.dayNum}>{date.getDate()}</Text>
                              {dayEvts.map((ev, ei) => (
                                <View key={ei} style={styles.eventChip}>
                                  <Text style={styles.eventMateria}>{ev.materia}</Text>
                                  <Text style={styles.eventTime}>{fmtTime(ev.ora_inizio)}–{fmtTime(ev.ora_fine)}</Text>
                                </View>
                              ))}
                            </View>
                          )
                        })}
                      </View>
                    )
                  })}
                </View>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>{corso.name}{corso.location ? ` — ${corso.location}` : ''}</Text>
              <Text style={styles.footerText}>Pagina {pi + 1} di {totalPages}</Text>
              <Text style={styles.footerText}>Generato il {generatedOn} — CoachLab</Text>
            </View>
          </Page>
        )
      })}
    </Document>
  )
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: corsoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: corso } = await supabase.from('courses')
    .select('id, name, location').eq('id', corsoId).single()
  if (!corso) return NextResponse.json({ error: 'Corso non trovato' }, { status: 404 })

  const { data: eventiRaw } = await supabase.from('corso_eventi')
    .select('*').eq('corso_id', corsoId).order('data').order('ora_inizio')
  const eventi = (eventiRaw ?? []) as CorsoEvento[]

  const buffer = await renderToBuffer(buildPdfDoc({ corso, eventi }))
  const filename = encodeURIComponent(`Calendario-${corso.name}.pdf`)

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
