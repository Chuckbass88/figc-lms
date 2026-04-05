'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Search, CheckCircle, Tag, Loader2, X, Check, Trash2 } from 'lucide-react'
import CreaTemplateModal from '@/components/quiz/CreaTemplateModal'

interface LibOption { id: string; text: string; is_correct: boolean; order_index: number }
interface GenQuestion {
  id: string; text: string; category: string | null; difficulty: string | null
  question_library_options: LibOption[]
}
interface Category { id: string; name: string; scope: string; created_by: string | null }

interface Props {
  initialQuestions: GenQuestion[]
  initialCategories: Category[]
}

const DIFF_COLORS: Record<string, string> = {
  facile: 'bg-green-100 text-green-700',
  medio: 'bg-amber-100 text-amber-700',
  difficile: 'bg-red-100 text-red-700',
}

export default function ArchivioClient({ initialQuestions, initialCategories }: Props) {
  const [questions, setQuestions] = useState(initialQuestions)
  const [categories, setCategories] = useState(initialCategories)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['__nocat__']))
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [filterDifficulty, setFilterDifficulty] = useState<string | null>(null)
  const [bulkCategory, setBulkCategory] = useState('')
  const [bulkDifficulty, setBulkDifficulty] = useState('')
  const [loadingBulk, setLoadingBulk] = useState(false)
  const [updatingDiffId, setUpdatingDiffId] = useState<string | null>(null)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [loadingAddCat, setLoadingAddCat] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let qs = questions
    const s = search.trim().toLowerCase()
    if (s) qs = qs.filter(q => q.text.toLowerCase().includes(s))
    if (filterDifficulty) qs = qs.filter(q => (q.difficulty ?? 'medio') === filterDifficulty)
    return qs
  }, [questions, search, filterDifficulty])

  const groups = useMemo(() => {
    const map = new Map<string, GenQuestion[]>()
    const nocat: GenQuestion[] = []
    const activeCat = filterCategory === '__all__' ? null : filterCategory
    for (const q of filtered) {
      if (activeCat) {
        if (activeCat === '__nocat__') { if (!q.category) nocat.push(q); continue }
        if (q.category !== activeCat) continue
      }
      if (!q.category) { nocat.push(q); continue }
      if (!map.has(q.category)) map.set(q.category, [])
      map.get(q.category)!.push(q)
    }
    return { map, nocat }
  }, [filtered, filterCategory])

  // Quando si attiva un filtro categoria, apri automaticamente quel gruppo
  useMemo(() => {
    if (filterCategory && filterCategory !== '__all__') {
      setOpenGroups(new Set([filterCategory === '__nocat__' ? '__nocat__' : filterCategory]))
    } else if (!filterCategory || filterCategory === '__all__') {
      setOpenGroups(new Set(['__nocat__']))
    }
  }, [filterCategory])

  function toggleGroup(key: string) {
    setOpenGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleGroupSelect(qs: GenQuestion[]) {
    const ids = qs.map(q => q.id)
    const allSelected = ids.every(id => selectedIds.has(id))
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allSelected) ids.forEach(id => next.delete(id))
      else ids.forEach(id => next.add(id))
      return next
    })
  }

  async function handleBulkAssign() {
    if ((!bulkCategory && !bulkDifficulty) || selectedIds.size === 0) return
    setLoadingBulk(true)
    const ids = [...selectedIds]

    if (bulkCategory) {
      const res = await fetch('/api/domande/bulk-category', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, category: bulkCategory }),
      })
      if (res.ok) {
        setQuestions(prev => prev.map(q => selectedIds.has(q.id) ? { ...q, category: bulkCategory } : q))
      }
    }

    if (bulkDifficulty) {
      const res = await fetch('/api/domande/bulk-difficulty', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, difficulty: bulkDifficulty }),
      })
      if (res.ok) {
        setQuestions(prev => prev.map(q => selectedIds.has(q.id) ? { ...q, difficulty: bulkDifficulty } : q))
      }
    }

    setSelectedIds(new Set())
    setBulkCategory('')
    setBulkDifficulty('')
    setLoadingBulk(false)
  }

  const DIFF_CYCLE: Record<string, string> = { facile: 'medio', medio: 'difficile', difficile: 'facile' }

  async function cycleDifficulty(id: string, current: string | null) {
    const next = DIFF_CYCLE[current ?? 'medio'] ?? 'facile'
    setUpdatingDiffId(id)
    const res = await fetch(`/api/domande/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ difficulty: next }),
    })
    if (res.ok) {
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, difficulty: next } : q))
    }
    setUpdatingDiffId(null)
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return
    setLoadingAddCat(true)
    const res = await fetch('/api/domande/categorie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategoryName.trim(), scope: 'system' }),
    })
    if (res.ok) {
      const json = await res.json()
      setCategories(prev => [...prev, json.category])
      setNewCategoryName('')
      setShowAddCategory(false)
    }
    setLoadingAddCat(false)
  }

  async function handleDelete(id: string) {
    await fetch(`/api/domande/${id}`, { method: 'DELETE' })
    setQuestions(prev => prev.filter(q => q.id !== id))
    setDeletingId(null)
  }

  const allCategoryNames = categories.map(c => c.name)

  // ── Accordion group ──────────────────────────────────────────────────────
  function renderGroup(title: string, qs: GenQuestion[], groupKey: string, nocat = false) {
    const isOpen = openGroups.has(groupKey)
    const ids = qs.map(q => q.id)
    const allSelected = ids.length > 0 && ids.every(id => selectedIds.has(id))
    const someSelected = ids.some(id => selectedIds.has(id))

    return (
      <div key={groupKey} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div
          className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none transition ${nocat ? 'bg-amber-50 hover:bg-amber-100/60' : 'hover:bg-gray-50'}`}
          onClick={() => toggleGroup(groupKey)}
        >
          {isOpen
            ? <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
            : <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
          }
          <input
            type="checkbox"
            checked={allSelected}
            ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
            onChange={() => toggleGroupSelect(qs)}
            onClick={e => e.stopPropagation()}
            className="flex-shrink-0 accent-blue-600"
          />
          <span className={`text-sm font-semibold flex-1 ${nocat ? 'text-amber-700' : 'text-gray-900'}`}>
            {title}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${nocat ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
            {qs.length}
          </span>
        </div>

        {/* Rows */}
        {isOpen && (
          <div>
            {qs.map(q => {
              const selected = selectedIds.has(q.id)
              const opts = [...q.question_library_options].sort((a, b) => a.order_index - b.order_index)
              return (
                <div
                  key={q.id}
                  className={`flex items-start gap-3 px-4 py-3 border-t border-gray-50 transition ${selected ? 'bg-blue-50/40' : 'hover:bg-gray-50/60'}`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSelect(q.id)}
                    onClick={e => e.stopPropagation()}
                    className="mt-0.5 flex-shrink-0 accent-blue-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <p className="text-sm font-semibold text-gray-900 flex-1">{q.text}</p>
                      <button
                        onClick={() => cycleDifficulty(q.id, q.difficulty)}
                        disabled={updatingDiffId === q.id}
                        title="Clicca per cambiare difficoltà"
                        className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 transition hover:opacity-70 ${DIFF_COLORS[q.difficulty ?? 'medio'] ?? 'bg-gray-100 text-gray-500'} ${updatingDiffId === q.id ? 'opacity-40' : ''}`}
                      >
                        {q.difficulty ?? 'medio'}
                      </button>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                      {opts.map(opt => (
                        <p key={opt.id} className={`text-xs flex items-center gap-1 ${opt.is_correct ? 'text-green-700 font-semibold' : 'text-gray-400'}`}>
                          {opt.is_correct
                            ? <CheckCircle size={9} className="flex-shrink-0" />
                            : <span className="w-2 h-2 rounded-full border border-gray-300 inline-block flex-shrink-0" />
                          }
                          {opt.text}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {deletingId === q.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDelete(q.id)}
                          className="text-xs text-white bg-red-600 px-2 py-1 rounded-lg hover:bg-red-700 transition"
                        >Sì</button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-lg hover:bg-gray-200 transition"
                        >No</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(q.id)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition"
                        title="Elimina"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const sortedGroups = [...groups.map.entries()].sort(([a], [b]) => a.localeCompare(b, 'it'))

  return (
    <div className="space-y-4">
      {/* Toolbar: search + add category */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca domanda..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {showAddCategory ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddCategory()
                if (e.key === 'Escape') { setShowAddCategory(false); setNewCategoryName('') }
              }}
              placeholder="Nome categoria..."
              className="border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
            />
            <button
              onClick={handleAddCategory}
              disabled={!newCategoryName.trim() || loadingAddCat}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loadingAddCat ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            </button>
            <button
              onClick={() => { setShowAddCategory(false); setNewCategoryName('') }}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddCategory(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 border border-gray-200 transition"
          >
            <Tag size={14} /> Nuova categoria
          </button>
        )}
        <CreaTemplateModal />
      </div>

      {/* Filtri per categoria e difficoltà */}
      {categories.length > 0 && (() => {
        const system = categories.filter(c => c.created_by === null)
        const custom = categories.filter(c => c.created_by !== null)

        const catBtn = (name: string, key: string, activeClass: string, inactiveClass: string) => (
          <button
            key={key}
            onClick={() => setFilterCategory(prev => prev === key ? null : key)}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition border ${
              filterCategory === key
                ? `${activeClass} ring-2 ring-offset-1 ring-current`
                : `${inactiveClass} hover:opacity-80`
            }`}
          >
            {name}
          </button>
        )

        return (
          <div className="space-y-2">
            {/* Riga 1: categorie di default */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-gray-400 font-medium w-20 flex-shrink-0">Categoria</span>
              {catBtn('Tutte', '__all__', 'bg-gray-200 text-gray-700 border-gray-300', 'bg-white text-gray-500 border-gray-200')}
              {catBtn('Senza cat.', '__nocat__', 'bg-amber-200 text-amber-800 border-amber-300', 'bg-amber-50 text-amber-700 border-amber-200')}
              {system.map(c => catBtn(c.name, c.name, 'bg-indigo-200 text-indigo-800 border-indigo-300', 'bg-indigo-100 text-indigo-700 border-indigo-200'))}
            </div>
            {/* Riga 2: categorie aggiunte (se presenti) */}
            {custom.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-gray-400 font-medium w-20 flex-shrink-0">Aggiunte</span>
                {custom.map(c => catBtn(c.name, c.name, 'bg-emerald-200 text-emerald-800 border-emerald-300', 'bg-emerald-100 text-emerald-700 border-emerald-200'))}
              </div>
            )}
            {/* Riga 3: filtro difficoltà */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-gray-400 font-medium w-20 flex-shrink-0">Difficoltà</span>
              {([['tutte', null], ['facile', 'facile'], ['medio', 'medio'], ['difficile', 'difficile']] as [string, string | null][]).map(([label, val]) => (
                <button
                  key={label}
                  onClick={() => setFilterDifficulty(prev => prev === val ? null : val)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition border ${
                    filterDifficulty === val
                      ? val === 'facile' ? 'bg-green-200 text-green-800 border-green-300 ring-2 ring-offset-1 ring-green-400'
                        : val === 'medio' ? 'bg-amber-200 text-amber-800 border-amber-300 ring-2 ring-offset-1 ring-amber-400'
                        : val === 'difficile' ? 'bg-red-200 text-red-800 border-red-300 ring-2 ring-offset-1 ring-red-400'
                        : 'bg-gray-200 text-gray-700 border-gray-300 ring-2 ring-offset-1 ring-gray-400'
                      : val === 'facile' ? 'bg-green-50 text-green-700 border-green-200 hover:opacity-80'
                        : val === 'medio' ? 'bg-amber-50 text-amber-700 border-amber-200 hover:opacity-80'
                        : val === 'difficile' ? 'bg-red-50 text-red-700 border-red-200 hover:opacity-80'
                        : 'bg-white text-gray-500 border-gray-200 hover:opacity-80'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Bulk assign bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex-wrap">
          <span className="text-sm font-semibold text-blue-800 flex-shrink-0">{selectedIds.size} selezionate</span>
          <select
            value={bulkCategory}
            onChange={e => setBulkCategory(e.target.value)}
            className="flex-1 min-w-[140px] border border-blue-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Categoria —</option>
            {allCategoryNames.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={bulkDifficulty}
            onChange={e => setBulkDifficulty(e.target.value)}
            className="border border-blue-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Difficoltà —</option>
            <option value="facile">Facile</option>
            <option value="medio">Medio</option>
            <option value="difficile">Difficile</option>
          </select>
          <button
            onClick={handleBulkAssign}
            disabled={(!bulkCategory && !bulkDifficulty) || loadingBulk}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loadingBulk ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Applica
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-blue-600 hover:text-blue-800 transition"
          >
            Deseleziona
          </button>
        </div>
      )}

      {/* Stats */}
      <p className="text-xs text-gray-400">
        {filtered.length} domande totali
        {(filterCategory || filterDifficulty || search) && (
          <span className="ml-1">
            · {groups.nocat.length + [...groups.map.values()].reduce((a, b) => a + b.length, 0)} visibili
          </span>
        )}
        {groups.nocat.length > 0 && !filterCategory && (
          <span className="ml-1 text-amber-600 font-medium">· {groups.nocat.length} senza categoria</span>
        )}
        {(filterCategory || filterDifficulty) && (
          <button
            onClick={() => { setFilterCategory(null); setFilterDifficulty(null) }}
            className="ml-2 text-blue-500 hover:text-blue-700 underline transition"
          >
            Azzera filtri
          </button>
        )}
      </p>

      {/* Senza categoria — sempre in cima se presenti */}
      {groups.nocat.length > 0 && renderGroup('Senza categoria', groups.nocat, '__nocat__', true)}

      {/* Gruppi per categoria */}
      {sortedGroups.map(([cat, qs]) => renderGroup(cat, qs, cat))}

      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">
            {questions.length === 0 ? 'Nessuna domanda nell\'archivio. Importa un Excel o aggiungi manualmente.' : 'Nessuna domanda trovata.'}
          </p>
        </div>
      )}
    </div>
  )
}
