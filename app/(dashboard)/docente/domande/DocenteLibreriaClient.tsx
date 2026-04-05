'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Search, CheckCircle, Plus, Tag, Loader2, X, Check } from 'lucide-react'
import CondividiBtn from './CondividiBtn'

interface LibOption { id: string; text: string; is_correct: boolean; order_index: number }
interface LibQuestion {
  id: string; text: string; category: string | null; difficulty: string | null
  is_shared: boolean; imported_at: string
  docente_question_library_options: LibOption[]
  profiles?: { full_name: string } | null
}
interface Category { id: string; name: string; scope: string; created_by: string | null }

interface Props {
  myQuestions: LibQuestion[]
  sharedQuestions: LibQuestion[]
  categories: Category[]
}

const DIFF_COLORS: Record<string, string> = {
  facile: 'bg-green-100 text-green-700',
  medio: 'bg-amber-100 text-amber-700',
  difficile: 'bg-red-100 text-red-700',
}

export default function DocenteLibreriaClient({ myQuestions, sharedQuestions, categories }: Props) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['__nocat__']))
  const [openSharedGroups, setOpenSharedGroups] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [loadingAddCat, setLoadingAddCat] = useState(false)
  const [localCategories, setLocalCategories] = useState(categories)

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return myQuestions
    return myQuestions.filter(q => q.text.toLowerCase().includes(s))
  }, [myQuestions, search])

  const filteredShared = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return sharedQuestions
    return sharedQuestions.filter(q => q.text.toLowerCase().includes(s))
  }, [sharedQuestions, search])

  const groups = useMemo(() => {
    const map = new Map<string, LibQuestion[]>()
    const nocat: LibQuestion[] = []
    for (const q of filtered) {
      if (!q.category) { nocat.push(q); continue }
      if (!map.has(q.category)) map.set(q.category, [])
      map.get(q.category)!.push(q)
    }
    return { map, nocat }
  }, [filtered])

  const sharedGroups = useMemo(() => {
    const map = new Map<string, LibQuestion[]>()
    const nocat: LibQuestion[] = []
    for (const q of filteredShared) {
      if (!q.category) { nocat.push(q); continue }
      if (!map.has(q.category)) map.set(q.category, [])
      map.get(q.category)!.push(q)
    }
    return { map, nocat }
  }, [filteredShared])

  function toggleGroup(key: string, isShared = false) {
    const setter = isShared ? setOpenSharedGroups : setOpenGroups
    setter(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return
    setLoadingAddCat(true)
    const res = await fetch('/api/domande/categorie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategoryName.trim(), scope: 'personal' }),
    })
    if (res.ok) {
      const json = await res.json()
      setLocalCategories(prev => [...prev, json.category])
      setNewCategoryName('')
      setShowAddCategory(false)
    }
    setLoadingAddCat(false)
  }

  function renderGroup(
    title: string, qs: LibQuestion[], groupKey: string,
    openSet: Set<string>, toggleFn: (k: string) => void,
    showShare: boolean, nocat = false
  ) {
    const isOpen = openSet.has(groupKey)
    return (
      <div key={groupKey} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div
          className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none transition ${nocat ? 'bg-amber-50 hover:bg-amber-100/60' : 'hover:bg-gray-50'}`}
          onClick={() => toggleFn(groupKey)}
        >
          {isOpen
            ? <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
            : <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
          }
          <span className={`text-sm font-semibold flex-1 ${nocat ? 'text-amber-700' : 'text-gray-900'}`}>
            {title}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${nocat ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
            {qs.length}
          </span>
        </div>
        {isOpen && (
          <div>
            {qs.map(q => {
              const opts = [...q.docente_question_library_options].sort((a, b) => a.order_index - b.order_index)
              return (
                <div key={q.id} className="flex items-start gap-3 px-4 py-3 border-t border-gray-50 hover:bg-gray-50/60 transition">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <p className="text-sm font-semibold text-gray-900 flex-1">{q.text}</p>
                      {q.difficulty && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${DIFF_COLORS[q.difficulty] ?? 'bg-gray-100 text-gray-600'}`}>
                          {q.difficulty}
                        </span>
                      )}
                    </div>
                    {q.profiles && (
                      <p className="text-xs text-gray-400 mb-1">di {(q.profiles as { full_name: string }).full_name}</p>
                    )}
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
                  {showShare && (
                    <div className="flex-shrink-0">
                      <CondividiBtn questionId={q.id} isShared={q.is_shared} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const sortedGroups = [...groups.map.entries()].sort(([a], [b]) => a.localeCompare(b, 'it'))
  const sortedSharedGroups = [...sharedGroups.map.entries()].sort(([a], [b]) => a.localeCompare(b, 'it'))

  return (
    <div className="space-y-10">
      {/* Toolbar */}
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
              placeholder="Nuova categoria..."
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
      </div>

      {/* Categorie chips — riga 1: sistema, riga 2: personali */}
      {localCategories.length > 0 && (() => {
        const system = localCategories.filter(c => c.created_by === null)
        const custom = localCategories.filter(c => c.created_by !== null)
        return (
          <div className="space-y-2 -mt-6">
            {system.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-gray-400 font-medium w-20 flex-shrink-0">Default</span>
                {system.map(c => (
                  <span key={c.id} className="text-xs px-2.5 py-1 rounded-full font-medium bg-indigo-100 text-indigo-700">
                    {c.name}
                  </span>
                ))}
              </div>
            )}
            {custom.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-gray-400 font-medium w-20 flex-shrink-0">Aggiunte</span>
                {custom.map(c => (
                  <span key={c.id} className="text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-100 text-emerald-700">
                    {c.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* La mia libreria */}
      <div className="space-y-3">
        <p className="text-xs text-gray-400">
          {filtered.length} domande{search ? ' trovate' : ''}
          {groups.nocat.length > 0 && (
            <span className="ml-1 text-amber-600 font-medium">· {groups.nocat.length} senza categoria</span>
          )}
        </p>

        {groups.nocat.length > 0 && renderGroup(
          'Senza categoria', groups.nocat, '__nocat__',
          openGroups, k => toggleGroup(k), true, true
        )}
        {sortedGroups.map(([cat, qs]) => renderGroup(
          cat, qs, cat, openGroups, k => toggleGroup(k), true
        ))}
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400 text-sm">
              {myQuestions.length === 0
                ? 'Nessuna domanda. Importa un file Excel o aggiungine dai quiz.'
                : 'Nessuna domanda trovata.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Condivise da altri docenti */}
      {(sharedQuestions.length > 0 || search) && (
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Condivise da altri docenti</h3>
            <p className="text-gray-500 text-sm mt-0.5">{filteredShared.length} domande disponibili</p>
          </div>
          {sharedGroups.nocat.length > 0 && renderGroup(
            'Senza categoria', sharedGroups.nocat, '__shared_nocat__',
            openSharedGroups, k => toggleGroup(k, true), false, true
          )}
          {sortedSharedGroups.map(([cat, qs]) => renderGroup(
            cat, qs, `shared_${cat}`, openSharedGroups, k => toggleGroup(k, true), false
          ))}
          {filteredShared.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
              <p className="text-gray-400 text-sm">Nessuna domanda condivisa trovata.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
