'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X, CheckCircle } from 'lucide-react'
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
  quiz_options: QuizOption[]
}

interface EditableOption {
  text: string
  is_correct: boolean
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

  // Edit state
  const [editText, setEditText] = useState('')
  const [editOptions, setEditOptions] = useState<EditableOption[]>([])

  // Add state
  const [newText, setNewText] = useState('')
  const [newOptions, setNewOptions] = useState<EditableOption[]>([
    { text: '', is_correct: true },
    { text: '', is_correct: false },
  ])

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
    setDeletingId(null)
    setAdding(false)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditText('')
    setEditOptions([])
  }

  function cancelAdd() {
    setAdding(false)
    setNewText('')
    setNewOptions([{ text: '', is_correct: true }, { text: '', is_correct: false }])
  }

  function isValidOptions(opts: EditableOption[]) {
    return opts.every(o => o.text.trim()) && opts.some(o => o.is_correct)
  }

  async function handleSaveEdit(questionId: string) {
    if (!editText.trim() || !isValidOptions(editOptions)) return
    setLoading(true)

    await supabase.from('quiz_questions').update({ text: editText.trim() }).eq('id', questionId)
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
        ? { ...q, text: editText.trim(), quiz_options: editOptions.map((o, i) => ({ id: `local-${i}`, text: o.text.trim(), is_correct: o.is_correct, order_index: i })) }
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
      .insert({ quiz_id: quizId, text: newText.trim(), order_index: nextOrder })
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {questions.length} {questions.length === 1 ? 'domanda' : 'domande'}
        </p>
        {!adding && (
          <button
            onClick={() => { setAdding(true); setEditingId(null); setDeletingId(null) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 transition"
            style={{ backgroundColor: '#003DA5' }}
          >
            <Plus size={15} /> Nuova domanda
          </button>
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
                    <p className="text-sm font-semibold text-gray-900">{q.text}</p>
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
