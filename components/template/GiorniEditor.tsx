'use client'

import { useState } from 'react'
import { Plus, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import FasciaRow, { defaultNewFascia } from './FasciaRow'
import type { TemplateGiorno, TemplateFascia, Area } from '@/lib/types'

interface Props {
  templateId: string
  giorni: TemplateGiorno[]
  aree: Area[]
  onGiorniChange: (giorni: TemplateGiorno[]) => void
}

export default function GiorniEditor({ templateId, giorni, aree, onGiorniChange }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)
  const [addingFasciaFor, setAddingFasciaFor] = useState<string | null>(null)

  function toggleCollapse(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function addGiorno() {
    setAdding(true)
    const res = await fetch(`/api/template/${templateId}/giorni`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero: giorni.length + 1, modulo_id: null }),
    })
    const json = await res.json()
    if (json.giorno) onGiorniChange([...giorni, json.giorno])
    setAdding(false)
  }

  async function deleteGiorno(id: string) {
    await fetch(`/api/template/${templateId}/giorni`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    onGiorniChange(giorni.filter(g => g.id !== id))
  }

  async function addFascia(giorno: TemplateGiorno) {
    setAddingFasciaFor(giorno.id)
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
    setAddingFasciaFor(null)
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

  async function updateTitoloGiorno(id: string, titolo: string) {
    await fetch(`/api/template/${templateId}/giorni`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, titolo }),
    }).catch(() => null)
    onGiorniChange(giorni.map(g => g.id === id ? { ...g, titolo } : g))
  }

  return (
    <div className="space-y-2">
      {giorni.map(giorno => (
        <div key={giorno.id} className="rounded-xl border overflow-hidden"
          style={{ borderColor: 'rgba(27,55,104,0.12)' }}>

          {/* Header giorno */}
          <div className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
            style={{ background: 'rgba(27,55,104,0.04)' }}
            onClick={() => toggleCollapse(giorno.id)}>
            <span style={{ color: 'rgba(27,55,104,0.5)', flexShrink: 0 }}>
              {collapsed.has(giorno.id) ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </span>
            <span className="text-xs font-semibold" style={{ color: '#1B3768', flexShrink: 0 }}>
              Giorno {giorno.numero}
            </span>
            <input
              type="text"
              defaultValue={giorno.titolo ?? ''}
              placeholder="Titolo opzionale"
              onClick={e => e.stopPropagation()}
              onBlur={e => updateTitoloGiorno(giorno.id, e.target.value)}
              className="flex-1 bg-transparent text-sm border-0 outline-none min-w-0 placeholder:text-gray-300"
              style={{ color: '#1B3768' }}
            />
            <button
              onClick={e => { e.stopPropagation(); deleteGiorno(giorno.id) }}
              className="p-1 rounded hover:bg-red-50 transition flex-shrink-0"
              style={{ color: 'rgba(27,55,104,0.3)' }}
              title="Rimuovi giorno"
            >
              <Trash2 size={12} />
            </button>
          </div>

          {/* Fasce */}
          {!collapsed.has(giorno.id) && (
            <div className="px-3 py-2 space-y-1.5">
              {(giorno.fasce ?? []).map(f => (
                <FasciaRow
                  key={f.id}
                  fascia={f}
                  aree={aree}
                  onUpdate={(id, fields) => updateFascia(giorno.id, id, fields as Partial<TemplateFascia>)}
                  onDelete={(id) => deleteFascia(giorno.id, id)}
                />
              ))}
              <button
                onClick={() => addFascia(giorno)}
                disabled={addingFasciaFor === giorno.id}
                className="flex items-center gap-1 text-xs font-medium mt-1 transition"
                style={{ color: addingFasciaFor === giorno.id ? 'rgba(30,184,229,0.4)' : '#1EB8E5' }}
              >
                <Plus size={12} />
                {addingFasciaFor === giorno.id ? 'Aggiungendo...' : 'Aggiungi fascia'}
              </button>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={addGiorno}
        disabled={adding}
        className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition w-full border-2 border-dashed"
        style={{
          borderColor: 'rgba(27,55,104,0.15)',
          color: adding ? 'rgba(27,55,104,0.3)' : 'rgba(27,55,104,0.5)',
        }}
      >
        <Plus size={14} />
        {adding ? 'Aggiungendo giorno...' : 'Aggiungi giorno'}
      </button>
    </div>
  )
}
