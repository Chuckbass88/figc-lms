import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
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

interface CorsoData {
  id: string
  name: string
  location: string | null
}

function buildPdfDoc(corso: CorsoData, eventi: CorsoEvento[]) {
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

  return React.createElement(
    Document,
    { title: `Calendario — ${corso.name}`, author: 'CoachLab' },
    ...Array.from({ length: totalPages }, (_, pi) => {
      const weeksOnPage: Date[] = []
      for (let w = 0; w < WEEKS_PER_PAGE; w++) {
        const mon = new Date(startMon)
        mon.setDate(startMon.getDate() + (pi * WEEKS_PER_PAGE + w) * 7)
        weeksOnPage.push(mon)
      }

      return React.createElement(
        Page,
        { key: pi, size: 'A4', orientation: 'landscape', style: styles.page },
        React.createElement(
          View,
          { style: styles.header },
          React.createElement(
            View,
            null,
            React.createElement(Text, { style: styles.headerTitle }, corso.name),
            corso.location
              ? React.createElement(Text, { style: styles.headerSub }, corso.location)
              : null
          ),
          React.createElement(Text, { style: styles.headerBrand }, 'COACHLAB — Calendario')
        ),
        React.createElement(
          View,
          { style: styles.tableWrap },
          React.createElement(
            View,
            { style: styles.table },
            React.createElement(
              View,
              { style: styles.thead },
              React.createElement(View, { style: styles.thWeek },
                React.createElement(Text, { style: styles.thText }, 'SETTIMANA')
              ),
              ...DAYS_HDR.map(d =>
                React.createElement(View, { key: d, style: styles.thDay },
                  React.createElement(Text, { style: styles.thText }, d)
                )
              )
            ),
            React.createElement(
              View,
              null,
              ...weeksOnPage.map((monday, wi) => {
                const weekDates = [0, 1, 2, 3, 4, 5].map(i => {
                  const d = new Date(monday)
                  d.setDate(monday.getDate() + i)
                  return d
                })
                const isAlt = wi % 2 !== 0
                return React.createElement(
                  View,
                  { key: wi, style: [styles.tr, ...(isAlt ? [styles.trAlt] : [])] },
                  React.createElement(
                    View,
                    { style: styles.tdWeek },
                    React.createElement(Text, { style: styles.weekNum }, `Sett ${pi * WEEKS_PER_PAGE + wi + 1}`),
                    React.createElement(Text, { style: styles.weekRange }, fmtWeekRange(monday))
                  ),
                  ...weekDates.map((date, di) => {
                    const dateStr = toISO(date)
                    const dayEvts = eventiPerData.get(dateStr) ?? []
                    const isLast = di === 5
                    return React.createElement(
                      View,
                      { key: di, style: isLast ? styles.tdDayLast : styles.tdDay },
                      React.createElement(Text, { style: styles.dayNum }, String(date.getDate())),
                      ...dayEvts.map((ev, ei) =>
                        React.createElement(
                          View,
                          { key: ei, style: styles.eventChip },
                          React.createElement(Text, { style: styles.eventMateria }, ev.materia),
                          React.createElement(Text, { style: styles.eventTime }, `${fmtTime(ev.ora_inizio)}–${fmtTime(ev.ora_fine)}`)
                        )
                      )
                    )
                  })
                )
              })
            )
          )
        ),
        React.createElement(
          View,
          { style: styles.footer },
          React.createElement(Text, { style: styles.footerText }, `${corso.name}${corso.location ? ` — ${corso.location}` : ''}`),
          React.createElement(Text, { style: styles.footerText }, `Pagina ${pi + 1} di ${totalPages}`),
          React.createElement(Text, { style: styles.footerText }, `Generato il ${generatedOn} — CoachLab`)
        )
      )
    })
  )
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id: corsoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'admin', 'docente'].includes(profile.role)) {
    return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
  }

  const { email } = await req.json()
  if (!email?.trim()) return NextResponse.json({ error: 'Email obbligatoria' }, { status: 400 })

  const { data: corso } = await supabase.from('courses')
    .select('id, name, location').eq('id', corsoId).single()
  if (!corso) return NextResponse.json({ error: 'Corso non trovato' }, { status: 404 })

  const { data: eventiRaw } = await supabase.from('corso_eventi')
    .select('*').eq('corso_id', corsoId).order('data').order('ora_inizio')
  const eventi = (eventiRaw ?? []) as CorsoEvento[]

  const pdfBuffer = await renderToBuffer(buildPdfDoc(corso, eventi))

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.log('[calendario/invia] RESEND_API_KEY non configurata')
    return NextResponse.json({ success: true, warning: 'Email non configurata' })
  }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)
    const FROM = process.env.RESEND_FROM ?? 'CoachLab <noreply@coachlab.it>'
    const { error } = await resend.emails.send({
      from: FROM,
      to: [email.trim()],
      subject: `Calendario corso: ${corso.name}`,
      html: `<p>In allegato il calendario del corso <strong>${corso.name}</strong>.</p><p>CoachLab</p>`,
      attachments: [{
        filename: `Calendario-${corso.name}.pdf`,
        content: pdfBuffer,
      }],
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
