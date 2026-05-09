'use client'
import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Clock, MapPin, BookOpen, User } from 'lucide-react'

interface Props {
  eventi: any[]
  corsi: { id: string; name: string }[]
  docenti: { id: string; full_name: string | null }[]
}

const COURSE_COLORS = [
  { bg: 'rgba(30,184,229,0.15)', border: '#1EB8E5', text: '#0077A3' },
  { bg: 'rgba(99,102,241,0.15)', border: '#6366F1', text: '#4338CA' },
  { bg: 'rgba(16,185,129,0.15)', border: '#10B981', text: '#047857' },
  { bg: 'rgba(245,158,11,0.15)', border: '#F59E0B', text: '#92400E' },
  { bg: 'rgba(239,68,68,0.15)', border: '#EF4444', text: '#B91C1C' },
  { bg: 'rgba(168,85,247,0.15)', border: '#A855F7', text: '#7E22CE' },
]

const GIORNI_SETTIMANA = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
]

function dateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function CalendariClient({ eventi, corsi, docenti }: Props) {
  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)
  const oggiStr = dateStr(oggi)

  const [anno, setAnno] = useState(oggi.getFullYear())
  const [mese, setMese] = useState(oggi.getMonth()) // 0-indexed
  const [filtroCorso, setFiltroCorso] = useState('')
  const [filtroDocente, setFiltroDocente] = useState('')
  const [giornoSelezionato, setGiornoSelezionato] = useState<string>(oggiStr)

  // Map course id → color index
  const corsoColorMap = useMemo(() => {
    const map: Record<string, number> = {}
    corsi.forEach((c, i) => { map[c.id] = i % COURSE_COLORS.length })
    return map
  }, [corsi])

  const eventiFiltered = eventi.filter(e => {
    if (filtroCorso && e.corso_id !== filtroCorso) return false
    if (filtroDocente && !e.docenti?.some((d: any) => d.docente_id === filtroDocente)) return false
    return true
  })

  // Build calendar grid: always start on Monday
  const primoGiorno = new Date(anno, mese, 1)
  const ultimoGiorno = new Date(anno, mese + 1, 0)

  // Day of week for first day (0=Sun, 1=Mon...) → shift to Mon=0
  let startDow = primoGiorno.getDay() // 0=Sun
  startDow = startDow === 0 ? 6 : startDow - 1 // Mon=0, Sun=6

  // Total cells = startDow + days in month, rounded up to multiple of 7
  const totalCells = Math.ceil((startDow + ultimoGiorno.getDate()) / 7) * 7

  const cells: Date[] = []
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(anno, mese, 1 - startDow + i)
    cells.push(d)
  }

  function prevMese() {
    if (mese === 0) { setMese(11); setAnno(a => a - 1) }
    else setMese(m => m - 1)
  }
  function nextMese() {
    if (mese === 11) { setMese(0); setAnno(a => a + 1) }
    else setMese(m => m + 1)
  }
  function tornaOggi() {
    setAnno(oggi.getFullYear())
    setMese(oggi.getMonth())
    setGiornoSelezionato(oggiStr)
  }

  const eventiPerGiorno = (ds: string) =>
    eventiFiltered.filter(e => e.data === ds)

  const eventiGiornoSel = eventiPerGiorno(giornoSelezionato)

  const formatOra = (t: string) => t?.slice(0, 5) ?? ''

  // Parse giornoSelezionato for display
  const [gAnno, gMese, gGiorno] = giornoSelezionato.split('-').map(Number)
  const dataSelDisplay = new Date(gAnno, gMese - 1, gGiorno)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={prevMese}
            className="p-2 rounded-lg hover:bg-white/60 transition border"
            style={{ borderColor: 'rgba(27,55,104,0.12)' }}>
            <ChevronLeft size={16} style={{ color: '#1B3768' }} />
          </button>
          <h1 className="text-lg font-bold min-w-[160px] text-center" style={{ color: '#1B3768' }}>
            {MESI[mese]} {anno}
          </h1>
          <button onClick={nextMese}
            className="p-2 rounded-lg hover:bg-white/60 transition border"
            style={{ borderColor: 'rgba(27,55,104,0.12)' }}>
            <ChevronRight size={16} style={{ color: '#1B3768' }} />
          </button>
          <button onClick={tornaOggi}
            className="text-xs px-3 py-1.5 rounded-lg ml-1 font-medium transition hover:opacity-80"
            style={{ background: 'rgba(27,55,104,0.08)', color: '#1B3768' }}>
            Oggi
          </button>
        </div>

        {/* Filtri */}
        <div className="flex gap-2 flex-wrap">
          <select value={filtroCorso} onChange={e => setFiltroCorso(e.target.value)}
            className="text-xs rounded-lg px-3 py-2 border bg-white"
            style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }}>
            <option value="">Tutti i corsi</option>
            {corsi.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filtroDocente} onChange={e => setFiltroDocente(e.target.value)}
            className="text-xs rounded-lg px-3 py-2 border bg-white"
            style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }}>
            <option value="">Tutti i docenti</option>
            {docenti.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
          </select>
        </div>
      </div>

      {/* Layout: griglia + pannello dettaglio */}
      <div className="flex gap-4 items-start">
        {/* Griglia mensile */}
        <div className="flex-1 min-w-0 rounded-2xl overflow-hidden bg-white"
          style={{ border: '1px solid rgba(27,55,104,0.1)' }}>
          {/* Intestazione giorni settimana */}
          <div className="grid grid-cols-7 border-b" style={{ borderColor: 'rgba(27,55,104,0.08)' }}>
            {GIORNI_SETTIMANA.map(g => (
              <div key={g} className="py-2.5 text-center">
                <span className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'rgba(27,55,104,0.5)' }}>
                  {g}
                </span>
              </div>
            ))}
          </div>

          {/* Celle */}
          <div className="grid grid-cols-7">
            {cells.map((d, i) => {
              const ds = dateStr(d)
              const isCurrentMonth = d.getMonth() === mese && d.getFullYear() === anno
              const isOggi = ds === oggiStr
              const isSelected = ds === giornoSelezionato
              const evs = eventiPerGiorno(ds)
              const MAX_VISIBLE = 2

              return (
                <div key={i}
                  onClick={() => setGiornoSelezionato(ds)}
                  className={`min-h-[90px] p-1.5 border-r border-b last:border-r-0 cursor-pointer transition-colors
                    ${isSelected ? 'bg-blue-50/60' : 'hover:bg-gray-50/80'}`}
                  style={{ borderColor: 'rgba(27,55,104,0.06)' }}>
                  {/* Numero giorno */}
                  <div className="flex justify-end mb-1">
                    <span
                      className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full transition
                        ${isOggi ? 'text-white' : isCurrentMonth ? '' : 'opacity-30'}
                        ${isSelected && !isOggi ? 'ring-2 ring-offset-1' : ''}`}
                      style={{
                        backgroundColor: isOggi ? '#1EB8E5' : 'transparent',
                        color: isOggi ? 'white' : '#1B3768',
                        outline: isSelected && !isOggi ? '2px solid #1EB8E5' : undefined,
                        outlineOffset: isSelected && !isOggi ? '1px' : undefined,
                      }}>
                      {d.getDate()}
                    </span>
                  </div>

                  {/* Chip eventi */}
                  <div className="space-y-0.5">
                    {evs.slice(0, MAX_VISIBLE).map((ev: any) => {
                      const colIdx = corsoColorMap[ev.corso_id] ?? 0
                      const col = COURSE_COLORS[colIdx]
                      return (
                        <div key={ev.id}
                          className="rounded px-1.5 py-0.5 text-[10px] font-medium truncate leading-tight"
                          style={{ background: col.bg, borderLeft: `2px solid ${col.border}`, color: col.text }}>
                          {formatOra(ev.ora_inizio)} {ev.materia ?? ev.corso?.name ?? 'Evento'}
                        </div>
                      )
                    })}
                    {evs.length > MAX_VISIBLE && (
                      <div className="text-[10px] font-medium px-1.5"
                        style={{ color: 'rgba(27,55,104,0.5)' }}>
                        +{evs.length - MAX_VISIBLE} altri
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pannello dettaglio giorno */}
        <div className="w-72 flex-shrink-0 rounded-2xl bg-white overflow-hidden"
          style={{ border: '1px solid rgba(27,55,104,0.1)' }}>
          {/* Header pannello */}
          <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(27,55,104,0.08)' }}>
            <p className="text-xs font-medium uppercase tracking-wide"
              style={{ color: 'rgba(27,55,104,0.45)' }}>
              {dataSelDisplay.toLocaleDateString('it-IT', { weekday: 'long' })}
            </p>
            <p className="text-xl font-bold" style={{ color: '#1B3768' }}>
              {dataSelDisplay.getDate()}{' '}
              <span className="text-base font-semibold">
                {MESI[dataSelDisplay.getMonth()]}
              </span>
            </p>
          </div>

          {/* Elenco eventi del giorno */}
          <div className="divide-y overflow-y-auto max-h-[480px]"
            style={{ borderColor: 'rgba(27,55,104,0.06)' }}>
            {eventiGiornoSel.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm" style={{ color: 'rgba(27,55,104,0.35)' }}>
                  Nessun evento
                </p>
              </div>
            ) : eventiGiornoSel.map((ev: any) => {
              const colIdx = corsoColorMap[ev.corso_id] ?? 0
              const col = COURSE_COLORS[colIdx]
              const docentiEv: string[] = ev.docenti
                ?.map((d: any) => d.profile?.full_name)
                .filter(Boolean) ?? []

              return (
                <div key={ev.id} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <div className="w-1 rounded-full flex-shrink-0 mt-1 self-stretch"
                      style={{ backgroundColor: col.border, minHeight: 32 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: '#1B3768' }}>
                        {ev.materia ?? 'Evento'}
                      </p>
                      <div className="mt-1 space-y-0.5">
                        {(ev.ora_inizio || ev.ora_fine) && (
                          <div className="flex items-center gap-1">
                            <Clock size={11} style={{ color: col.border }} />
                            <span className="text-xs" style={{ color: 'rgba(27,55,104,0.6)' }}>
                              {formatOra(ev.ora_inizio)}–{formatOra(ev.ora_fine)}
                            </span>
                          </div>
                        )}
                        {ev.corso?.name && (
                          <div className="flex items-center gap-1">
                            <BookOpen size={11} style={{ color: col.border }} />
                            <span className="text-xs truncate" style={{ color: 'rgba(27,55,104,0.6)' }}>
                              {ev.corso.name}
                            </span>
                          </div>
                        )}
                        {ev.luogo && (
                          <div className="flex items-center gap-1">
                            <MapPin size={11} style={{ color: col.border }} />
                            <span className="text-xs truncate" style={{ color: 'rgba(27,55,104,0.6)' }}>
                              {ev.luogo}
                            </span>
                          </div>
                        )}
                        {docentiEv.length > 0 && (
                          <div className="flex items-center gap-1">
                            <User size={11} style={{ color: col.border }} />
                            <span className="text-xs truncate" style={{ color: 'rgba(27,55,104,0.6)' }}>
                              {docentiEv.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
