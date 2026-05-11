'use client'

import type { TemplateGiorno } from '@/lib/types'

interface Props {
  oreTotali: number | null
  giorni: TemplateGiorno[]
  className?: string
}

function parseMinuti(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export function calcolaOreUsate(giorni: TemplateGiorno[]): number {
  let totaleMinuti = 0
  for (const g of giorni) {
    for (const f of (g.fasce ?? [])) {
      const inizio = parseMinuti(f.ora_inizio)
      const fine   = parseMinuti(f.ora_fine)
      if (fine > inizio) totaleMinuti += fine - inizio
    }
  }
  return totaleMinuti / 60
}

export default function OrarioCounter({ oreTotali, giorni, className }: Props) {
  const oreUsate = calcolaOreUsate(giorni)
  const oreRimanenti = oreTotali != null ? oreTotali - oreUsate : null
  const percentuale   = oreTotali != null && oreTotali > 0 ? Math.min(100, (oreUsate / oreTotali) * 100) : 0

  const barColor = oreRimanenti == null
    ? '#1EB8E5'
    : oreRimanenti < 0
      ? '#ef4444'
      : oreRimanenti < oreTotali! * 0.1
        ? '#f59e0b'
        : '#1EB8E5'

  return (
    <div className={`rounded-xl p-3 space-y-1.5 ${className ?? ''}`}
      style={{ background: 'rgba(27,55,104,0.04)', border: '1px solid rgba(27,55,104,0.08)' }}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium" style={{ color: '#1B3768' }}>
          Ore di lezione
        </span>
        <span className="text-xs font-semibold" style={{ color: barColor }}>
          {oreUsate % 1 === 0 ? `${oreUsate}h` : `${oreUsate.toFixed(1)}h`}
          {oreTotali != null && (
            <span style={{ color: 'rgba(27,55,104,0.4)', fontWeight: 400 }}>
              {' '}/ {oreTotali}h target
            </span>
          )}
        </span>
      </div>

      {oreTotali != null && (
        <>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(27,55,104,0.1)' }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${percentuale}%`, backgroundColor: barColor }} />
          </div>
          <p className="text-xs" style={{ color: oreRimanenti! < 0 ? '#ef4444' : 'rgba(27,55,104,0.45)' }}>
            {oreRimanenti! < 0
              ? `${Math.abs(oreRimanenti!).toFixed(1)}h in eccesso`
              : `${oreRimanenti!.toFixed(1)}h rimanenti`}
          </p>
        </>
      )}
    </div>
  )
}
