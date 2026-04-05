'use client'

import { useState } from 'react'
import { Plus, X, Check, Loader2 } from 'lucide-react'

const DIFFICOLTA = ['facile', 'medio', 'difficile']

interface Option { text: string; isCorrect: boolean }

const defaultOptions = (): Option[] => [
  { text: '', isCorrect: true },
  { text: '', isCorrect: false },
  { text: '', isCorrect: false },
  { text: '', isCorrect: false },
]

interface Props {
  categories: string[]
}

export default function AggiungiDomandaBtn({ categories }: Props) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [category, setCategory] = useState('')
  const [difficulty, setDifficulty] = useState('medio')
  const [options, setOptions] = useState<Option[]>(defaultOptions())
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateOption(i: number, field: 'text' | 'isCorrect', value: string | boolean) {
    setOptions(opts => opts.map((o, j) => {
      if (field === 'isCorrect') return { ...o, isCorrect: j === i }
      return j === i ? { ...o, [field]: value as string } : o
    }))
  }

  const isValid = text.trim() && options.filter(o => o.text.trim()).length >= 2 && options.some(o => o.isCorrect && o.text.trim())

  async function handleSave() {
    if (!isValid || loading) return
    setLoading(true)
    setError(null)
    const res = await fetch('/api/domande', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, category, difficulty, options: options.filter(o => o.text.trim()) }),
    })
    setLoading(false)
    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'Errore')
      return
    }
    setSaved(true)
    setTimeout(() => {
      setOpen(false)
      setText(''); setCategory(''); setDifficulty('medio')
      setOptions(defaultOptions()); setSaved(false)
      window.location.reload()
    }, 800)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition"
      >
        <Plus size={14} /> Aggiungi manuale
      </button>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-5 space-y-4 w-full">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900 text-sm">Nuova domanda</h4>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Testo domanda *</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={2}
          autoFocus
          placeholder="Scrivi la domanda..."
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Categoria</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">— Nessuna —</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Difficoltà</label>
          <select
            value={difficulty}
            onChange={e => setDifficulty(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {DIFFICOLTA.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-2">Risposte * <span className="text-gray-400 font-normal">(seleziona quella corretta)</span></label>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct-opt"
                checked={opt.isCorrect}
                onChange={() => updateOption(i, 'isCorrect', true)}
                className="flex-shrink-0 accent-green-600"
              />
              <input
                value={opt.text}
                onChange={e => updateOption(i, 'text', e.target.value)}
                placeholder={`Opzione ${i + 1}${i < 2 ? ' *' : ''}`}
                className={`flex-1 px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${opt.isCorrect ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}
              />
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={!isValid || loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition"
          style={{ backgroundColor: '#1565C0' }}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : <Plus size={13} />}
          {saved ? 'Salvata!' : 'Salva domanda'}
        </button>
        <button onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition">
          Annulla
        </button>
      </div>
    </div>
  )
}
