'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X, CheckCircle, Library, Search, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface QuizOption {
  id: string
  text: string
  is_correct: boolean
  order_index: number
}

interface Question {
  id: string
  text: string
  order_index: number
  points: number
  quiz_options: QuizOption[]
}

interface EditableOption {
  text: string
  is_correct: boolean
}

interface LibOption {
  id: string
  text: string
  is_correct: boolean
  order_index: number
}

interface LibQuestion {
  id: string
  text: string
  category: string | null
  difficulty: string | null
  question_library_options: LibOption[]
}

interface Props {
  quizId: string
  initialQuestions: Question[]
}

export default function DomandeClient({ quizId, initialQuestions }: Props) {
  const [questions, setQuestions] = useState(initialQuestions)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // Library modal state — source: 'general' | 'personal'
  const [showLibrary, setShowLibrary] = useState(false)
  const [librarySource, setLibrarySource] = useState<'general' | 'personal'>('general')
  const [libraryQuestions, setLibraryQuestions] = useState<LibQuestion[]>([])
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  const [selectedLibIds, setSelectedLibIds] = useState<Set<string>>(new Set())
  const [searchLib, setSearchLib] = useState('')
  const [addingFromLib, setAddingFromLib] = useState(false)

  // Edit state
  const [editText, setEditText] = useState('')
  const [editOptions, setEditOptions] = useState<EditableOption[]>([])
  const [editPoints, setEditPoints] = useState(1)

  // Add state
  const [newText, setNewText] = useState('')
  const [newOptions, setNewOptions] = useState<EditableOption[]>([
    { text: '', is_correct: true },
    { text: '', is_correct: false },
  ])
  const [newPoints, setNewPoints] = useState(1)

  function setCorrect(options: EditableOption[], index: number): EditableOption[] {
    return options.map((o, i) => ({ ...o, is_correct: i === index }))
  }

  function addOption(options: EditableOption[], setOptions: (o: EditableOption[]) => void) {
    setOptions([...options, { text: '', is_correct: false }])
  }

  function removeOption(options: EditableOption[], setOptions: (o: EditableOption[]) => void, index: number) {
    if (options.length <= 2) return
    const wasCorrect = options[index].is_correct
    const updated = options.filter((_, i) => i !== index)
    if (wasCorrect) updated[0] = { ...updated[0], is_correct: true }
    setOptions(updated)
  }

  function startEdit(q: Question) {
    setEditingId(q.id)
    setEditText(q.text)
    setEditOptions(q.quiz_options.map(o => ({ text: o.text, is_correct: o.is_correct })))
    setEditPoints(q.points ?? 1)
    setDeletingId(null)
    setAdding(false)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditText('')
    setEditOptions([])
    setEditPoints(1)
  }

  function cancelAdd() {
    setAdding(false)
    setNewText('')
    setNewOptions([{ text: '', is_correct: true }, { text: '', is_correct: false }])
    setNewPoints(1)
  }

  function isValidOptions(opts: EditableOption[]) {
    return opts.every(o => o.text.trim()) && opts.some(o => o.is_correct)
  }

  async function handleSaveEdit(questionId: string) {
    if (!editText.trim() || !isValidOptions(editOptions)) return
    setLoading(true)

    await supabase.from('quiz_questions').update({ text: editText.trim(), points: editPoints }).eq('id', questionId)
    await supabase.from('quiz_options').delete().eq('question_id', questionId)
    await supabase.from('quiz_options').insert(
      editOptions.map((o, i) => ({
        question_id: questionId,
        text: o.text.trim(),
        is_correct: o.is_correct,
        order_index: i,
      }))
    )

    setQuestions(prev => prev.map(q =>
      q.id === questionId
        ? { ...q, text: editText.trim(), points: editPoints, quiz_options: editOptions.map((o, i) => ({ id: `local-${i}`, text: o.text.trim(), is_correct: o.is_correct, order_index: i })) }
        : q
    ))
    setEditingId(null)
    setLoading(false)
  }

  async function handleDelete(questionId: string) {
    setLoading(true)
    await supabase.from('quiz_questions').delete().eq('id', questionId)
    setQuestions(prev => prev.filter(q => q.id !== questionId))
    setDeletingId(null)
    setLoading(false)
  }

  async function handleAdd() {
    if (!newText.trim() || !isValidOptions(newOptions)) return
    setLoading(true)

    const nextOrder = questions.length > 0 ? Math.max(...questions.map(q => q.order_index)) + 1 : 0
    const { data: question } = await supabase
      .from('quiz_questions')
      .insert({ quiz_id: quizId, text: newText.trim(), order_index: nextOrder, points: newPoints })
      .select()
      .single()

    if (question) {
      const { data: opts } = await supabase.from('quiz_options').insert(
        newOptions.map((o, i) => ({
          question_id: question.id,
          text: o.text.trim(),
          is_correct: o.is_correct,
          order_index: i,
        }))
      ).select()

      setQuestions(prev => [...prev, { ...question, quiz_options: opts ?? [] }])
    }

    cancelAdd()
    setLoading(false)
  }

  async function openLibrary(source: 'general' | 'personal') {
    setShowLibrary(true)
    setLibrarySource(source)
    setSelectedLibIds(new Set())
    setSearchLib('')
    setLoadingLibrary(true)

    if (source === 'general') {
      const { data } = await supabase
        .from('question_library')
        .select('id, text, category, difficulty, question_library_options(id, text, is_correct, order_index)')
        .order('imported_at', { ascending: false })
      setLibraryQuestions((data as unknown as LibQuestion[]) ?? [])
    } else {
      const { data } = await supabase
        .from('docente_question_library')
        .select('id, text, category, docente_question_library_options(id, text, is_correct, order_index)')
        .order('imported_at', { ascending: false })
      // Normalizza il nome delle opzioni per riusare lo stesso tipo
      const normalized = ((data ?? []) as unknown as Array<{
        id: string; text: string; category: string | null
        docente_question_library_options: Array<{ id: string; text: string; is_correct: boolean; order_index: number }>
      }>).map(q => ({
        id: q.id,
        text: q.text,
        category: q.category,
        difficulty: null,
        question_library_options: q.docente_question_library_options,
      }))
      setLibraryQuestions(normalized)
    }
    setLoadingLibrary(false)
  }

  function toggleLibSelection(id: string) {
    setSelectedLibIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function handleAddFromLibrary() {
    if (selectedLibIds.size === 0) return
    setAddingFromLib(true)

    const selected = libraryQuestions.filter(q => selectedLibIds.has(q.id))
    let nextOrder = questions.length > 0 ? Math.max(...questions.map(q => q.order_index)) + 1 : 0

    const newQuestions: Question[] = []
    for (const libQ of selected) {
      const pts = libQ.difficulty === 'difficile' ? 2 : 1
      const { data: question } = await supabase
        .from('quiz_questions')
        .insert({ quiz_id: quizId, text: libQ.text, order_index: nextOrder++, points: pts })
        .select()
        .single()

      if (question) {
        const opts = [...libQ.question_library_options].sort((a, b) => a.order_index - b.order_index)
        const { data: insertedOpts } = await supabase.from('quiz_options').insert(
          opts.map((o, i) => ({
            question_id: question.id,
            text: o.text,
            is_correct: o.is_correct,
            order_index: i,
          }))
        ).select()
        newQuestions.push({ ...question, points: question.points ?? 1, quiz_options: insertedOpts ?? [] })
      }
    }

    setQuestions(prev => [...prev, ...newQuestions])
    setShowLibrary(false)
    setAddingFromLib(false)
  }

  const filteredLibQuestions = searchLib.trim()
    ? libraryQuestions.filter(q => q.text.toLowerCase().includes(searchLib.toLowerCase()))
    : libraryQuestions

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-gray-500">
          {questions.length} {questions.length === 1 ? 'domanda' : 'domande'}
        </p>
        {!adding && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => openLibrary('personal')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 border border-gray-200 transition"
            >
              <Library size={15} /> Mia libreria
            </button>
            <button
              onClick={() => openLibrary('general')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 border border-gray-200 transition"
            >
              <Library size={15} /> Archivio generale
            </button>
            <button
              onClick={() => { setAdding(true); setEditingId(null); setDeletingId(null) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 transition"
              style={{ backgroundColor: '#1565C0' }}
            >
              <Plus size={15} /> Nuova domanda
            </button>
          </div>
        )}
      </div>

      {/* Lista domande */}
      <div className="space-y-3">
        {questions.map((q, qi) => (
          <div key={q.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {editingId === q.id ? (
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Testo domanda *</label>
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    autoFocus
                    rows={2}
                    className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Difficoltà</label>
                  <button
                    type="button"
                    onClick={() => setEditPoints(p => p === 1 ? 2 : 1)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition ${editPoints === 2 ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    {editPoints === 2 ? '⚡ Difficile (2 punti)' : '· Standard (1 punto)'}
                  </button>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-2 block">
                    Opzioni — <span className="font-normal text-gray-400">radio = risposta corretta</span>
                  </label>
                  <div className="space-y-2">
                    {editOptions.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`edit-correct-${q.id}`}
                          checked={opt.is_correct}
                          onChange={() => setEditOptions(setCorrect(editOptions, oi))}
                          className="flex-shrink-0 accent-green-600"
                          title="Risposta corretta"
                        />
                        <input
                          type="text"
                          value={opt.text}
                          onChange={e => {
                            const updated = [...editOptions]
                            updated[oi] = { ...updated[oi], text: e.target.value }
                            setEditOptions(updated)
                          }}
                          placeholder={`Opzione ${oi + 1}`}
                          className={`flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${opt.is_correct ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}
                        />
                        {editOptions.length > 2 && (
                          <button
                            onClick={() => removeOption(editOptions, setEditOptions, oi)}
                            className="text-gray-400 hover:text-red-500 transition flex-shrink-0"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => addOption(editOptions, setEditOptions)}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
                  >
                    <Plus size={11} /> Aggiungi opzione
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit(q.id)}
                    disabled={loading || !editText.trim() || !isValidOptions(editOptions)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-green-600 hover:bg-green-700 transition disabled:opacity-50"
                  >
                    <Check size={12} /> Salva
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition"
                  >
                    <X size={12} /> Annulla
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-bold text-gray-400 bg-gray-100 rounded-lg px-2 py-1 flex-shrink-0 mt-0.5 min-w-[28px] text-center">
                    {qi + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <p className="text-sm font-semibold text-gray-900 flex-1">{q.text}</p>
                      {(q.points ?? 1) === 2 && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700 flex-shrink-0">
                          2 pt
                        </span>
                      )}
                    </div>
                    <div className="mt-2 space-y-1">
                      {q.quiz_options.map(opt => (
                        <p key={opt.id} className={`text-xs flex items-center gap-1.5 ${opt.is_correct ? 'text-green-700 font-semibold' : 'text-gray-500'}`}>
                          {opt.is_correct
                            ? <CheckCircle size={11} className="flex-shrink-0" />
                            : <span className="w-2.5 h-2.5 rounded-full border border-gray-300 inline-block flex-shrink-0" />
                          }
                          {opt.text}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {deletingId === q.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-600 font-medium">Eliminare?</span>
                        <button
                          onClick={() => handleDelete(q.id)}
                          disabled={loading}
                          className="px-2 py-1 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition"
                        >
                          Sì
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="px-2 py-1 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(q)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition"
                          title="Modifica"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => { setDeletingId(q.id); setEditingId(null) }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition"
                          title="Elimina"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {questions.length === 0 && !adding && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400 text-sm">Nessuna domanda. Aggiungine una!</p>
          </div>
        )}
      </div>

      {/* Form nuova domanda */}
      {/* Modale libreria domande */}
      {showLibrary && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <Library size={18} className="text-blue-600" />
              <h3 className="text-base font-semibold text-gray-900 flex-1">
                {librarySource === 'personal' ? 'La mia libreria' : 'Archivio generale'}
              </h3>
              <button onClick={() => setShowLibrary(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-3 border-b border-gray-100">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cerca domanda..."
                  value={searchLib}
                  onChange={e => setSearchLib(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
              {loadingLibrary ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-blue-500" />
                </div>
              ) : filteredLibQuestions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-12">
                  {libraryQuestions.length === 0 ? 'Archivio vuoto. Importa prima un file Excel.' : 'Nessuna domanda trovata.'}
                </p>
              ) : (
                filteredLibQuestions.map(q => {
                  const selected = selectedLibIds.has(q.id)
                  const opts = [...q.question_library_options].sort((a, b) => a.order_index - b.order_index)
                  return (
                    <div
                      key={q.id}
                      onClick={() => toggleLibSelection(q.id)}
                      className={`rounded-xl border p-4 cursor-pointer transition ${selected ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          readOnly
                          checked={selected}
                          className="mt-0.5 flex-shrink-0 accent-blue-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            {q.category && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700">
                                {q.category}
                              </span>
                            )}
                            {q.difficulty === 'difficile' && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700">
                                ⚡ 2 pt
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-900">{q.text}</p>
                          <div className="mt-1.5 space-y-0.5">
                            {opts.map(opt => (
                              <p key={opt.id} className={`text-xs flex items-center gap-1.5 ${opt.is_correct ? 'text-green-700 font-semibold' : 'text-gray-400'}`}>
                                {opt.is_correct
                                  ? <CheckCircle size={10} className="flex-shrink-0" />
                                  : <span className="w-2 h-2 rounded-full border border-gray-300 inline-block flex-shrink-0" />
                                }
                                {opt.text}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <p className="text-sm text-gray-500">
                {selectedLibIds.size > 0 ? `${selectedLibIds.size} selezionate` : 'Seleziona le domande da aggiungere'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowLibrary(false)}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition"
                >
                  Annulla
                </button>
                <button
                  onClick={handleAddFromLibrary}
                  disabled={selectedLibIds.size === 0 || addingFromLib}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition disabled:opacity-50"
                >
                  {addingFromLib ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  Aggiungi al quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {adding && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
          <p className="text-sm font-semibold text-blue-800">Nuova domanda</p>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Testo domanda *</label>
            <textarea
              value={newText}
              onChange={e => setNewText(e.target.value)}
              autoFocus
              rows={2}
              placeholder="Scrivi la domanda..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Difficoltà</label>
            <button
              type="button"
              onClick={() => setNewPoints(p => p === 1 ? 2 : 1)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition ${newPoints === 2 ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >
              {newPoints === 2 ? '⚡ Difficile (2 punti)' : '· Standard (1 punto)'}
            </button>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">
              Opzioni — <span className="font-normal text-gray-400">radio = risposta corretta</span>
            </label>
            <div className="space-y-2">
              {newOptions.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="new-correct"
                    checked={opt.is_correct}
                    onChange={() => setNewOptions(setCorrect(newOptions, oi))}
                    className="flex-shrink-0 accent-green-600"
                    title="Risposta corretta"
                  />
                  <input
                    type="text"
                    value={opt.text}
                    onChange={e => {
                      const updated = [...newOptions]
                      updated[oi] = { ...updated[oi], text: e.target.value }
                      setNewOptions(updated)
                    }}
                    placeholder={`Opzione ${oi + 1}`}
                    className={`flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${opt.is_correct ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}
                  />
                  {newOptions.length > 2 && (
                    <button
                      onClick={() => removeOption(newOptions, setNewOptions, oi)}
                      className="text-gray-400 hover:text-red-500 transition flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => addOption(newOptions, setNewOptions)}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
            >
              <Plus size={11} /> Aggiungi opzione
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={loading || !newText.trim() || !isValidOptions(newOptions)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition disabled:opacity-50"
            >
              <Check size={14} /> Aggiungi domanda
            </button>
            <button
              onClick={cancelAdd}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition"
            >
              <X size={14} /> Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
