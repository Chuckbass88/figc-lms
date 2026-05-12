'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Users } from 'lucide-react'

interface Corso {
  id: string
  name: string
  regione: string | null
  tipo_corso: string | null
  cu_number: string | null
  cu_url: string | null
  end_date: string | null
  docente: string | null
  iscritti: number
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysLeft(iso: string | null): number | null {
  if (!iso) return null
  const diff = new Date(iso + 'T00:00:00').getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function CorsiAttiviTable({ corsi }: { corsi: Corso[] }) {
  const [filtroRegione, setFiltroRegione] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')

  const regioni = [...new Set(corsi.map(c => c.regione).filter(Boolean))] as string[]
  const tipi = [...new Set(corsi.map(c => c.tipo_corso).filter(Boolean))] as string[]

  const filtrati = corsi.filter(c => {
    if (filtroRegione && c.regione !== filtroRegione) return false
    if (filtroTipo && c.tipo_corso !== filtroTipo) return false
    return true
  })

  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(27,55,104,0.12)', background: 'rgba(255,255,255,0.55)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(27,55,104,0.08)' }}>
        <h2 className="text-sm font-semibold" style={{ color: '#1B3768' }}>
          Corsi attivi ({filtrati.length}{filtrati.length !== corsi.length ? ` di ${corsi.length}` : ''})
        </h2>
        <div className="flex gap-2">
          <select value={filtroRegione} onChange={e => setFiltroRegione(e.target.value)}
            className="text-xs rounded-lg px-2 py-1 border"
            style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768', background: 'white' }}>
            <option value="">Tutte le regioni</option>
            {regioni.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            className="text-xs rounded-lg px-2 py-1 border"
            style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768', background: 'white' }}>
            <option value="">Tutti i tipi</option>
            {tipi.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'rgba(27,55,104,0.04)' }}>
              <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: '#1B3768' }}>#</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: '#1B3768' }}>Nome corso</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: '#1B3768' }}>Regione</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: '#1B3768' }}>Tipo</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: '#1B3768' }}>Docente</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: '#1B3768' }}>Fine corso</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: '#1B3768' }}>Iscritti</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: '#1B3768' }}>CU</th>
            </tr>
          </thead>
          <tbody>
            {filtrati.map((corso, i) => {
              const dl = daysLeft(corso.end_date)
              const endUrgent = dl !== null && dl <= 14 && dl >= 0
              const endPast = dl !== null && dl < 0
              return (
                <tr key={corso.id} className="border-t hover:bg-white/60 transition-colors"
                  style={{ borderColor: 'rgba(27,55,104,0.06)' }}>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'rgba(27,55,104,0.5)' }}>{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <Link href={`/super-admin/corsi/${corso.id}`} className="font-medium hover:underline" style={{ color: '#1B3768' }}>
                      {corso.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: '#1B3768' }}>
                    {corso.regione ?? <span style={{ color: 'rgba(27,55,104,0.35)' }}>—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs capitalize" style={{ color: '#1B3768' }}>
                    {corso.tipo_corso ?? <span style={{ color: 'rgba(27,55,104,0.35)' }}>—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: '#1B3768' }}>
                    {corso.docente ?? <span style={{ color: 'rgba(27,55,104,0.35)' }}>—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {corso.end_date ? (
                      <span className={endPast ? 'line-through opacity-50' : endUrgent ? 'font-semibold' : ''}
                        style={{ color: endUrgent ? '#D97706' : '#1B3768' }}>
                        {formatDate(corso.end_date)}
                        {dl !== null && dl >= 0 && dl <= 30 && (
                          <span className="ml-1 text-[10px]" style={{ color: endUrgent ? '#D97706' : 'rgba(27,55,104,0.4)' }}>
                            ({dl === 0 ? 'oggi' : `${dl}gg`})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span style={{ color: 'rgba(27,55,104,0.35)' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    <span className="flex items-center gap-1" style={{ color: '#1B3768' }}>
                      <Users size={10} style={{ color: 'rgba(27,55,104,0.4)' }} />
                      {corso.iscritti}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {corso.cu_number && corso.cu_url ? (
                      <a href={corso.cu_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:underline" style={{ color: '#0891B2' }}>
                        {corso.cu_number}<ExternalLink size={11} />
                      </a>
                    ) : corso.cu_number ? (
                      <span style={{ color: '#1B3768' }}>{corso.cu_number}</span>
                    ) : (
                      <span style={{ color: 'rgba(27,55,104,0.35)' }}>—</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtrati.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-sm" style={{ color: 'rgba(27,55,104,0.4)' }}>
                  Nessun corso trovato con i filtri selezionati
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
