'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronRight, Coffee, Clock, CalendarDays, Link2 } from 'lucide-react'
import type { ProgramWithDetails, ProgramModule, ProgramDay, ProgramBlock, ModuleType } from '@/lib/types'

interface Props {
  program: ProgramWithDetails
  courseInstructors: { id: string; full_name: string }[]
  courseSessions: { id: string; title: string; session_date: string }[]
  readOnly?: boolean
  onProgramChange?: () => void
}

type EditingBlock = { dayId: string; block?: ProgramBlock }
type DayMode = 'manual' | 'session'

const MODULE_TYPE_LABELS: Record<ModuleType, string> = {
  week: 'Settimana',
  module: 'Modulo',
  block: 'Blocco',
}

const MODULE_COLORS: Record<ModuleType, string> = {
  week: 'bg-blue-700',
  module: 'bg-indigo-700',
  block: 'bg-violet-700',
}

function formatTime(t: string | null) {
  if (!t) return ''
  return t.slice(0, 5)
}

function formatDate(d: string | null) {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateShort(d: string | null) {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

export default function ProgrammaEditor({ program: initialProgram, courseInstructors, courseSessions, readOnly = false, onProgramChange }: Props) {
  const [program, setProgram] = useState(initialProgram)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set((initialProgram.modules ?? []).map(m => m.id)))
  const [expandedDays, setExpandedDays] = useState<Set<string>>(
    new Set((initialProgram.modules ?? []).flatMap(m => (m.days ?? []).map(d => d.id)))
  )
  const [loading, setLoading] = useState(false)

  // Moduli
  const [addingModule, setAddingModule] = useState(false)
  const [newModuleTitle, setNewModuleTitle] = useState('')
  const [newModuleType, setNewModuleType] = useState<ModuleType>('week')
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null)
  const [editModuleTitle, setEditModuleTitle] = useState('')

  // Giornate
  const [addingDayToModule, setAddingDayToModule] = useState<string | null>(null)
  const [dayMode, setDayMode] = useState<DayMode>('manual')
  const [newDayTitle, setNewDayTitle] = useState('')
  const [newDayDate, setNewDayDate] = useState('')
  const [newDaySessionId, setNewDaySessionId] = useState('')
  const [editingDayId, setEditingDayId] = useState<string | null>(null)
  const [editDayTitle, setEditDayTitle] = useState('')
  const [editDayDate, setEditDayDate] = useState('')

  // Fasce orarie (slide panel)
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
      setNewModuleTitle(''); setAddingModule(false)
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
    try { await apiCall('/api/programma/modulo', 'DELETE', { id }); await reload() }
    finally { setLoading(false) }
  }

  // ── GIORNATE ──
  async function handleAddDay(moduleId: string) {
    const hasSession = dayMode === 'session' && newDaySessionId
    const hasManual = dayMode === 'manual' && (newDayTitle.trim() || newDayDate)
    if (!hasSession && !hasManual) return
    setLoading(true)
    try {
      const mod = program.modules.find(m => m.id === moduleId)
      await apiCall('/api/programma/giorno', 'POST', {
        moduleId, programId: program.id,
        title: newDayTitle.trim() || null,
        dayDate: newDayDate || null,
        sessionId: hasSession ? newDaySessionId : null,
        orderIndex: (mod?.days?.length ?? 0),
      })
      setNewDayTitle(''); setNewDayDate(''); setNewDaySessionId('')
      setAddingDayToModule(null)
      setExpandedModules(prev => new Set([...prev, moduleId]))
      await reload()
    } finally { setLoading(false) }
  }

  async function handleEditDay(id: string) {
    setLoading(true)
    try {
      await apiCall('/api/programma/giorno', 'PATCH', { id, title: editDayTitle || null, dayDate: editDayDate || null })
      setEditingDayId(null)
      await reload()
    } finally { setLoading(false) }
  }

  async function handleDeleteDay(id: string) {
    setLoading(true)
    try { await apiCall('/api/programma/giorno', 'DELETE', { id }); await reload() }
    finally { setLoading(false) }
  }

  // ── FASCE ORARIE ──
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

  async function handleSaveBlock(startTimeOverride?: string, endTimeOverride?: string) {
    if (!editingBlock || !blockForm.title.trim()) return
    setLoading(true)
    try {
      const startTime = startTimeOverride ?? blockForm.startTime
      const endTime = endTimeOverride ?? blockForm.endTime
      const isAllInstructors = blockForm.instructorId === '__ALL__'
      const payload = {
        dayId: editingBlock.dayId,
        programId: program.id,
        title: blockForm.title.trim(),
        description: blockForm.description.trim() || null,
        startTime: startTime || null,
        endTime: endTime || null,
        instructorId: isAllInstructors ? null : (blockForm.instructorId || null),
        instructorName: isAllInstructors ? 'Tutti i docenti del corso' : (blockForm.instructorName.trim() || null),
        isBreak: blockForm.isBreak,
      }
      if (editingBlock.block) {
        await apiCall('/api/programma/blocco', 'PATCH', { id: editingBlock.block.id, ...payload })
      } else {
        const day = (program.modules ?? []).flatMap(m => m.days ?? []).find(d => d.id === editingBlock.dayId)
        await apiCall('/api/programma/blocco', 'POST', { ...payload, orderIndex: (day?.blocks ?? []).length })
      }
      // Assicura che giornata e modulo siano espansi prima di ricaricare
      const dayId = editingBlock.dayId
      const parentModule = (program.modules ?? []).find(m => (m.days ?? []).some(d => d.id === dayId))
      setExpandedDays(prev => new Set([...prev, dayId]))
      if (parentModule) setExpandedModules(prev => new Set([...prev, parentModule.id]))
      setEditingBlock(null)
      await reload()
    } finally { setLoading(false) }
  }

  async function handleDeleteBlock(id: string) {
    setLoading(true)
    try { await apiCall('/api/programma/blocco', 'DELETE', { id }); await reload() }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      {(program.modules ?? []).map((mod) => {
        const totalDays = (mod.days ?? []).length
        const totalBlocks = (mod.days ?? []).reduce((acc, d) => acc + (d.blocks ?? []).length, 0)
        const colorClass = MODULE_COLORS[mod.type as ModuleType] ?? 'bg-blue-700'
        const isExpanded = expandedModules.has(mod.id)

        return (
          <div key={mod.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header modulo */}
            <div className={`${colorClass} px-4 py-3 flex items-center gap-3`}>
              <button
                onClick={() => setExpandedModules(prev => {
                  const s = new Set(prev); s.has(mod.id) ? s.delete(mod.id) : s.add(mod.id); return s
                })}
                className="flex items-center gap-2 flex-1 text-left min-w-0"
              >
                {isExpanded ? <ChevronDown size={15} className="text-white/70 flex-shrink-0" /> : <ChevronRight size={15} className="text-white/70 flex-shrink-0" />}
                <span className="text-xs font-semibold text-white/70 bg-white/20 px-2 py-0.5 rounded flex-shrink-0">
                  {MODULE_TYPE_LABELS[mod.type as ModuleType]}
                </span>
                {editingModuleId === mod.id ? (
                  <span onClick={e => e.stopPropagation()} className="flex items-center gap-2 flex-1">
                    <input
                      type="text" value={editModuleTitle} onChange={e => setEditModuleTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleEditModule(mod.id); if (e.key === 'Escape') setEditingModuleId(null) }}
                      autoFocus className="px-2 py-1 text-sm rounded border border-white/30 focus:outline-none bg-white/20 text-white placeholder-white/50 flex-1"
                    />
                    <button onClick={() => handleEditModule(mod.id)} disabled={loading} className="p-1 rounded text-white hover:bg-white/20"><Check size={13} /></button>
                    <button onClick={() => setEditingModuleId(null)} className="p-1 rounded text-white/70 hover:bg-white/20"><X size={13} /></button>
                  </span>
                ) : (
                  <span className="text-sm font-bold text-white truncate">{mod.title}</span>
                )}
              </button>
              {/* Badge contatori */}
              <div className="flex items-center gap-2 flex-shrink-0 text-white/60 text-xs">
                <span>{totalDays} giornate</span>
                <span>·</span>
                <span>{totalBlocks} fasce</span>
              </div>
              {!readOnly && editingModuleId !== mod.id && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => { setEditingModuleId(mod.id); setEditModuleTitle(mod.title) }} className="p-1.5 rounded hover:bg-white/20 text-white/70 hover:text-white transition"><Pencil size={12} /></button>
                  <button onClick={() => handleDeleteModule(mod.id)} disabled={loading} className="p-1.5 rounded hover:bg-white/20 text-white/70 hover:text-white transition"><Trash2 size={12} /></button>
                </div>
              )}
            </div>

            {/* Giornate */}
            {isExpanded && (
              <div>
                {(mod.days ?? []).map((day) => {
                  const blockCount = (day.blocks ?? []).length
                  const isDayExpanded = expandedDays.has(day.id)

                  return (
                    <div key={day.id} className="border-b border-gray-100 last:border-b-0">
                      {/* Header giornata */}
                      <div className="px-4 py-2.5 flex items-center gap-2 bg-gray-50/60">
                        <button
                          onClick={() => setExpandedDays(prev => {
                            const s = new Set(prev); s.has(day.id) ? s.delete(day.id) : s.add(day.id); return s
                          })}
                          className="flex items-center gap-2 flex-1 text-left min-w-0"
                        >
                          {isDayExpanded ? <ChevronDown size={12} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={12} className="text-gray-400 flex-shrink-0" />}
                          {editingDayId === day.id ? (
                            <span onClick={e => e.stopPropagation()} className="flex items-center gap-2 flex-1">
                              <input type="text" value={editDayTitle} onChange={e => setEditDayTitle(e.target.value)} placeholder="Titolo giornata" className="px-2 py-1 text-xs rounded border border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white flex-1" />
                              <input type="date" value={editDayDate} onChange={e => setEditDayDate(e.target.value)} className="px-2 py-1 text-xs rounded border border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
                              <button onClick={() => handleEditDay(day.id)} disabled={loading} className="p-1 rounded text-green-600 hover:bg-green-50"><Check size={12} /></button>
                              <button onClick={() => setEditingDayId(null)} className="p-1 rounded text-gray-400 hover:bg-gray-100"><X size={12} /></button>
                            </span>
                          ) : (
                            <span className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-semibold text-gray-800 truncate">{day.title || 'Giornata'}</span>
                              {day.day_date && (
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1">
                                  <CalendarDays size={10} />
                                  {formatDateShort(day.day_date)}
                                </span>
                              )}
                              {day.linked_session_id && (
                                <span className="text-xs text-blue-600 flex items-center gap-0.5 flex-shrink-0" title="Collegata al calendario">
                                  <Link2 size={10} />
                                </span>
                              )}
                              <span className="text-xs text-gray-300 flex-shrink-0">{blockCount} {blockCount === 1 ? 'fascia' : 'fasce'}</span>
                            </span>
                          )}
                        </button>
                        {!readOnly && editingDayId !== day.id && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => { setEditingDayId(day.id); setEditDayTitle(day.title || ''); setEditDayDate(day.day_date || '') }} className="p-1 rounded hover:bg-blue-50 text-blue-300 hover:text-blue-500 transition"><Pencil size={11} /></button>
                            <button onClick={() => handleDeleteDay(day.id)} disabled={loading} className="p-1 rounded hover:bg-red-50 text-red-300 hover:text-red-500 transition"><Trash2 size={11} /></button>
                            <button onClick={() => openAddBlock(day.id)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition ml-1">
                              <Plus size={11} /> Fascia
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Fasce orarie */}
                      {isDayExpanded && (
                        <div className="px-4 py-2 space-y-1">
                          {(day.blocks ?? []).length === 0 && !readOnly && (
                            <p className="text-xs text-gray-300 py-1.5 text-center">Nessuna fascia oraria — clicca &ldquo;+ Fascia&rdquo; per aggiungerne una</p>
                          )}
                          {sortByTime(day.blocks ?? []).map((block) => (
                            <BlockRow
                              key={block.id}
                              block={block}
                              readOnly={readOnly}
                              onEdit={() => openEditBlock(day.id, block)}
                              onDelete={() => handleDeleteBlock(block.id)}
                              loading={loading}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Aggiungi giornata */}
                {!readOnly && (
                  <div className="px-4 py-2 bg-gray-50/30 border-t border-gray-100">
                    {addingDayToModule === mod.id ? (
                      <div className="space-y-2 py-1">
                        {/* Toggle manual / calendario */}
                        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
                          <button
                            onClick={() => setDayMode('manual')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition ${dayMode === 'manual' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                          >
                            Data manuale
                          </button>
                          <button
                            onClick={() => setDayMode('session')}
                            className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md transition ${dayMode === 'session' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                          >
                            <Link2 size={10} /> Collega al calendario
                          </button>
                        </div>

                        {dayMode === 'session' ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={newDaySessionId}
                              onChange={e => setNewDaySessionId(e.target.value)}
                              className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                            >
                              <option value="">— Scegli lezione dal calendario —</option>
                              {courseSessions.map(s => (
                                <option key={s.id} value={s.id}>
                                  {formatDate(s.session_date)} — {s.title}
                                </option>
                              ))}
                            </select>
                            <button onClick={() => handleAddDay(mod.id)} disabled={loading || !newDaySessionId} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"><Check size={12} /></button>
                            <button onClick={() => { setAddingDayToModule(null); setNewDayTitle(''); setNewDayDate(''); setNewDaySessionId('') }} className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 border border-gray-200"><X size={12} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input type="text" value={newDayTitle} onChange={e => setNewDayTitle(e.target.value)} placeholder="Titolo giornata (es. Giorno 1)" autoFocus className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white flex-1" />
                            <input type="date" value={newDayDate} onChange={e => setNewDayDate(e.target.value)} className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
                            <button onClick={() => handleAddDay(mod.id)} disabled={loading || (!newDayTitle.trim() && !newDayDate)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"><Check size={12} /></button>
                            <button onClick={() => { setAddingDayToModule(null); setNewDayTitle(''); setNewDayDate(''); setNewDaySessionId('') }} className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 border border-gray-200"><X size={12} /></button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button onClick={() => { setAddingDayToModule(mod.id); setDayMode('manual'); setExpandedModules(prev => new Set([...prev, mod.id])) }} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 transition py-1">
                        <Plus size={12} /> Aggiungi giornata
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Aggiungi modulo */}
      {!readOnly && (
        addingModule ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-blue-800">Nuovo livello organizzativo</p>
            <div className="flex gap-2">
              <select value={newModuleType} onChange={e => setNewModuleType(e.target.value as ModuleType)} className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                <option value="week">Settimana</option>
                <option value="module">Modulo</option>
                <option value="block">Blocco tematico</option>
              </select>
              <input
                type="text" value={newModuleTitle} onChange={e => setNewModuleTitle(e.target.value)}
                placeholder="Es. Settimana 1 — Introduzione" autoFocus
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

      {/* Slide panel fascia oraria */}
      {editingBlock && (
        <FasciaPanel
          form={blockForm}
          onChange={setBlockForm}
          onSave={(start, end) => handleSaveBlock(start, end)}
          onClose={() => setEditingBlock(null)}
          courseInstructors={courseInstructors}
          isEdit={!!editingBlock.block}
          loading={loading}
        />
      )}

    </div>
  )
}

// Ordina blocchi per orario crescente; quelli senza orario in fondo
function sortByTime(blocks: ProgramBlock[]): ProgramBlock[] {
  return [...blocks].sort((a, b) => {
    if (!a.start_time && !b.start_time) return a.order_index - b.order_index
    if (!a.start_time) return 1
    if (!b.start_time) return -1
    return a.start_time.localeCompare(b.start_time)
  })
}

// ── Riga fascia oraria ─────────────────────────────────────
function BlockRow({ block, readOnly, onEdit, onDelete, loading }: {
  block: ProgramBlock
  readOnly: boolean
  onEdit: () => void
  onDelete: () => void
  loading: boolean
}) {
  const [confirming, setConfirming] = useState(false)
  const timeStr = block.start_time
    ? `${formatTime(block.start_time)}${block.end_time ? `–${formatTime(block.end_time)}` : ''}`
    : ''

  return (
    <div className={`flex items-stretch rounded-lg overflow-hidden border ${block.is_break ? 'border-amber-100 bg-amber-50' : 'border-gray-100 bg-white'}`}>
      {/* Colonna orario */}
      <div className={`flex-shrink-0 w-20 flex items-center justify-center px-2 py-2 ${block.is_break ? 'bg-amber-100/50' : 'bg-gray-50'}`}>
        <span className={`text-xs font-mono font-bold ${block.is_break ? 'text-amber-700' : 'text-blue-700'}`}>
          {timeStr || '—'}
        </span>
      </div>
      {/* Separatore */}
      <div className={`w-px flex-shrink-0 ${block.is_break ? 'bg-amber-200' : 'bg-gray-100'}`} />
      {/* Contenuto */}
      <div className="flex-1 px-3 py-2 min-w-0">
        <p className={`text-xs font-semibold leading-snug ${block.is_break ? 'text-amber-800' : 'text-gray-800'}`}>
          {block.is_break && <Coffee size={10} className="inline mr-1 text-amber-500" />}
          {block.title}
        </p>
        {block.description && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{block.description}</p>}
        {(block.instructor?.full_name || block.instructor_name) && (
          <p className="text-xs text-blue-600 font-medium mt-0.5">
            {block.instructor?.full_name || block.instructor_name}
          </p>
        )}
      </div>
      {/* Azioni */}
      {!readOnly && (
        <div className="flex-shrink-0 flex items-center px-2 gap-1">
          {confirming ? (
            <>
              <span className="text-xs text-red-500">Eliminare?</span>
              <button onClick={onDelete} disabled={loading} className="px-1.5 py-0.5 rounded text-xs text-white bg-red-500 hover:bg-red-600 disabled:opacity-50">Sì</button>
              <button onClick={() => setConfirming(false)} className="px-1.5 py-0.5 rounded text-xs text-gray-500 border border-gray-200 hover:bg-gray-50">No</button>
            </>
          ) : (
            <>
              <button onClick={onEdit} className="p-1 rounded hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition"><Pencil size={11} /></button>
              <button onClick={() => setConfirming(true)} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition"><Trash2 size={11} /></button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Pannello laterale fascia oraria ────────────────────────
function FasciaPanel({ form, onChange, onSave, onClose, courseInstructors, isEdit, loading }: {
  form: { title: string; description: string; startTime: string; endTime: string; instructorId: string; instructorName: string; isBreak: boolean }
  onChange: (f: typeof form) => void
  onSave: (startTime: string, endTime: string) => void
  onClose: () => void
  courseInstructors: { id: string; full_name: string }[]
  isEdit: boolean
  loading: boolean
}) {
  // Stato locale inizializzato una volta dal form (non risincronizzato dal parent).
  // Controllato localmente: nessuna interferenza da re-render del parent.
  // I ref servono come fallback per leggere il valore DOM al salvataggio (Safari).
  const [startTime, setStartTime] = useState(() => form.startTime)
  const [endTime, setEndTime] = useState(() => form.endTime)
  const startRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLInputElement>(null)

  function handleSave() {
    // Preferisci lo stato locale; se per qualsiasi motivo è vuoto, leggi dal DOM
    const s = startTime || startRef.current?.value || ''
    const e = endTime || endRef.current?.value || ''
    onSave(s, e)
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30" onClick={onClose} />
      {/* Panel */}
      <div className="w-96 bg-white shadow-2xl flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50 flex-shrink-0">
          <Clock size={15} className="text-blue-600 flex-shrink-0" />
          <h3 className="font-semibold text-gray-900 text-sm">{isEdit ? 'Modifica fascia oraria' : 'Nuova fascia oraria'}</h3>
          <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-gray-200 text-gray-400"><X size={15} /></button>
        </div>

        <div className="flex-1 px-5 py-4 space-y-4">
          {/* Pausa toggle */}
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-gray-50 border border-gray-100">
            <div
              onClick={() => onChange({ ...form, isBreak: !form.isBreak })}
              className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${form.isBreak ? 'bg-amber-400' : 'bg-gray-200'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow absolute top-0.5 transition-transform ${form.isBreak ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Pausa</p>
              <p className="text-xs text-gray-400">Caffè, pranzo, break…</p>
            </div>
          </label>

          {/* Titolo */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Titolo *</label>
            <input
              type="text" value={form.title}
              onChange={e => onChange({ ...form, title: e.target.value })}
              placeholder={form.isBreak ? 'Es. Pausa caffè' : 'Es. Tattica difensiva — pressing alto'}
              autoFocus
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Orari */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Inizio</label>
              <input
                ref={startRef}
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Fine</label>
              <input
                ref={endRef}
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Descrizione */}
          {!form.isBreak && (
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Descrizione</label>
              <textarea value={form.description} onChange={e => onChange({ ...form, description: e.target.value })} rows={3} placeholder="Contenuto della lezione, obiettivi, note…" className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            </div>
          )}

          {/* Docente */}
          {!form.isBreak && (
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Docente</label>
              <select
                value={form.instructorId}
                onChange={e => onChange({ ...form, instructorId: e.target.value, instructorName: e.target.value ? '' : form.instructorName })}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              >
                <option value="">— Docente esterno / campo libero —</option>
                <option value="__ALL__">Tutti i docenti del corso</option>
                {courseInstructors.map(i => <option key={i.id} value={i.id}>{i.full_name}</option>)}
              </select>
              {form.instructorId === '' && (
                <input type="text" value={form.instructorName} onChange={e => onChange({ ...form, instructorName: e.target.value })} placeholder="Nome docente esterno" className="w-full mt-2 px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0 bg-gray-50">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-200 border border-gray-200 transition">Annulla</button>
          <button
            onClick={handleSave}
            disabled={loading || !form.title.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {isEdit ? 'Salva modifiche' : 'Aggiungi'}
          </button>
        </div>
      </div>
    </div>
  )
}
