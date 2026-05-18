'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2, Check, AlertCircle, ToggleLeft, List } from 'lucide-react'

interface Category { id: string; name: string; scope: string }
interface Opt { text: string; isCorrect: boolean }

export default function AggiungiDomandaDocenteBtn({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [category, setCategory] = useState('')
  const [difficulty, setDifficulty] = useState<'facile' | 'medio' | 'difficile'>('medio')
  const [tipo, setTipo] = useState<'multipla' | 'vero_falso'>('multipla')
  const [options, setOptions] = useState<Opt[]>([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setCorrect(i: number) {
    setOptions(os => os.map((o, j) => ({ ...o, isCorrect: j === i })))
  }
  function setOptText(i: number, v: string) {
    setOptions(os => os.map((o, j) => j === i ? { ...o, text: v } : o))
  }
  function switchTipo(t: 'multipla' | 'vero_falso') {
    setTipo(t)
    setOptions(t === 'vero_falso'
      ? [{ text: 'Vero', isCorrect: true }, { text: 'Falso', isCorrect: false }]
      : [{ text: '', isCorrect: true }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }])
  }

  function reset() {
    setOpen(false); setError(null); setText(''); setCategory(''); setDifficulty('medio')
    setTipo('multipla')
    setOptions([{ text: '', isCorrect: true }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }])
  }

  const filled = options.filter(o => o.text.trim())
  const valid = text.trim().length > 0 && filled.length >= 2 && options.some(o => o.isCorrect && o.text.trim())

  async function salva() {
    if (!valid || loading) return
    setLoading(true); setError(null)
    const res = await fetch('/api/domande', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text.trim(),
        category: category.trim() || null,
        difficulty,
        options: options.filter(o => o.text.trim()).map(o => ({ text: o.text.trim(), isCorrect: o.isCorrect })),
      }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error ?? 'Errore salvataggio'); return }
    reset()
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition"
        style={{ backgroundColor: '#1EB8E5' }}
      >
        <Plus size={14} /> Aggiungi domanda
      </button>
    )
  }

  const inp = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Aggiungi domanda alla mia libreria</h3>
          <button onClick={reset} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Testo della domanda *</label>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={2} autoFocus
              placeholder="Es. Qual è la distanza regolamentare della barriera su punizione?"
              className={`${inp} resize-none`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Categoria / materia</label>
              <input list="cat-list" value={category} onChange={e => setCategory(e.target.value)}
                placeholder="Es. Regolamento" className={inp} />
              <datalist id="cat-list">
                {categories.map(c => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Difficoltà</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value as 'facile' | 'medio' | 'difficile')}
                className={`${inp} bg-white`}>
                <option value="facile">Facile</option>
                <option value="medio">Medio</option>
                <option value="difficile">Difficile</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600">Tipo:</span>
            <button type="button" onClick={() => switchTipo('multipla')}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition ${tipo === 'multipla' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}>
              <List size={12} /> Scelta multipla
            </button>
            <button type="button" onClick={() => switchTipo('vero_falso')}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition ${tipo === 'vero_falso' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}>
              <ToggleLeft size={12} /> Vero/Falso
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 block">Risposte (seleziona la corretta)</label>
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" name="correct" checked={o.isCorrect}
                  onChange={() => setCorrect(i)} className="accent-green-600 flex-shrink-0" />
                {tipo === 'vero_falso' ? (
                  <span className={`flex-1 px-3 py-1.5 rounded-lg border text-sm ${o.isCorrect ? 'border-green-300 bg-green-50 text-green-800 font-medium' : 'border-gray-200 text-gray-600'}`}>
                    {o.text}
                  </span>
                ) : (
                  <input value={o.text} onChange={e => setOptText(i, e.target.value)}
                    placeholder={`Opzione ${i + 1}${i < 2 ? ' *' : ''}`}
                    className={`flex-1 px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${o.isCorrect ? 'border-green-300 bg-green-50' : 'border-gray-200'}`} />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
              <AlertCircle size={12} className="flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={reset} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-100">
            Annulla
          </button>
          <button onClick={salva} disabled={!valid || loading}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
            style={{ backgroundColor: '#1EB8E5' }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Salva domanda
          </button>
        </div>
      </div>
    </div>
  )
}
