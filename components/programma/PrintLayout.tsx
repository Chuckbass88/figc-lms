import type { CorsoEvento, CorsoPresenza } from '@/lib/types'

interface Student { id: string; full_name: string }

interface Props {
  corseName: string
  corseLocation?: string | null
  corseStartDate?: string | null
  corseEndDate?: string | null
  eventi: CorsoEvento[]
  presenze: CorsoPresenza[]
  studenti: Student[]
  sections: { elenco: boolean; presenze: boolean }
}

const DOW_IT   = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
const MONTH_IT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']

function fmtDate(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return `${DOW_IT[d.getDay()]} ${d.getDate()} ${MONTH_IT[d.getMonth()]} ${d.getFullYear()}`
}
function fmtTime(t: string) { return t.slice(0, 5) }
function fmtShortDate(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return `${d.getDate()}/${d.getMonth() + 1}`
}

function getISOWeekKey(d: Date): string {
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const ws = new Date(jan4)
  ws.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const wn = Math.ceil(((d.getTime() - ws.getTime()) / 86400000 + 1) / 7)
  return `${wn < 1 ? d.getFullYear() - 1 : d.getFullYear()}-${String(wn < 1 ? 52 : wn).padStart(2, '0')}`
}

export default function PrintLayout({ corseName, corseLocation, corseStartDate, corseEndDate, eventi, presenze, studenti, sections }: Props) {
  const dates = [...new Set(eventi.map(e => e.data))].sort()

  const byDate = new Map<string, CorsoEvento[]>()
  for (const ev of eventi) {
    const list = byDate.get(ev.data) ?? []; list.push(ev); byDate.set(ev.data, list)
  }

  const byWeek = new Map<string, string[]>()
  for (const iso of dates) {
    const key = getISOWeekKey(new Date(iso + 'T12:00:00'))
    const list = byWeek.get(key) ?? []; list.push(iso); byWeek.set(key, list)
  }
  const weekEntries = [...byWeek.entries()].sort(([a], [b]) => a.localeCompare(b))

  const presenzeByDateAndStudent = new Map<string, Map<string, CorsoPresenza>>()
  for (const p of presenze) {
    if (!presenzeByDateAndStudent.has(p.data)) presenzeByDateAndStudent.set(p.data, new Map())
    presenzeByDateAndStudent.get(p.data)!.set(p.student_id, p)
  }

  return (
    <div className="hidden print:block font-sans text-xs text-gray-900 p-8">
      {/* Intestazione */}
      <div className="mb-6 pb-4 border-b-2 border-gray-900">
        <h1 className="text-2xl font-bold">{corseName}</h1>
        <p className="text-sm text-gray-600 mt-1">Programma Completo del Corso</p>
        {(corseLocation || corseStartDate) && (
          <p className="text-sm text-gray-500 mt-0.5">
            {corseLocation}{corseLocation && corseStartDate ? ' · ' : ''}
            {corseStartDate && new Date(corseStartDate + 'T12:00:00').toLocaleDateString('it-IT')}
            {corseEndDate && ` → ${new Date(corseEndDate + 'T12:00:00').toLocaleDateString('it-IT')}`}
          </p>
        )}
      </div>

      {/* Sezione 1: Elenco giornate */}
      {sections.elenco && eventi.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-bold mb-3 pb-1 border-b border-gray-300">Programma delle Giornate</h2>
          {weekEntries.map(([, weekDates], wi) => (
            <div key={wi} className="mb-4">
              <p className="text-xs font-bold uppercase text-gray-500 mb-1">Settimana {wi + 1}</p>
              <table className="w-full border-collapse">
                <tbody>
                  {[...weekDates].sort().map(iso => (
                    <tr key={iso} className="border border-gray-200">
                      <td className="px-2 py-1 font-semibold w-28 border-r border-gray-200 bg-gray-50">
                        {fmtDate(iso)}
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex flex-wrap gap-1">
                          {(byDate.get(iso) ?? []).sort((a, b) => a.ora_inizio.localeCompare(b.ora_inizio)).map(ev => (
                            <span key={ev.id}
                              className="inline-block px-2 py-0.5 rounded border text-xs"
                              style={{ borderColor: '#ccc', background: '#f8f8f8' }}>
                              <strong>{fmtTime(ev.ora_inizio)}–{fmtTime(ev.ora_fine)}</strong> {ev.materia}
                              {ev.note ? ` (${ev.note})` : ''}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Sezione 2: Foglio presenze */}
      {sections.presenze && studenti.length > 0 && dates.length > 0 && (
        <div>
          <h2 className="text-base font-bold mb-3 pb-1 border-b border-gray-300">Foglio Presenze</h2>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr>
                <th className="border border-gray-300 px-2 py-1 text-left bg-gray-100 w-40">Studente</th>
                {dates.map(d => (
                  <th key={d} className="border border-gray-300 px-1 py-1 text-center bg-gray-100 w-8">
                    {fmtShortDate(d)}
                  </th>
                ))}
                <th className="border border-gray-300 px-2 py-1 text-center bg-gray-100 w-16">Tot.</th>
              </tr>
            </thead>
            <tbody>
              {studenti.map(s => {
                let presenti = 0
                return (
                  <tr key={s.id}>
                    <td className="border border-gray-300 px-2 py-1 font-medium">{s.full_name}</td>
                    {dates.map(d => {
                      const p = presenzeByDateAndStudent.get(d)?.get(s.id)
                      const isP = p?.present ?? null
                      if (isP === true) presenti++
                      return (
                        <td key={d} className="border border-gray-300 px-1 py-1 text-center">
                          {isP === true ? '✓' : isP === false ? '✗' : ''}
                        </td>
                      )
                    })}
                    <td className="border border-gray-300 px-2 py-1 text-center font-semibold">
                      {presenti}/{dates.length}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="text-gray-400 mt-1">✓ = Presente · ✗ = Assente · Vuoto = non registrato</p>
        </div>
      )}
    </div>
  )
}
