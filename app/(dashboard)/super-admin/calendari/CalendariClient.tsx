'use client'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  eventi: any[]
  corsi: { id: string; name: string }[]
  docenti: { id: string; full_name: string | null }[]
}

export default function CalendariClient({ eventi, corsi, docenti }: Props) {
  const [filtroCorso, setFiltroCorso] = useState('')
  const [filtroDocente, setFiltroDocente] = useState('')
  const [settimanaOffset, setSettimanaOffset] = useState(0)

  const oggi = new Date()
  const lunedi = new Date(oggi)
  const dayOfWeek = oggi.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  lunedi.setDate(oggi.getDate() + diff + settimanaOffset * 7)

  const giorni = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunedi)
    d.setDate(lunedi.getDate() + i)
    return d
  })

  const eventiFiltered = eventi.filter(e => {
    if (filtroCorso && e.corso_id !== filtroCorso) return false
    if (filtroDocente && !e.docenti?.some((d: any) => d.docente_id === filtroDocente)) return false
    return true
  })

  const eventiPerGiorno = (data: Date) => {
    const dataStr = data.toISOString().split('T')[0]
    return eventiFiltered.filter(e => e.data === dataStr)
  }

  const formatOra = (t: string) => t?.slice(0, 5) ?? ''

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: '#1B3768' }}>Calendari</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setSettimanaOffset(p => p - 1)}
            className="p-2 rounded-lg hover:bg-white/40 transition">
            <ChevronLeft size={18} style={{ color: '#1B3768' }} />
          </button>
          <span className="text-sm font-medium px-3" style={{ color: '#1B3768' }}>
            {lunedi.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })} —{' '}
            {giorni[6].toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => setSettimanaOffset(p => p + 1)}
            className="p-2 rounded-lg hover:bg-white/40 transition">
            <ChevronRight size={18} style={{ color: '#1B3768' }} />
          </button>
          <button onClick={() => setSettimanaOffset(0)}
            className="text-xs px-3 py-1.5 rounded-lg ml-2"
            style={{ background: 'rgba(27,55,104,0.08)', color: '#1B3768' }}>
            Oggi
          </button>
        </div>
      </div>

      {/* Filtri */}
      <div className="flex gap-3">
        <select value={filtroCorso} onChange={e => setFiltroCorso(e.target.value)}
          className="text-xs rounded-lg px-3 py-2 border"
          style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768', background: 'white' }}>
          <option value="">Tutti i corsi</option>
          {corsi.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filtroDocente} onChange={e => setFiltroDocente(e.target.value)}
          className="text-xs rounded-lg px-3 py-2 border"
          style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768', background: 'white' }}>
          <option value="">Tutti i docenti</option>
          {docenti.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
        </select>
      </div>

      {/* Griglia settimanale */}
      <div className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(27,55,104,0.1)', background: 'rgba(255,255,255,0.5)' }}>
        {/* Header giorni */}
        <div className="grid grid-cols-7 border-b" style={{ borderColor: 'rgba(27,55,104,0.08)' }}>
          {giorni.map((g, i) => {
            const isOggi = g.toDateString() === oggi.toDateString()
            return (
              <div key={i} className="p-3 text-center border-r last:border-r-0"
                style={{ borderColor: 'rgba(27,55,104,0.06)' }}>
                <p className="text-xs capitalize" style={{ color: 'rgba(27,55,104,0.5)' }}>
                  {g.toLocaleDateString('it-IT', { weekday: 'short' })}
                </p>
                <p className="text-sm font-semibold mt-0.5 w-7 h-7 rounded-full flex items-center justify-center mx-auto"
                  style={{
                    color: isOggi ? 'white' : '#1B3768',
                    background: isOggi ? '#0891B2' : 'transparent',
                  }}>
                  {g.getDate()}
                </p>
              </div>
            )
          })}
        </div>

        {/* Celle eventi */}
        <div className="grid grid-cols-7 min-h-48">
          {giorni.map((g, i) => {
            const evs = eventiPerGiorno(g)
            return (
              <div key={i} className="border-r last:border-r-0 p-2 space-y-1"
                style={{ borderColor: 'rgba(27,55,104,0.06)' }}>
                {evs.map((ev: any) => (
                  <div key={ev.id} className="rounded-lg p-2 text-xs"
                    style={{ background: 'rgba(8,145,178,0.1)', borderLeft: '3px solid #0891B2' }}>
                    <p className="font-semibold truncate" style={{ color: '#1B3768' }}>{ev.materia}</p>
                    <p style={{ color: 'rgba(27,55,104,0.6)' }}>
                      {formatOra(ev.ora_inizio)}–{formatOra(ev.ora_fine)}
                    </p>
                    <p className="truncate" style={{ color: 'rgba(27,55,104,0.5)' }}>
                      {ev.corso?.name}
                    </p>
                    {ev.docenti?.map((d: any) => (
                      <p key={d.docente_id} className="truncate" style={{ color: 'rgba(27,55,104,0.5)' }}>
                        {d.profile?.full_name}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
