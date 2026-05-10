'use client'

import { useState } from 'react'
import { Plus, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import FasciaRow, { defaultNewFascia } from './FasciaRow'
import type { TemplateModulo, TemplateGiorno, TemplateFascia, Area } from '@/lib/types'

interface Props {
  templateId: string
  moduli: TemplateModulo[]
  aree: Area[]
  onModuliChange: (moduli: TemplateModulo[]) => void
}

export default function ModuliEditor({ templateId, moduli, aree, onModuliChange }: Props) {
  const [collapsedModuli, setCollapsedModuli] = useState<Set<string>>(new Set())
  const [collapsedGiorni, setCollapsedGiorni] = useState<Set<string>>(new Set())

  function toggleModulo(id: string) {
    setCollapsedModuli(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleGiorno(id: string) {
    setCollapsedGiorni(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function addModulo() {
    const res = await fetch(`/api/template/${templateId}/moduli`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero: moduli.length + 1, titolo: `Modulo ${moduli.length + 1}` }),
    })
    const json = await res.json()
    if (json.modulo) onModuliChange([...moduli, json.modulo])
  }

  async function deleteModulo(id: string) {
    await fetch(`/api/template/${templateId}/moduli`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    onModuliChange(moduli.filter(m => m.id !== id))
  }

  async function updateModuloTitolo(id: string, titolo: string) {
    await fetch(`/api/template/${templateId}/moduli`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, titolo }),
    }).catch(() => null)
    onModuliChange(moduli.map(m => m.id === id ? { ...m, titolo } : m))
  }

  async function addGiorno(modulo: TemplateModulo) {
    const giorni = modulo.giorni ?? []
    const res = await fetch(`/api/template/${templateId}/giorni`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modulo_id: modulo.id, numero: giorni.length + 1 }),
    })
    const json = await res.json()
    if (json.giorno) {
      onModuliChange(moduli.map(m =>
        m.id === modulo.id ? { ...m, giorni: [...(m.giorni ?? []), json.giorno] } : m
      ))
    }
  }

  async function deleteGiorno(moduloId: string, giornoId: string) {
    await fetch(`/api/template/${templateId}/giorni`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: giornoId }),
    })
    onModuliChange(moduli.map(m =>
      m.id === moduloId ? { ...m, giorni: (m.giorni ?? []).filter(g => g.id !== giornoId) } : m
    ))
  }

  function updateGiorni(moduloId: string, newGiorni: TemplateGiorno[]) {
    onModuliChange(moduli.map(m => m.id === moduloId ? { ...m, giorni: newGiorni } : m))
  }

  async function addFascia(moduloId: string, giorno: TemplateGiorno) {
    const { ora_inizio, ora_fine } = defaultNewFascia(giorno.fasce ?? [])
    const res = await fetch(`/api/template/${templateId}/fasce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ giorno_id: giorno.id, ora_inizio, ora_fine, materia: '' }),
    })
    const json = await res.json()
    if (json.fascia) {
      updateGiorni(moduloId, (moduli.find(m => m.id === moduloId)?.giorni ?? []).map(g =>
        g.id === giorno.id ? { ...g, fasce: [...(g.fasce ?? []), json.fascia] } : g
      ))
    }
  }

  async function updateFascia(moduloId: string, giornoId: string, fasciaId: string, fields: Partial<TemplateFascia>) {
    await fetch(`/api/template/${templateId}/fasce`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: fasciaId, ...fields }),
    })
    updateGiorni(moduloId, (moduli.find(m => m.id === moduloId)?.giorni ?? []).map(g =>
      g.id === giornoId
        ? { ...g, fasce: (g.fasce ?? []).map(f => f.id === fasciaId ? { ...f, ...fields } : f) }
        : g
    ))
  }

  async function deleteFascia(moduloId: string, giornoId: string, fasciaId: string) {
    await fetch(`/api/template/${templateId}/fasce`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: fasciaId }),
    })
    updateGiorni(moduloId, (moduli.find(m => m.id === moduloId)?.giorni ?? []).map(g =>
      g.id === giornoId
        ? { ...g, fasce: (g.fasce ?? []).filter(f => f.id !== fasciaId) }
        : g
    ))
  }

  return (
    <div className="space-y-3">
      {moduli.map(modulo => (
        <div key={modulo.id} className="rounded-xl border overflow-hidden"
          style={{ borderColor: 'rgba(27,55,104,0.15)' }}>

          {/* Header modulo */}
          <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none"
            style={{ background: 'rgba(27,55,104,0.07)' }}
            onClick={() => toggleModulo(modulo.id)}>
            <span style={{ color: 'rgba(27,55,104,0.6)', flexShrink: 0 }}>
              {collapsedModuli.has(modulo.id) ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </span>
            <span className="text-xs font-bold uppercase tracking-wide flex-shrink-0"
              style={{ color: '#1B3768' }}>M{modulo.numero}</span>
            <input
              type="text"
              defaultValue={modulo.titolo}
              placeholder="Titolo modulo"
              onClick={e => e.stopPropagation()}
              onBlur={e => updateModuloTitolo(modulo.id, e.target.value)}
              className="flex-1 bg-transparent text-sm font-semibold border-0 outline-none min-w-0"
              style={{ color: '#1B3768' }}
            />
            <button onClick={e => { e.stopPropagation(); deleteModulo(modulo.id) }}
              className="p-1 rounded hover:bg-red-50 flex-shrink-0"
              style={{ color: 'rgba(27,55,104,0.3)' }}>
              <Trash2 size={12} />
            </button>
          </div>

          {/* Giorni del modulo */}
          {!collapsedModuli.has(modulo.id) && (
            <div className="px-3 py-2 space-y-1.5">
              {(modulo.giorni ?? []).map(giorno => (
                <div key={giorno.id} className="rounded-lg border overflow-hidden"
                  style={{ borderColor: 'rgba(27,55,104,0.08)' }}>

                  {/* Header giorno */}
                  <div className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer"
                    style={{ background: 'rgba(27,55,104,0.03)' }}
                    onClick={() => toggleGiorno(giorno.id)}>
                    <span style={{ color: 'rgba(27,55,104,0.4)', flexShrink: 0 }}>
                      {collapsedGiorni.has(giorno.id) ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                    </span>
                    <span className="text-xs font-medium flex-shrink-0" style={{ color: '#1B3768' }}>
                      Giorno {giorno.numero}
                    </span>
                    <input
                      type="text"
                      defaultValue={giorno.titolo ?? ''}
                      placeholder="Titolo opzionale"
                      onClick={e => e.stopPropagation()}
                      onBlur={async e => {
                        await fetch(`/api/template/${templateId}/giorni`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: giorno.id, titolo: e.target.value }),
                        }).catch(() => null)
                      }}
                      className="flex-1 bg-transparent text-xs border-0 outline-none min-w-0 placeholder:text-gray-300"
                      style={{ color: '#1B3768' }}
                    />
                    <button onClick={e => { e.stopPropagation(); deleteGiorno(modulo.id, giorno.id) }}
                      className="p-0.5 rounded hover:bg-red-50" style={{ color: 'rgba(27,55,104,0.25)' }}>
                      <Trash2 size={11} />
                    </button>
                  </div>

                  {/* Fasce */}
                  {!collapsedGiorni.has(giorno.id) && (
                    <div className="px-2.5 py-1.5 space-y-1">
                      {(giorno.fasce ?? []).map(f => (
                        <FasciaRow
                          key={f.id}
                          fascia={f}
                          aree={aree}
                          onUpdate={(id, fields) => updateFascia(modulo.id, giorno.id, id, fields as Partial<TemplateFascia>)}
                          onDelete={(id) => deleteFascia(modulo.id, giorno.id, id)}
                        />
                      ))}
                      <button
                        onClick={() => addFascia(modulo.id, giorno)}
                        className="flex items-center gap-1 text-xs font-medium"
                        style={{ color: '#1EB8E5' }}>
                        <Plus size={11} /> Fascia
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <button onClick={() => addGiorno(modulo)}
                className="flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg border-dashed border w-full"
                style={{ borderColor: 'rgba(27,55,104,0.12)', color: 'rgba(27,55,104,0.45)' }}>
                <Plus size={12} /> Aggiungi giorno
              </button>
            </div>
          )}
        </div>
      ))}

      <button onClick={addModulo}
        className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl border-2 border-dashed w-full"
        style={{ borderColor: 'rgba(27,55,104,0.15)', color: 'rgba(27,55,104,0.5)' }}>
        <Plus size={14} /> Aggiungi modulo
      </button>
    </div>
  )
}
