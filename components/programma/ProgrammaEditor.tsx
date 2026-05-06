'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronRight, GripVertical, Coffee, Clock } from 'lucide-react'
import type { ProgramWithDetails, ProgramModule, ProgramDay, ProgramBlock, ModuleType } from '@/lib/types'

interface Props {
  program: ProgramWithDetails
  courseInstructors: { id: string; full_name: string }[]
  readOnly?: boolean
  onProgramChange?: () => void
}

type EditingBlock = { dayId: string; block?: ProgramBlock }

const MODULE_TYPE_LABELS: Record<ModuleType, string> = {
  week: 'Settimana',
  module: 'Modulo',
  block: 'Blocco',
}

function formatTime(t: string | null) {
  if (!t) return ''
  return t.slice(0, 5)
}

function formatDate(d: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ProgrammaEditor({ program: initialProgram, courseInstructors, readOnly = false, onProgramChange }: Props) {
  const [program, setProgram] = useState(initialProgram)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set((initialProgram.modules ?? []).map(m => m.id)))
  const [expandedDays, setExpandedDays] = useState<Set<string>>(
    new Set((initialProgram.modules ?? []).flatMap(m => (m.days ?? []).map(d => d.id)))
  )
  const [loading, setLoading] = useState(false)

  // Stati per aggiunta/modifica inline
  const [addingModule, setAddingModule] = useState(false)
  const [newModuleTitle, setNewModuleTitle] = useState('')
  const [newModuleType, setNewModuleType] = useState<ModuleType>('week')
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null)
  const [editModuleTitle, setEditModuleTitle] = useState('')

  const [addingDayToModule, setAddingDayToModule] = useState<string | null>(null)
  const [newDayTitle, setNewDayTitle] = useState('')
  const [newDayDate, setNewDayDate] = useState('')
  const [editingDayId, setEditingDayId] = useState<string | null>(null)
  const [editDayTitle, setEditDayTitle] = useState('')
  const [editDayDate, setEditDayDate] = useState('')

  const [editingBlock, setEditingBlock] = useState<EditingBlock | null>(null)
  const [blockForm, setBlockForm] = useState({
    title: '', description: '', startTime: '', endTime: '',
    instructorId: '', instructorName: '', isBreak: false,
  })

  async function apiCall(url: string, method: string, body: object) {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }

  async function reload() {
    const res = await fetch(`/api/programma/${program.id}`)
    if (res.ok) setProgram(await res.json())
    onProgramChange?.()
  }

  // ── MODULI ──
  async function handleAddModule() {
    if (!newModuleTitle.trim()) return
    setLoading(true)
    try {
      await apiCall('/api/programma/modulo', 'POST', {
        programId: program.id, title: newModuleTitle.trim(),
        type: newModuleType, orderIndex: (program.modules ?? []).length,
      })
      setNewModuleTitle('')
      setAddingModule(false)
      await reload()
    } finally { setLoading(false) }
  }

  async function handleEditModule(id: string) {
    if (!editModuleTitle.trim()) return
    setLoading(true)
    try {
      await apiCall('/api/programma/modulo', 'PATCH', { id, title: editModuleTitle.trim() })
      setEditingModuleId(null)
      await reload()
    } finally { setLoading(false) }
  }

  async function handleDeleteModule(id: string) {
    setLoading(true)
    try {
      await apiCall('/api/programma/modulo', 'DELETE', { id })
      await reload()
    } finally { setLoading(false) }
  }

  // ── GIORNATE ──
  async function handleAddDay(moduleId: string) {
    if (!newDayTitle.trim() && !newDayDate) return
    setLoading(true)
    try {
      const mod = program.modules.find(m => m.id === moduleId)
      await apiCall('/api/programma/giorno', 'POST', {
        moduleId, programId: program.id,
        title: newDayTitle.trim() || null,
        dayDate: newDayDate || null,
        orderIndex: (mod?.days?.length ?? 0),
      })
      setNewDayTitle('')
      setNewDayDate('')
      setAddingDayToModule(null)
      setExpandedModules(prev => new Set([...prev, moduleId]))
      await reload()
    } finally { setLoading(false) }
  }

  async function handleEditDay(id: string) {
    setLoading(true)
    try {
      await apiCall('/api/programma/giorno', 'PATCH', {
        id, title: editDayTitle || null, dayDate: editDayDate || null,
      })
      setEditingDayId(null)
      await reload()
    } finally { setLoading(false) }
  }

  async function handleDeleteDay(id: string) {
    setLoading(true)
    try {
      await apiCall('/api/programma/giorno', 'DELETE', { id })
      await reload()
    } finally { setLoading(false) }
  }

  // ── BLOCCHI ──
  function openAddBlock(dayId: string) {
    setEditingBlock({ dayId })
    setBlockForm({ title: '', description: '', startTime: '', endTime: '', instructorId: '', instructorName: '', isBreak: false })
  }

  function openEditBlock(dayId: string, block: ProgramBlock) {
    setEditingBlock({ dayId, block })
    setBlockForm({
      title: block.title,
      description: block.description || '',
      startTime: formatTime(block.start_time),
      endTime: formatTime(block.end_time),
      instructorId: block.instructor_id || '',
      instructorName: block.instructor_name || '',
      isBreak: block.is_break,
    })
  }

  async function handleSaveBlock() {
    if (!editingBlock || !blockForm.title.trim()) return
    setLoading(true)
    try {
      const payload = {
        dayId: editingBlock.dayId,
        programId: program.id,
        title: blockForm.title.trim(),
        description: blockForm.description.trim() || null,
        startTime: blockForm.startTime || null,
        endTime: blockForm.endTime || null,
        instructorId: blockForm.instructorId || null,
        instructorName: blockForm.instructorName.trim() || null,
        isBreak: blockForm.isBreak,
      }
      if (editingBlock.block) {
        await apiCall('/api/programma/blocco', 'PATCH', { id: editingBlock.block.id, ...payload })
      } else {
        const day = (program.modules ?? []).flatMap(m => m.days ?? []).find(d => d.id === editingBlock.dayId)
        await apiCall('/api/programma/blocco', 'POST', { ...payload, orderIndex: (day?.blocks ?? []).length })
      }
      setEditingBlock(null)
      await reload()
    } finally { setLoading(false) }
  }

  async function handleDeleteBlock(id: string) {
    setLoading(true)
    try {
      await apiCall('/api/programma/blocco', 'DELETE', { id })
      await reload()
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {(program.modules ?? []).map((mod) => (
        <div key={mod.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header modulo */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
            {!readOnly && <GripVertical size={14} className="text-gray-300 flex-shrink-0" />}
            <button
              onClick={() => setExpandedModules(prev => {
                const s = new Set(prev)
                s.has(mod.id) ? s.delete(mod.id) : s.add(mod.id)
                return s
              })}
              className="flex items-center gap-2 flex-1 text-left"
            >
              {expandedModules.has(mod.id) ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronRight size={15} className="text-gray-400" />}
              {editingModuleId === mod.id ? (
                <span onClick={e => e.stopPropagation()} className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editModuleTitle}
                    onChange={e => setEditModuleTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleEditModule(mod.id); if (e.key === 'Escape') setEditingModuleId(null) }}
                    autoFocus
                    className="px-2 py-1 text-sm rounded border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white flex-1"
                  />
                  <button onClick={() => handleEditModule(mod.id)} disabled={loading} className="p-1 rounded text-green-600 hover:bg-green-50"><Check size={13} /></button>
                  <button onClick={() => setEditingModuleId(null)} className="p-1 rounded text-gray-500 hover:bg-gray-100"><X size={13} /></button>
                </span>
              ) : (
                <span className="text-sm font-semibold text-gray-800">
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mr-2">{MODULE_TYPE_LABELS[mod.type as ModuleType]}</span>
                  {mod.title}
                </span>
              )}
            </button>
            {!readOnly && editingModuleId !== mod.id && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => { setEditingModuleId(mod.id); setEditModuleTitle(mod.title) }} className="p-1.5 rounded hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition"><Pencil size={13} /></button>
                <button onClick={() => handleDeleteModule(mod.id)} disabled={loading} className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition"><Trash2 size={13} /></button>
              </div>
            )}
          </div>

          {expandedModules.has(mod.id) && (
            <div className="divide-y divide-gray-50">
              {mod.days.map((day) => (
                <div key={day.id} className="px-4 py-3">
                  {/* Header giornata */}
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => setExpandedDays(prev => {
                        const s = new Set(prev)
                        s.has(day.id) ? s.delete(day.id) : s.add(day.id)
                        return s
                      })}
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      {expandedDays.has(day.id) ? <ChevronDown size={13} className="text-gray-300" /> : <ChevronRight size={13} className="text-gray-300" />}
                      {editingDayId === day.id ? (
                        <span onClick={e => e.stopPropagation()} className="flex items-center gap-2 flex-1">
                          <input type="text" value={editDayTitle} onChange={e => setEditDayTitle(e.target.value)} placeholder="Titolo giornata" className="px-2 py-1 text-xs rounded border border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white flex-1" />
                          <input type="date" value={editDayDate} onChange={e => setEditDayDate(e.target.value)} className="px-2 py-1 text-xs rounded border border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
                          <button onClick={() => handleEditDay(day.id)} disabled={loading} className="p-1 rounded text-green-600 hover:bg-green-50"><Check size={12} /></button>
                          <button onClick={() => setEditingDayId(null)} className="p-1 rounded text-gray-500 hover:bg-gray-100"><X size={12} /></button>
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-gray-700">
                          {day.title || 'Giornata'}{day.day_date && <span className="font-normal text-gray-400 ml-1">— {formatDate(day.day_date)}</span>}
                        </span>
                      )}
                    </button>
                    {!readOnly && editingDayId !== day.id && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => { setEditingDayId(day.id); setEditDayTitle(day.title || ''); setEditDayDate(day.day_date || '') }} className="p-1 rounded hover:bg-blue-50 text-blue-300 hover:text-blue-500 transition"><Pencil size={11} /></button>
                        <button onClick={() => handleDeleteDay(day.id)} disabled={loading} className="p-1 rounded hover:bg-red-50 text-red-300 hover:text-red-500 transition"><Trash2 size={11} /></button>
                        <button onClick={() => openAddBlock(day.id)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition ml-1"><Plus size={11} /> Blocco</button>
                      </div>
                    )}
                  </div>

                  {/* Blocchi della giornata */}
                  {expandedDays.has(day.id) && (
                    <div className="ml-5 space-y-1.5">
                      {(day.blocks ?? []).map((block) => (
                        <BlockRow
                          key={block.id}
                          block={block}
                          readOnly={readOnly}
                          onEdit={() => openEditBlock(day.id, block)}
                          onDelete={() => handleDeleteBlock(block.id)}
                          loading={loading}
                        />
                      ))}
                      {(day.blocks ?? []).length === 0 && !readOnly && (
                        <p className="text-xs text-gray-300 py-1">Nessun blocco. Aggiungine uno →</p>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Aggiungi giornata */}
              {!readOnly && (
                <div className="px-4 py-2 bg-gray-50/50">
                  {addingDayToModule === mod.id ? (
                    <div className="flex items-center gap-2">
                      <input type="text" value={newDayTitle} onChange={e => setNewDayTitle(e.target.value)} placeholder="Titolo giornata (es. Giorno 1)" className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white flex-1" />
                      <input type="date" value={newDayDate} onChange={e => setNewDayDate(e.target.value)} className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
                      <button onClick={() => handleAddDay(mod.id)} disabled={loading || (!newDayTitle.trim() && !newDayDate)} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition"><Check size={12} /></button>
                      <button onClick={() => { setAddingDayToModule(null); setNewDayTitle(''); setNewDayDate('') }} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 border border-gray-200 transition"><X size={12} /></button>
                    </div>
                  ) : (
                    <button onClick={() => { setAddingDayToModule(mod.id); setExpandedModules(prev => new Set([...prev, mod.id])) }} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 transition py-1">
                      <Plus size={13} /> Aggiungi giornata
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Aggiungi modulo */}
      {!readOnly && (
        addingModule ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-blue-800">Nuovo livello</p>
            <div className="flex gap-2">
              <select value={newModuleType} onChange={e => setNewModuleType(e.target.value as ModuleType)} className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                <option value="week">Settimana</option>
                <option value="module">Modulo</option>
                <option value="block">Blocco tematico</option>
              </select>
              <input
                type="text"
                value={newModuleTitle}
                onChange={e => setNewModuleTitle(e.target.value)}
                placeholder="Es. Settimana 1 — Introduzione"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleAddModule(); if (e.key === 'Escape') setAddingModule(false) }}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white flex-1"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddModule} disabled={loading || !newModuleTitle.trim()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition"><Check size={14} /> Salva</button>
              <button onClick={() => { setAddingModule(false); setNewModuleTitle('') }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition"><X size={14} /> Annulla</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAddingModule(true)} className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition w-full">
            <Plus size={16} /> Aggiungi settimana / modulo / blocco tematico
          </button>
        )
      )}

      {/* Modale blocco */}
      {editingBlock && (
        <BlockModal
          form={blockForm}
          onChange={setBlockForm}
          onSave={handleSaveBlock}
          onClose={() => setEditingBlock(null)}
          courseInstructors={courseInstructors}
          isEdit={!!editingBlock.block}
          loading={loading}
        />
      )}
    </div>
  )
}

// ── Riga blocco orario ─────────────────────────────────────
function BlockRow({ block, readOnly, onEdit, onDelete, loading }: {
  block: ProgramBlock
  readOnly: boolean
  onEdit: () => void
  onDelete: () => void
  loading: boolean
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className={`flex items-start gap-3 rounded-lg px-3 py-2 ${block.is_break ? 'bg-amber-50 border border-amber-100' : 'bg-gray-50 border border-gray-100'}`}>
      <div className="flex-shrink-0 w-24 text-right">
        {block.start_time && (
          <span className="text-xs font-mono font-semibold text-blue-700">
            {formatTime(block.start_time)}{block.end_time && `–${formatTime(block.end_time)}`}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold ${block.is_break ? 'text-amber-700' : 'text-gray-800'}`}>
          {block.is_break && <Coffee size={11} className="inline mr-1 text-amber-500" />}
          {block.title}
        </p>
        {block.description && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{block.description}</p>}
        {(block.instructor?.full_name || block.instructor_name) && (
          <p className="text-xs text-blue-600 font-medium mt-0.5">
            {block.instructor?.full_name || block.instructor_name}
          </p>
        )}
      </div>
      {!readOnly && (
        confirming ? (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs text-red-600">Eliminare?</span>
            <button onClick={onDelete} disabled={loading} className="px-2 py-0.5 rounded text-xs text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">Sì</button>
            <button onClick={() => setConfirming(false)} className="px-2 py-0.5 rounded text-xs text-gray-600 border border-gray-200 hover:bg-gray-50">No</button>
          </div>
        ) : (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={onEdit} className="p-1 rounded hover:bg-blue-100 text-blue-400 hover:text-blue-600 transition"><Pencil size={11} /></button>
            <button onClick={() => setConfirming(true)} className="p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition"><Trash2 size={11} /></button>
          </div>
        )
      )}
    </div>
  )
}

// ── Modale form blocco ─────────────────────────────────────
function BlockModal({ form, onChange, onSave, onClose, courseInstructors, isEdit, loading }: {
  form: { title: string; description: string; startTime: string; endTime: string; instructorId: string; instructorName: string; isBreak: boolean }
  onChange: (f: typeof form) => void
  onSave: () => void
  onClose: () => void
  courseInstructors: { id: string; full_name: string }[]
  isEdit: boolean
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Clock size={16} className="text-blue-600" />
          <h3 className="font-semibold text-gray-900">{isEdit ? 'Modifica blocco' : 'Nuovo blocco orario'}</h3>
          <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          {/* Pausa toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => onChange({ ...form, isBreak: !form.isBreak })}
              className={`w-9 h-5 rounded-full transition-colors relative ${form.isBreak ? 'bg-amber-400' : 'bg-gray-200'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow absolute top-0.5 transition-transform ${form.isBreak ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-gray-700">Pausa (caffè, pranzo…)</span>
          </label>

          {/* Titolo */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Titolo *</label>
            <input type="text" value={form.title} onChange={e => onChange({ ...form, title: e.target.value })} placeholder={form.isBreak ? 'Es. Pausa caffè' : 'Es. Tattica difensiva'} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          {/* Orari */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Inizio</label>
              <input type="time" value={form.startTime} onChange={e => onChange({ ...form, startTime: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Fine</label>
              <input type="time" value={form.endTime} onChange={e => onChange({ ...form, endTime: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>

          {/* Descrizione */}
          {!form.isBreak && (
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Descrizione</label>
              <textarea value={form.description} onChange={e => onChange({ ...form, description: e.target.value })} rows={2} placeholder="Contenuto della lezione…" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            </div>
          )}

          {/* Docente */}
          {!form.isBreak && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 block">Docente</label>
              <select value={form.instructorId} onChange={e => onChange({ ...form, instructorId: e.target.value, instructorName: e.target.value ? '' : form.instructorName })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                <option value="">— Nessuno / docente esterno —</option>
                {courseInstructors.map(i => <option key={i.id} value={i.id}>{i.full_name}</option>)}
              </select>
              {!form.instructorId && (
                <input type="text" value={form.instructorName} onChange={e => onChange({ ...form, instructorName: e.target.value })} placeholder="Nome docente esterno (campo libero)" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              )}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition">Annulla</button>
          <button onClick={onSave} disabled={loading || !form.title.trim()} className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition">{isEdit ? 'Salva modifiche' : 'Aggiungi blocco'}</button>
        </div>
      </div>
    </div>
  )
}
