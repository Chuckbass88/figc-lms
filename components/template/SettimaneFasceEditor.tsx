'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import FasciaRow, { defaultNewFascia } from './FasciaRow'
import type { TemplateGiorno, TemplateFascia, Area } from '@/lib/types'

interface Props {
  templateId: string
  giorni: TemplateGiorno[]
  aree: Area[]
  onGiorniChange: (giorni: TemplateGiorno[]) => void
}

const DOW_LABEL = ['', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']

export default function SettimaneFasceEditor({ templateId, giorni, aree, onGiorniChange }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  function toggleCollapse(id: string) {
    setCollapsed(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // Group giorni by settimana_numero
  const settimaneMap = new Map<number, TemplateGiorno[]>()
  for (const g of giorni) {
    const wn = g.settimana_numero ?? 0
    const list = settimaneMap.get(wn) ?? []
    list.push(g)
    settimaneMap.set(wn, list)
  }
  const settimane = [...settimaneMap.entries()].sort(([a], [b]) => a - b)

  async function addFascia(giorno: TemplateGiorno) {
    const { ora_inizio, ora_fine } = defaultNewFascia(giorno.fasce ?? [])
    const res = await fetch(`/api/template/${templateId}/fasce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ giorno_id: giorno.id, ora_inizio, ora_fine, materia: '' }),
    })
    const json = await res.json()
    if (json.fascia) {
      onGiorniChange(giorni.map(g =>
        g.id === giorno.id ? { ...g, fasce: [...(g.fasce ?? []), json.fascia] } : g
      ))
    }
  }

  async function addPausa(giorno: TemplateGiorno, tipo_pausa: string) {
    const { ora_inizio, ora_fine } = defaultNewFascia(giorno.fasce ?? [])
    const labelMap: Record<string, string> = {
      caffe: 'Pausa caffè',
      pranzo: 'Pausa pranzo',
      cena: 'Pausa cena',
    }
    const res = await fetch(`/api/template/${templateId}/fasce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        giorno_id: giorno.id,
        ora_inizio,
        ora_fine,
        materia: labelMap[tipo_pausa] ?? '',
        tipo_pausa,
      }),
    })
    const json = await res.json()
    if (json.fascia) {
      onGiorniChange(giorni.map(g =>
        g.id === giorno.id ? { ...g, fasce: [...(g.fasce ?? []), json.fascia] } : g
      ))
    }
  }

  async function updateFascia(giornoId: string, fasciaId: string, fields: Partial<TemplateFascia>) {
    await fetch(`/api/template/${templateId}/fasce`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: fasciaId, ...fields }),
    })
    onGiorniChange(giorni.map(g =>
      g.id === giornoId
        ? { ...g, fasce: (g.fasce ?? []).map(f => f.id === fasciaId ? { ...f, ...fields } : f) }
        : g
    ))
  }

  async function deleteFascia(giornoId: string, fasciaId: string) {
    await fetch(`/api/template/${templateId}/fasce`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: fasciaId }),
    })
    onGiorniChange(giorni.map(g =>
      g.id === giornoId ? { ...g, fasce: (g.fasce ?? []).filter(f => f.id !== fasciaId) } : g
    ))
  }

  if (giorni.length === 0) {
    return (
      <p className="text-xs text-center py-4" style={{ color: 'rgba(27,55,104,0.4)' }}>
        Prima seleziona la struttura nel calendario qui sopra
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {settimane.map(([wn, giorni_settimana]) => (
        <div key={wn} className="rounded-xl border overflow-hidden"
          style={{ borderColor: 'rgba(27,55,104,0.12)' }}>
          <div className="px-3 py-2 text-xs font-semibold"
            style={{ background: 'rgba(27,55,104,0.05)', color: '#1B3768' }}>
            Settimana {wn}
          </div>

          <div className="px-3 py-2 space-y-2">
            {[...giorni_settimana]
              .sort((a, b) => (a.giorno_settimana ?? 0) - (b.giorno_settimana ?? 0))
              .map(giorno => {
                const dowLabel = DOW_LABEL[giorno.giorno_settimana ?? 0] ?? `Giorno ${giorno.numero}`
                const isCollapsed = collapsed.has(giorno.id)
                return (
                  <div key={giorno.id} className="rounded-lg border overflow-hidden"
                    style={{ borderColor: 'rgba(27,55,104,0.08)' }}>
                    <div className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer select-none"
                      style={{ background: 'rgba(27,55,104,0.03)' }}
                      onClick={() => toggleCollapse(giorno.id)}>
                      <span className="text-xs font-medium flex-1" style={{ color: '#1B3768' }}>
                        {dowLabel}
                        {giorno.is_mezza_giornata && (
                          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(245,158,11,0.15)', color: '#d97706' }}>
                            ½ giornata
                          </span>
                        )}
                      </span>
                      <span className="text-xs" style={{ color: 'rgba(27,55,104,0.35)' }}>
                        {(giorno.fasce ?? []).length} fasce
                      </span>
                    </div>

                    {!isCollapsed && (
                      <div className="px-2.5 py-1.5 space-y-1">
                        {(giorno.fasce ?? []).map(f => (
                          <div key={f.id} className="flex items-center gap-1">
                            {f.tipo_pausa && (
                              <span className="text-xs flex-shrink-0">
                                {f.tipo_pausa === 'caffe' ? '☕' : f.tipo_pausa === 'pranzo' ? '🍽️' : '🌙'}
                              </span>
                            )}
                            <div className="flex-1">
                              <FasciaRow
                                fascia={f}
                                aree={aree}
                                onUpdate={(id, fields) => updateFascia(giorno.id, id, fields as Partial<TemplateFascia>)}
                                onDelete={(id) => deleteFascia(giorno.id, id)}
                              />
                            </div>
                          </div>
                        ))}

                        <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                          <button
                            onClick={() => addFascia(giorno)}
                            className="flex items-center gap-1 text-xs font-medium"
                            style={{ color: '#1EB8E5' }}>
                            <Plus size={11} /> Fascia
                          </button>
                          <span style={{ color: 'rgba(27,55,104,0.2)' }}>|</span>
                          {[
                            { tipo: 'caffe',  icon: '☕', label: 'Caffè' },
                            { tipo: 'pranzo', icon: '🍽️', label: 'Pranzo' },
                            { tipo: 'cena',   icon: '🌙', label: 'Cena' },
                          ].map(p => (
                            <button key={p.tipo}
                              onClick={() => addPausa(giorno, p.tipo)}
                              className="flex items-center gap-0.5 text-xs"
                              style={{ color: 'rgba(27,55,104,0.4)' }}>
                              {p.icon} {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      ))}
    </div>
  )
}
