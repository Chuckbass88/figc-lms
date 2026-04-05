'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Trash2, Loader2, Check, X, Archive, ChevronDown, ChevronRight,
  Search, RefreshCw, Users, Layers, BookOpen, CheckCircle,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LibOption { id: string; text: string; is_correct: boolean; order_index: number }
interface LibQuestion {
  id: string; text: string; category: string | null; difficulty: string | null
  question_library_options: LibOption[]
}
interface TplQuestion {
  libId?: string
  text: string; points: number
  options: { text: string; isCorrect: boolean }[]
}
interface Slot { id: string; category: string; difficulty: string; count: number }
interface Category { id: string; name: string; scope: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const QUIZ_CATS = ['Esame Finale', 'Verifica Intermedia', 'Esercitazione', 'Simulazione']
const DIFF_COLORS: Record<string, string> = {
  facile: 'bg-green-100 text-green-700',
  medio: 'bg-amber-100 text-amber-700',
  difficile: 'bg-red-100 text-red-700',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function libToTpl(q: LibQuestion): TplQuestion {
  return {
    libId: q.id,
    text: q.text,
    points: q.difficulty === 'difficile' ? 2 : 1,
    options: [...q.question_library_options]
      .sort((a, b) => a.order_index - b.order_index)
      .map(o => ({ text: o.text, isCorrect: o.is_correct })),
  }
}

function rndShuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

const defaultQ = (): TplQuestion => ({
  text: '',
  points: 1,
  options: [
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ],
})

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreaTemplateModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const contentScrollRef = useRef<HTMLDivElement>(null)

  // Common form
  const [tab, setTab] = useState<'A' | 'B' | 'C'>('A')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [quizCat, setQuizCat] = useState('')
  const [courseTag, setCourseTag] = useState('')
  const [penaltyWrong, setPenaltyWrong] = useState(false)
  const [saving, setSaving] = useState(false)

  // Library + categories
  const [libAll, setLibAll] = useState<LibQuestion[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [libLoading, setLibLoading] = useState(false)
  const [libSearch, setLibSearch] = useState('')

  const fetchLibrary = useCallback(async () => {
    setLibLoading(true)
    const [libRes, catRes] = await Promise.all([
      fetch('/api/domande'),
      fetch('/api/domande/categorie'),
    ])
    const libData = await libRes.json()
    const catData = await catRes.json()
    setLibAll(libData.questions ?? [])
    setCategories(catData.categories ?? [])
    setLibLoading(false)
  }, [])

  // Always re-fetch when modal opens (to get latest category assignments)
  useEffect(() => {
    if (open && !libLoading) fetchLibrary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Filtered library (search)
  const filteredLib = useMemo(() => {
    const s = libSearch.trim().toLowerCase()
    if (!s) return libAll
    return libAll.filter(q => q.text.toLowerCase().includes(s))
  }, [libAll, libSearch])

  // Count of questions per category name (from libAll, unfiltered)
  const countByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const q of libAll) {
      if (q.category) map.set(q.category, (map.get(q.category) ?? 0) + 1)
    }
    return map
  }, [libAll])

  // ─── Tab A ───────────────────────────────────────────────────────────────────
  const [openA, setOpenA] = useState<Set<string>>(new Set())
  const [qsA, setQsA] = useState<TplQuestion[]>([])

  // ─── Tab B ───────────────────────────────────────────────────────────────────
  const [slots, setSlots] = useState<Slot[]>([])
  const [slotCat, setSlotCat] = useState('')
  const [slotDiff, setSlotDiff] = useState('')
  const [slotCount, setSlotCount] = useState(5)
  const [qsB, setQsB] = useState<TplQuestion[]>([])
  const [extracting, setExtracting] = useState(false)

  // ─── Tab C ───────────────────────────────────────────────────────────────────
  const [openC, setOpenC] = useState<Set<string>>(new Set())
  const [poolC, setPoolC] = useState<TplQuestion[]>([])
  const [qPerStudent, setQPerStudent] = useState(30)

  // ─── Accordion open toggle ────────────────────────────────────────────────────
  // NOTE: pass currentSet to avoid React Strict Mode double-invoke bug
  function toggleOpen(currentSet: Set<string>, setFn: (v: Set<string>) => void, key: string) {
    const n = new Set(currentSet)
    if (n.has(key)) n.delete(key); else n.add(key)
    setFn(n)
  }

  const existA = useMemo(() => new Set(qsA.map(q => q.libId).filter(Boolean) as string[]), [qsA])
  const existC = useMemo(() => new Set(poolC.map(q => q.libId).filter(Boolean) as string[]), [poolC])

  // Single-click add: click a question row → immediately added to the list
  function addQuestionDirect(
    q: LibQuestion,
    existIds: Set<string>,
    setList: (fn: (prev: TplQuestion[]) => TplQuestion[]) => void
  ) {
    if (existIds.has(q.id)) return // already in list
    setList(prev => [...prev, libToTpl(q)])
  }

  // Tab B
  function addSlot() {
    if (slotCount < 1) return
    setSlots(prev => [...prev, { id: crypto.randomUUID(), category: slotCat, difficulty: slotDiff, count: slotCount }])
    setSlotCat(''); setSlotDiff(''); setSlotCount(5)
  }

  function extractB() {
    setExtracting(true)
    const usedIds = new Set<string>()
    const result: TplQuestion[] = []
    for (const slot of slots) {
      const pool = libAll.filter(q => {
        if (usedIds.has(q.id)) return false
        if (slot.category && q.category !== slot.category) return false
        if (slot.difficulty && q.difficulty !== slot.difficulty) return false
        return true
      })
      const picked = rndShuffle(pool).slice(0, slot.count)
      for (const q of picked) { usedIds.add(q.id); result.push(libToTpl(q)) }
    }
    setQsB(result)
    setExtracting(false)
  }

  function replaceB(idx: number) {
    const usedIds = new Set(qsB.map((q, i) => i !== idx ? q.libId : undefined).filter(Boolean) as string[])
    const candidates = libAll.filter(q => !usedIds.has(q.id))
    if (!candidates.length) return
    const [pick] = rndShuffle(candidates)
    setQsB(prev => prev.map((q, i) => i === idx ? libToTpl(pick) : q))
  }

  // Active questions and totals
  const activeQs = tab === 'A' ? qsA : tab === 'B' ? qsB : poolC
  const totalPts = activeQs.reduce((s, q) => s + q.points, 0)

  function isValid() {
    if (!title.trim() || activeQs.length === 0) return false
    if (tab === 'C' && qPerStudent > poolC.length) return false
    if (tab === 'A') {
      for (const q of qsA) {
        if (!q.libId) {
          if (!q.text.trim()) return false
          const filled = q.options.filter(o => o.text.trim())
          if (filled.length < 2 || !q.options.some(o => o.isCorrect && o.text.trim())) return false
        }
      }
    }
    return true
  }

  function focusTitle() {
    // Scroll content area to top, then focus the title input
    contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    setTimeout(() => titleInputRef.current?.focus(), 200)
  }

  function reset() {
    setOpen(false); setTab('A')
    setTitle(''); setDescription(''); setQuizCat(''); setCourseTag(''); setPenaltyWrong(false)
    setLibSearch('')
    setLibAll([]); setCategories([]); setLibLoading(false) // reset so next open re-fetches fresh data
    setOpenA(new Set()); setQsA([])
    setSlots([]); setSlotCat(''); setSlotDiff(''); setSlotCount(5); setQsB([])
    setOpenC(new Set()); setPoolC([]); setQPerStudent(30)
  }

  async function salva() {
    if (!isValid() || saving) return
    setSaving(true)
    const cleanedQs = activeQs.map(q => ({
      text: q.text.trim(),
      points: q.points,
      options: q.options.filter(o => o.text.trim()),
    }))
    await fetch('/api/quiz/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, description, category: quizCat || null,
        course_tag: courseTag || null,
        questions: cleanedQs,
        penalty_wrong: penaltyWrong,
        questions_per_student: tab === 'C' ? qPerStudent : null,
      }),
    })
    setSaving(false)
    reset()
    router.refresh()
  }

  // ─── Accordion group renderer ─────────────────────────────────────────────────

  function renderGroup(
    gTitle: string, gKey: string, qs: LibQuestion[],
    openSet: Set<string>, setOpenFn: (v: Set<string>) => void,
    existIds: Set<string>,
    onClickQ: (q: LibQuestion) => void,
    isNocat: boolean
  ) {
    const isOpen = openSet.has(gKey)
    return (
      <div key={gKey} className="border-b border-gray-100 last:border-0">
        <button
          onClick={() => toggleOpen(openSet, setOpenFn, gKey)}
          className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition ${isNocat ? 'hover:bg-amber-50' : 'hover:bg-gray-50'}`}
        >
          {isOpen
            ? <ChevronDown size={11} className="text-gray-400 flex-shrink-0" />
            : <ChevronRight size={11} className="text-gray-400 flex-shrink-0" />
          }
          <span className={`text-xs font-semibold flex-1 ${isNocat ? 'text-amber-700' : 'text-gray-800'}`}>{gTitle}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isNocat ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
            {qs.length}
          </span>
        </button>
        {isOpen && (
          <div>
            {qs.length === 0 ? (
              <p className="px-6 py-3 text-xs text-gray-400 italic">
                Nessuna domanda in questa categoria. Assegna domande dall&apos;Archivio.
              </p>
            ) : (
              qs.map(q => {
                const isAdded = existIds.has(q.id)
                return (
                  <button
                    key={q.id}
                    onClick={() => onClickQ(q)}
                    disabled={isAdded}
                    title={isAdded ? 'Già aggiunta' : 'Clicca per aggiungere'}
                    className={`w-full text-left px-4 py-2 flex items-start gap-2 transition ${
                      isAdded
                        ? 'opacity-50 cursor-not-allowed bg-gray-50'
                        : 'hover:bg-indigo-50 cursor-pointer'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center ${
                      isAdded ? 'bg-green-500 border-green-500' : 'border-gray-300'
                    }`}>
                      {isAdded && <Check size={8} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-800 leading-snug line-clamp-2">{q.text}</p>
                      {q.difficulty && (
                        <span className={`inline-block text-[10px] px-1 rounded mt-0.5 ${DIFF_COLORS[q.difficulty] ?? 'bg-gray-100 text-gray-500'}`}>
                          {q.difficulty}
                        </span>
                      )}
                    </div>
                    {!isAdded && (
                      <span className="text-[10px] text-indigo-400 flex-shrink-0 mt-0.5 font-medium">+ aggiungi</span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>
    )
  }

  function renderAccordion(
    openSet: Set<string>,
    setOpenFn: (v: Set<string>) => void,
    existIds: Set<string>,
    onClickQ: (q: LibQuestion) => void
  ) {
    // Build per-category question lists from filteredLib
    const nocatQs = filteredLib.filter(q => !q.category)
    const qsByCategory = new Map<string, LibQuestion[]>()
    for (const q of filteredLib) {
      if (!q.category) continue
      if (!qsByCategory.has(q.category)) qsByCategory.set(q.category, [])
      qsByCategory.get(q.category)!.push(q)
    }

    return (
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={libSearch}
              onChange={e => setLibSearch(e.target.value)}
              placeholder="Cerca nell'archivio..."
              className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {libLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-gray-400">
              <Loader2 size={12} className="animate-spin" /> Caricamento archivio...
            </div>
          ) : (
            <>
              {/* Senza categoria — always shown first */}
              {renderGroup('Senza categoria', '__nocat__', nocatQs, openSet, setOpenFn, existIds, onClickQ, true)}
              {/* All known categories — even empty */}
              {categories.map(cat => renderGroup(
                cat.name, cat.name, qsByCategory.get(cat.name) ?? [],
                openSet, setOpenFn, existIds, onClickQ, false
              ))}
            </>
          )}
        </div>
        <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
          <p className="text-[10px] text-gray-400 text-center">
            Clicca su una domanda per aggiungerla alla lista sottostante
          </p>
        </div>
      </div>
    )
  }

  // ─── Question list (shared across tabs) ───────────────────────────────────────

  function renderQList(
    qs: TplQuestion[],
    setQs: (fn: (prev: TplQuestion[]) => TplQuestion[]) => void,
    isTabB: boolean,
    emptyMsg: string
  ) {
    if (qs.length === 0) {
      return (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center">
          <BookOpen size={18} className="text-gray-300 mx-auto mb-1.5" />
          <p className="text-xs text-gray-400">{emptyMsg}</p>
        </div>
      )
    }
    return (
      <div className="space-y-2">
        {qs.map((q, qi) => (
          <div key={qi} className="bg-gray-50 rounded-xl border border-gray-200 p-3">
            <div className="flex items-start gap-2">
              <span className="text-xs font-bold text-gray-400 mt-1 flex-shrink-0 w-5 text-right">{qi + 1}.</span>
              {!q.libId ? (
                <input
                  type="text"
                  value={q.text}
                  onChange={e => setQs(prev => prev.map((x, i) => i === qi ? { ...x, text: e.target.value } : x))}
                  placeholder="Testo domanda"
                  className="flex-1 px-2.5 py-1 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              ) : (
                <p className="flex-1 text-xs text-gray-800 mt-0.5 leading-snug">{q.text}</p>
              )}
              <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                {isTabB && (
                  <button
                    onClick={() => replaceB(qi)}
                    title="Sostituisci con domanda casuale"
                    className="p-1 rounded hover:bg-white text-gray-400 hover:text-indigo-600 transition"
                  >
                    <RefreshCw size={11} />
                  </button>
                )}
                <button
                  onClick={() => setQs(prev => prev.map((x, i) => i === qi ? { ...x, points: x.points === 2 ? 1 : 2 } : x))}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition ${
                    q.points === 2 ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {q.points === 2 ? '⚡2pt' : '1pt'}
                </button>
                <button
                  onClick={() => setQs(prev => prev.filter((_, i) => i !== qi))}
                  className="p-1 text-gray-300 hover:text-red-400 transition"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
            {/* Manual question options */}
            {!q.libId && (
              <div className="ml-7 mt-2 space-y-1.5">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`mq-${qi}`}
                      checked={opt.isCorrect}
                      onChange={() => setQs(prev => prev.map((x, i) => i === qi ? {
                        ...x, options: x.options.map((o, j) => ({ ...o, isCorrect: j === oi }))
                      } : x))}
                      className="flex-shrink-0 accent-green-600"
                    />
                    <input
                      type="text"
                      value={opt.text}
                      onChange={e => setQs(prev => prev.map((x, i) => i === qi ? {
                        ...x, options: x.options.map((o, j) => j === oi ? { ...o, text: e.target.value } : o)
                      } : x))}
                      placeholder={`Opzione ${oi + 1}${oi < 2 ? ' *' : ''}`}
                      className={`flex-1 px-2.5 py-1 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        opt.isCorrect ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'
                      }`}
                    />
                  </div>
                ))}
                <p className="text-[10px] text-gray-400">🟢 Seleziona la risposta corretta con il radio</p>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  // ─── Trigger button ────────────────────────────────────────────────────────────

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition"
      >
        <Archive size={12} /> Crea quiz pre-archiviato
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4 flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Archive size={16} className="text-indigo-600" />
            <h3 className="text-base font-bold text-gray-900">Nuovo quiz pre-archiviato</h3>
          </div>
          <button onClick={reset} className="text-gray-400 hover:text-gray-600 transition"><X size={18} /></button>
        </div>

        {/* Scrollable content */}
        <div ref={contentScrollRef} className="px-6 py-5 space-y-5 overflow-y-auto flex-1">

          {/* Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-gray-600 block mb-1">Titolo *</label>
              <input
                ref={titleInputRef}
                autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Es. Esame UEFA A — Tattica"
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  !title.trim() && activeQs.length > 0 ? 'border-amber-400 bg-amber-50' : 'border-gray-200'
                }`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Tipologia</label>
              <select value={quizCat} onChange={e => setQuizCat(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="">Nessuna</option>
                {QUIZ_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Tag corso</label>
              <input type="text" value={courseTag} onChange={e => setCourseTag(e.target.value)}
                placeholder="Es. Corso GK G"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-gray-600 block mb-1">Descrizione</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Breve descrizione"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Scoring */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Regole punteggio</p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-emerald-50 border-emerald-300 text-emerald-700 cursor-default select-none">
                <CheckCircle size={11} /> +1 Corretta
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-emerald-50 border-emerald-300 text-emerald-700 cursor-default select-none">
                0 Non data
              </div>
              <button
                onClick={() => setPenaltyWrong(v => !v)}
                title="Clicca per attivare/disattivare la penalità"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  penaltyWrong
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600'
                }`}
              >
                −1 Sbagliata
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              {penaltyWrong
                ? '⚡ Penalità attiva: risposta sbagliata −1 pt · non data 0 pt.'
                : 'Clicca "−1 Sbagliata" per attivare la penalità sulle risposte errate.'}
            </p>
          </div>

          {/* Tabs */}
          <div>
            <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
              {([
                { k: 'A' as const, label: 'Manuale', icon: <BookOpen size={13} /> },
                { k: 'B' as const, label: 'Per slot', icon: <Layers size={13} /> },
                { k: 'C' as const, label: 'Pool', icon: <Users size={13} /> },
              ]).map((t, idx) => (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition border-b-2 ${
                    tab === t.k
                      ? 'bg-white text-indigo-700 border-indigo-600 shadow-sm'
                      : `text-gray-500 border-transparent hover:text-gray-700 hover:bg-white/60 ${idx > 0 ? 'border-l border-l-gray-200' : ''}`
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {tab === 'A' && "Scegli domande manualmente dall'archivio o creale ex novo."}
              {tab === 'B' && 'Definisci slot per categoria/difficoltà: il sistema estrae casualmente le domande.'}
              {tab === 'C' && 'Crea un pool ampio: ogni studente riceve un sottoinsieme casuale delle domande.'}
            </p>
          </div>

          {/* ── Tab A ──────────────────────────────────────────────────────────── */}
          {tab === 'A' && (
            <div className="space-y-4">
              {renderAccordion(openA, setOpenA, existA, q => addQuestionDirect(q, existA, setQsA))}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Domande aggiunte{qsA.length > 0 && <span className="font-normal normal-case"> ({qsA.length} · {totalPts} pt)</span>}
                  </p>
                  <button
                    onClick={() => setQsA(prev => [...prev, defaultQ()])}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition"
                  >
                    <Plus size={11} /> Aggiungi manuale
                  </button>
                </div>
                {renderQList(qsA, setQsA, false, "Clicca le domande nell'archivio sopra per aggiungerle, oppure usa \"Aggiungi manuale\".")}
              </div>
            </div>
          )}

          {/* ── Tab B ──────────────────────────────────────────────────────────── */}
          {tab === 'B' && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Definisci slot</p>
                <div className="flex items-end gap-2 flex-wrap">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Categoria</label>
                    <select value={slotCat} onChange={e => setSlotCat(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
                      <option value="">Qualsiasi ({libAll.length})</option>
                      {categories.map(c => {
                        const cnt = countByCategory.get(c.name) ?? 0
                        return <option key={c.id} value={c.name}>{c.name} ({cnt})</option>
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Difficoltà</label>
                    <select value={slotDiff} onChange={e => setSlotDiff(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
                      <option value="">Qualsiasi</option>
                      <option value="facile">Facile</option>
                      <option value="medio">Medio</option>
                      <option value="difficile">Difficile</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">N domande</label>
                    <input
                      type="number" min={1} max={100} value={slotCount}
                      onChange={e => setSlotCount(Number(e.target.value))}
                      className="w-16 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <button onClick={addSlot}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition">
                    <Plus size={11} /> Slot
                  </button>
                </div>
              </div>

              {slots.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {slots.map(s => (
                    <div key={s.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-indigo-200 bg-indigo-50 text-xs text-indigo-800">
                      <span className="font-semibold">{s.count}×</span>
                      <span>{s.category || 'Qualsiasi cat.'}</span>
                      {s.difficulty && (
                        <span className={`px-1 rounded text-[10px] ${DIFF_COLORS[s.difficulty] ?? ''}`}>{s.difficulty}</span>
                      )}
                      <button onClick={() => setSlots(prev => prev.filter(x => x.id !== s.id))}
                        className="text-indigo-400 hover:text-red-500 transition ml-0.5"><X size={9} /></button>
                    </div>
                  ))}
                </div>
              )}

              {slots.length > 0 && (
                <button onClick={extractB} disabled={extracting || libAll.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
                  {extracting ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Estrai domande ({slots.reduce((s, x) => s + x.count, 0)} richieste)
                </button>
              )}

              <div>
                {qsB.length > 0 && (
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Estratte <span className="font-normal normal-case">({qsB.length} · {totalPts} pt) — clicca ↺ per sostituire</span>
                  </p>
                )}
                {renderQList(qsB, setQsB, true, "Definisci slot e clicca \"Estrai domande\".")}
              </div>
            </div>
          )}

          {/* ── Tab C ──────────────────────────────────────────────────────────── */}
          {tab === 'C' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <Users size={18} className="text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-blue-800">Domande per studente</p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Ogni studente riceve {qPerStudent} domande casuali dal pool ({poolC.length} disponibili).
                    {poolC.length > 0 && poolC.length < qPerStudent && (
                      <span className="text-red-600 font-semibold"> Pool insufficiente!</span>
                    )}
                    {poolC.length === 0 && <span> Aggiungi almeno {qPerStudent * 2} domande.</span>}
                  </p>
                </div>
                <input
                  type="number" min={1} max={poolC.length || 999} value={qPerStudent}
                  onChange={e => setQPerStudent(Number(e.target.value))}
                  className="w-16 px-2.5 py-1.5 rounded-lg border border-blue-200 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Costruisci il pool <span className="font-normal normal-case">(consigliato almeno {qPerStudent * 2} domande)</span>
                </p>
                {renderAccordion(openC, setOpenC, existC, q => addQuestionDirect(q, existC, setPoolC))}
              </div>

              <div>
                {poolC.length > 0 && (
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Pool <span className="font-normal normal-case">({poolC.length} domande · {totalPts} pt)</span>
                  </p>
                )}
                {renderQList(poolC, setPoolC, false, `Aggiungi domande dall'archivio sopra per costruire il pool.`)}
              </div>
            </div>
          )}

        </div>

        {/* Footer — fixed, always visible */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <p className="text-xs text-gray-400">
            {!title.trim()
              ? (
                <button
                  onClick={focusTitle}
                  className="text-amber-600 hover:text-amber-700 underline underline-offset-2 font-medium transition"
                >
                  ↑ Inserisci il titolo (campo in cima)
                </button>
              )
              : activeQs.length === 0
                ? <span className="text-amber-600">Aggiungi almeno una domanda</span>
                : `${activeQs.length} domande · ${totalPts} pt`}
          </p>
          <div className="flex gap-2">
            <button onClick={reset} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-100 transition">
              Annulla
            </button>
            <button
              onClick={salva}
              disabled={!isValid() || saving}
              style={{ backgroundColor: isValid() ? '#4f46e5' : undefined }}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold transition ${
                isValid()
                  ? 'text-white hover:opacity-90'
                  : 'text-gray-400 bg-gray-200 cursor-not-allowed'
              }`}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Salva nel paniere
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
