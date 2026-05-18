'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Loader2, Check, X, Library, ExternalLink, GraduationCap } from 'lucide-react'
import { TIPOLOGIE_CORSO } from '@/lib/tipologie-corso'

export interface CourseForQuiz {
  id: string
  name: string
  groups: { id: string; name: string }[]
}

interface Props {
  courses: CourseForQuiz[]
  defaultCourseId?: string
  label?: string
}

const DIFFICOLTA = ['facile', 'medio', 'difficile'] as const

export default function CreaQuizModal({ courses, defaultCourseId, label = 'Crea quiz' }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  // Destinatari
  const [courseId, setCourseId] = useState(defaultCourseId ?? '')
  const [groupId, setGroupId] = useState('')

  // Tipo prova
  const [isEsameFinale, setIsEsameFinale] = useState(false)
  const [gradingScale, setGradingScale] = useState<10 | 30>(30)
  const [courseTag, setCourseTag] = useState('')

  // Info
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')

  // Estrazione dalla libreria
  const [extractCount, setExtractCount] = useState(30)
  const [poolDifficolta, setPoolDifficolta] = useState<string[]>([])
  const [catInput, setCatInput] = useState('')
  const [poolCategories, setPoolCategories] = useState<string[]>([])

  // Regole
  const [passingScore, setPassingScore] = useState(18)
  const [timerMinutes, setTimerMinutes] = useState(30)
  const [penaltyWrong, setPenaltyWrong] = useState(true)
  const [availableFrom, setAvailableFrom] = useState('')
  const [availableUntil, setAvailableUntil] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedCourse = courses.find(c => c.id === courseId)
  const groups = selectedCourse?.groups ?? []

  function toggleDiff(d: string) {
    setPoolDifficolta(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])
  }
  function addCat() {
    const v = catInput.trim()
    if (v && !poolCategories.includes(v)) setPoolCategories(p => [...p, v])
    setCatInput('')
  }

  function reset() {
    setOpen(false); setError(null)
    setGroupId(''); setIsEsameFinale(false); setGradingScale(30); setCourseTag('')
    setTitle(''); setDescription(''); setInstructions('')
    setExtractCount(30); setPoolDifficolta([]); setCatInput(''); setPoolCategories([])
    setPassingScore(18); setTimerMinutes(30); setPenaltyWrong(true)
    setAvailableFrom(''); setAvailableUntil('')
    if (!defaultCourseId) setCourseId('')
  }

  const valid = !!courseId && title.trim().length >= 3 && extractCount >= 1

  async function pubblica() {
    if (!valid || loading) return
    setLoading(true); setError(null)
    const res = await fetch('/api/quiz/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId,
        groupId: groupId || null,
        title: title.trim(),
        description: description.trim() || null,
        instructions: instructions.trim() || null,
        passingScore,
        timerMinutes,
        penaltyWrong,
        availableFrom: availableFrom ? new Date(availableFrom).toISOString() : null,
        availableUntil: availableUntil ? new Date(availableUntil).toISOString() : null,
        isEsameFinale,
        gradingScale,
        category: isEsameFinale ? 'Esame Finale' : null,
        fromLibrary: true,
        courseTag: courseTag || null,
        poolCategories,
        poolDifficolta,
        extractCount,
        questions: [],
      }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error ?? 'Errore durante la creazione'); return }
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
        <Plus size={14} /> {label}
      </button>
    )
  }

  const lbl = 'text-xs font-semibold text-gray-600 block mb-1'
  const inp = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Crea prova {isEsameFinale ? '(esame finale)' : '(quiz)'}</h3>
          <button onClick={reset} className="text-gray-400 hover:text-gray-600 transition"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-6 max-h-[calc(100vh-12rem)] overflow-y-auto">

          {/* Info libreria */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
            <Library size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800 leading-relaxed">
              Le domande vengono estratte automaticamente dalla libreria, in ordine casuale e
              diverse per ogni studente. Qui definisci solo le <strong>regole</strong>.
              <Link href="/docente/domande" target="_blank"
                className="inline-flex items-center gap-1 ml-1 font-semibold text-blue-700 hover:underline">
                Gestisci le tue domande <ExternalLink size={11} />
              </Link>
            </div>
          </div>

          {/* Destinatari */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Destinatari</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {!defaultCourseId && (
                <div className="sm:col-span-2">
                  <label className={lbl}>Corso *</label>
                  <select value={courseId} onChange={e => { setCourseId(e.target.value); setGroupId('') }} className={`${inp} bg-white`}>
                    <option value="">Seleziona corso...</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              {groups.length > 0 && (
                <div>
                  <label className={lbl}>Gruppo</label>
                  <select value={groupId} onChange={e => setGroupId(e.target.value)} className={`${inp} bg-white`}>
                    <option value="">Tutto il corso</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className={lbl}>Tag corso</label>
                <select value={courseTag} onChange={e => setCourseTag(e.target.value)} className={`${inp} bg-white`}>
                  <option value="">Nessuno</option>
                  {TIPOLOGIE_CORSO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Tipo prova */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Tipo prova</h4>
            <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox" checked={isEsameFinale}
                  onChange={e => { setIsEsameFinale(e.target.checked); if (e.target.checked) { setGradingScale(30); setPassingScore(18) } }}
                  className="w-4 h-4 accent-purple-600"
                />
                <GraduationCap size={14} className="text-purple-600" />
                <span className="text-sm font-semibold text-gray-800">Esame finale</span>
                <span className="text-xs text-gray-400">— voto mai visibile allo studente, conta nel peso esame</span>
              </label>
              <div className="flex items-center gap-2 pl-6">
                <span className="text-xs font-medium text-gray-500">Scala voto:</span>
                {([30, 10] as const).map(s => (
                  <button key={s} type="button" onClick={() => setGradingScale(s)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                      gradingScale === s ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    /{s}
                  </button>
                ))}
                <span className="text-xs text-gray-400 ml-1">soglia {gradingScale === 30 ? '18/30' : '6/10'}</span>
              </div>
            </div>
          </div>

          {/* Estrazione dalla libreria */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Estrazione domande</h4>
            <div className="space-y-3">
              <div>
                <label className={lbl}>Quante domande per studente *</label>
                <input type="number" min={1} max={200} value={extractCount}
                  onChange={e => setExtractCount(Math.max(1, Number(e.target.value)))}
                  className={`${inp} w-32`} />
              </div>
              <div>
                <label className={lbl}>Difficoltà (vuoto = tutte)</label>
                <div className="flex gap-2">
                  {DIFFICOLTA.map(d => (
                    <button key={d} type="button" onClick={() => toggleDiff(d)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border capitalize transition ${
                        poolDifficolta.includes(d) ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={lbl}>Materie / categorie (vuoto = tutte)</label>
                <div className="flex gap-2">
                  <input
                    value={catInput}
                    onChange={e => setCatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCat() } }}
                    placeholder="Scrivi e premi Invio (es. Tattica)"
                    className={inp}
                  />
                  <button type="button" onClick={addCat} className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Aggiungi</button>
                </div>
                {poolCategories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {poolCategories.map(c => (
                      <span key={c} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                        {c}
                        <button type="button" onClick={() => setPoolCategories(p => p.filter(x => x !== c))} className="text-gray-400 hover:text-red-500">
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Informazioni */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Informazioni</h4>
            <div className="space-y-3">
              <div>
                <label className={lbl}>Titolo *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} autoFocus
                  placeholder={isEsameFinale ? 'Es. Esame finale UEFA A' : 'Es. Verifica modulo 1'} className={inp} />
              </div>
              <div>
                <label className={lbl}>Descrizione</label>
                <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Breve descrizione" className={inp} />
              </div>
              <div>
                <label className={lbl}>Istruzioni <span className="text-gray-400 font-normal">(mostrate prima di iniziare)</span></label>
                <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={2}
                  className={`${inp} resize-none`} />
              </div>
            </div>
          </div>

          {/* Regole */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Regole</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Punteggio minimo</label>
                <input type="number" min={0} value={passingScore} onChange={e => setPassingScore(Number(e.target.value))} className={inp} />
              </div>
              <div>
                <label className={lbl}>Timer (minuti)</label>
                <input type="number" min={1} max={300} value={timerMinutes} onChange={e => setTimerMinutes(Math.max(1, Number(e.target.value)))} className={inp} />
              </div>
              <div>
                <label className={lbl}>Apre il</label>
                <input type="datetime-local" value={availableFrom} onChange={e => setAvailableFrom(e.target.value)} className={`${inp} text-xs`} />
              </div>
              <div>
                <label className={lbl}>Chiude il</label>
                <input type="datetime-local" value={availableUntil} onChange={e => setAvailableUntil(e.target.value)} className={`${inp} text-xs`} />
              </div>
            </div>
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input type="checkbox" checked={penaltyWrong} onChange={e => setPenaltyWrong(e.target.checked)} className="w-4 h-4 accent-blue-600" />
              <span className="text-xs text-gray-700">Penalità risposta sbagliata (−1 punto)</span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700">{error}</div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={reset} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-100 transition">
            Annulla
          </button>
          <button onClick={pubblica} disabled={!valid || loading}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
            style={{ backgroundColor: '#1EB8E5' }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Pubblica
          </button>
        </div>
      </div>
    </div>
  )
}
