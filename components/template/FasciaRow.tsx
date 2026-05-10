'use client'

import { useState } from 'react'
import { Trash2, GripVertical } from 'lucide-react'
import type { TemplateFascia, Area } from '@/lib/types'

interface Props {
  fascia: TemplateFascia
  aree: Area[]
  onUpdate: (id: string, fields: Partial<Pick<TemplateFascia, 'ora_inizio' | 'ora_fine' | 'materia' | 'area_id' | 'note'>>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

/** Converte "HH:MM:SS" → "HH:MM" per l'input */
function toHHMM(t: string): string { return t.slice(0, 5) }

/** Aggiunge 2 ore a "HH:MM", clampa a 23:59 */
function add2h(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const total = Math.min(h * 60 + (m || 0) + 120, 23 * 60 + 59)
  const nh = Math.floor(total / 60)
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

export default function FasciaRow({ fascia, aree, onUpdate, onDelete }: Props) {
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const inp = "rounded-lg px-2 py-1 text-sm border bg-white focus:outline-none focus:ring-1"
  const inpStyle = { borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768', '--tw-ring-color': '#1EB8E5' } as React.CSSProperties

  async function handleBlur(field: string, value: string) {
    if (!value.trim()) return
    setSaving(true)
    await onUpdate(fascia.id, { [field]: value })
    setSaving(false)
  }

  async function handleDelete() {
    setDeleting(true)
    await onDelete(fascia.id)
    setDeleting(false)
  }

  return (
    <div className={`flex items-center gap-2 py-1.5 px-2 rounded-xl transition ${saving ? 'opacity-60' : ''}`}
      style={{ background: 'rgba(27,55,104,0.03)', border: '1px solid rgba(27,55,104,0.08)' }}>

      {/* Drag handle (visivo, non funzionale) */}
      <GripVertical size={13} style={{ color: 'rgba(27,55,104,0.25)', flexShrink: 0 }} />

      {/* Orario inizio */}
      <input
        type="time"
        defaultValue={toHHMM(fascia.ora_inizio)}
        onBlur={e => handleBlur('ora_inizio', e.target.value)}
        className={`${inp} w-24`}
        style={inpStyle}
      />

      <span style={{ color: 'rgba(27,55,104,0.35)', fontSize: 12 }}>→</span>

      {/* Orario fine */}
      <input
        type="time"
        defaultValue={toHHMM(fascia.ora_fine)}
        onBlur={e => handleBlur('ora_fine', e.target.value)}
        className={`${inp} w-24`}
        style={inpStyle}
      />

      {/* Materia */}
      <input
        type="text"
        defaultValue={fascia.materia}
        placeholder="Materia"
        onBlur={e => handleBlur('materia', e.target.value)}
        className={`${inp} flex-1 min-w-0`}
        style={inpStyle}
      />

      {/* Area (opzionale) */}
      {aree.length > 0 && (
        <select
          defaultValue={fascia.area_id ?? ''}
          onChange={e => onUpdate(fascia.id, { area_id: e.target.value || null })}
          className={`${inp} w-32`}
          style={{ ...inpStyle, color: fascia.area_id ? '#1B3768' : 'rgba(27,55,104,0.4)' }}
        >
          <option value="">Area</option>
          {aree.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
      )}

      {/* Delete */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="p-1.5 rounded-lg hover:bg-red-50 transition flex-shrink-0"
        style={{ color: deleting ? 'rgba(27,55,104,0.2)' : 'rgba(27,55,104,0.35)' }}
        title="Rimuovi fascia"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

/** Calcola l'orario default per una nuova fascia basandosi sull'ultima fascia del giorno */
export function defaultNewFascia(existingFasce: TemplateFascia[]): { ora_inizio: string; ora_fine: string } {
  if (existingFasce.length === 0) return { ora_inizio: '09:00', ora_fine: '11:00' }
  const last = existingFasce[existingFasce.length - 1]
  const inizio = toHHMM(last.ora_fine)
  return { ora_inizio: inizio, ora_fine: add2h(inizio) }
}
