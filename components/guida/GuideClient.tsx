'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronDown, ChevronUp, X, Lightbulb, AlertTriangle, Camera, CheckCircle2, BookOpen, Zap, Minimize2 } from 'lucide-react'
import type { GuideSection } from './guideDataStudente'

interface QuickAction { label: string; sectionId: string }

interface Props {
  role: 'studente' | 'docente'
  userName: string
  sections: GuideSection[]
  quickActions: QuickAction[]
}

// ── Placeholder screenshot ────────────────────────────────────────────────────
function ScreenshotPlaceholder({ label }: { label: string }) {
  return (
    <div className="mt-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center py-6 gap-2">
      <Camera size={20} className="text-gray-300" />
      <p className="text-xs text-gray-400 text-center">{label}</p>
    </div>
  )
}

// ── Step singolo ──────────────────────────────────────────────────────────────
function StepCard({ step, index }: { step: GuideSection['steps'][0]; index: number }) {
  const lines = step.text.split('\n')

  return (
    <div className="flex gap-4 py-5 border-b border-gray-50 last:border-0">
      {/* Numero */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white mt-0.5"
        style={{ backgroundColor: '#1565C0' }}>
        {index + 1}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 mb-1.5">{step.title}</p>

        {/* Testo con newline */}
        <div className="text-sm text-gray-600 leading-relaxed space-y-1">
          {lines.map((line, i) => (
            <p key={i} className={line.startsWith('•') ? 'pl-2' : ''}>
              {line}
            </p>
          ))}
        </div>

        {/* Screenshot placeholder */}
        {step.screenshot
          ? <img src={step.screenshot} alt={step.title} className="mt-3 rounded-xl border border-gray-100 w-full max-w-md" />
          : null
        }

        {/* Tip */}
        {step.tip && (
          <div className="mt-3 flex gap-2 p-3 rounded-xl bg-green-50 border border-green-100">
            <Lightbulb size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-green-800 leading-relaxed"><span className="font-semibold">Consiglio:</span> {step.tip}</p>
          </div>
        )}

        {/* Warning */}
        {step.warning && (
          <div className="mt-3 flex gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
            <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed"><span className="font-semibold">Attenzione:</span> {step.warning}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sezione collassabile ──────────────────────────────────────────────────────
function SectionCard({
  section, isOpen, onToggle, isActive,
}: {
  section: GuideSection
  isOpen: boolean
  onToggle: () => void
  isActive: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && ref.current) {
      setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }
  }, [isOpen])

  return (
    <div
      ref={ref}
      id={`section-${section.id}`}
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        isOpen ? 'border-blue-200 shadow-md' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
      } ${isActive ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
    >
      {/* Header sezione */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left transition"
        style={{ backgroundColor: isOpen ? '#F0F5FF' : 'white' }}
      >
        <span className="text-2xl flex-shrink-0">{section.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${isOpen ? 'text-blue-900' : 'text-gray-900'}`}>{section.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{section.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-400 hidden sm:block">{section.steps.length} step</span>
          {isOpen
            ? <ChevronUp size={16} className="text-blue-500" />
            : <ChevronDown size={16} className="text-gray-400" />
          }
        </div>
      </button>

      {/* Contenuto */}
      {isOpen && (
        <div className="px-5 pb-4 bg-white border-t border-blue-50">
          {section.steps.map((step, i) => (
            <StepCard key={i} step={step} index={i} />
          ))}

          {/* Badge completato */}
          <div className="flex justify-end mt-4">
            <CompletedBadge sectionId={section.id} label={section.title} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Badge "Segnato come completato" ──────────────────────────────────────────
function CompletedBadge({ sectionId, label }: { sectionId: string; label: string }) {
  const key = `guide-done-${sectionId}`
  const [done, setDone] = useState(false)

  useEffect(() => {
    setDone(localStorage.getItem(key) === '1')
  }, [key])

  const toggle = () => {
    if (done) { localStorage.removeItem(key); setDone(false) }
    else       { localStorage.setItem(key, '1'); setDone(true) }
  }

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
        done
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
    >
      <CheckCircle2 size={13} />
      {done ? 'Completato ✓' : 'Segna come completato'}
    </button>
  )
}

// ── Componente principale ─────────────────────────────────────────────────────
export default function GuideClient({ role, userName, sections, quickActions }: Props) {
  const router = useRouter()
  const [search,    setSearch]    = useState('')
  const [openId,    setOpenId]    = useState<string | null>(null)
  const [activeId,  setActiveId]  = useState<string | null>(null)

  // Filtra sezioni per ricerca
  const filtered = search.trim().length < 2
    ? sections
    : sections.filter(s => {
        const q = search.toLowerCase()
        return (
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          (s.tags ?? []).some(t => t.includes(q)) ||
          s.steps.some(st => st.title.toLowerCase().includes(q) || st.text.toLowerCase().includes(q))
        )
      })

  // Jump a sezione da quick action o ricerca
  const jumpTo = useCallback((id: string) => {
    setSearch('')
    setOpenId(id)
    setActiveId(id)
    setTimeout(() => {
      document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setTimeout(() => setActiveId(null), 2000)
    }, 50)
  }, [])

  // Role label
  const roleLabel = role === 'studente' ? 'Corsista' : 'Docente'
  const roleColor = role === 'studente' ? '#29ABE2' : '#1565C0'
  const firstName = userName.split(' ')[0]

  // Progresso completamento (da localStorage)
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const done = sections.filter(s => localStorage.getItem(`guide-done-${s.id}`) === '1').length
    setProgress(Math.round((done / sections.length) * 100))
  })

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ── Hero header ── */}
      <div className="px-6 py-8 text-white" style={{ background: `linear-gradient(135deg, #1B3768 0%, #1565C0 100%)` }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="opacity-70" />
              <span className="text-xs font-medium opacity-70 uppercase tracking-wide">Guida {roleLabel}</span>
            </div>
            <button
              onClick={() => {
                localStorage.setItem('coachlab-guide-floating', '1')
                router.push('/')
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-all border border-white/30"
              title="Riduci la guida a icona flottante — puoi riaprirla quando vuoi"
            >
              <Minimize2 size={13} />
              Riduci a icona
            </button>
          </div>
          <h1 className="text-2xl font-bold mb-1">Ciao {firstName}! 👋</h1>
          <p className="text-sm opacity-80 mb-5">
            Questa guida ti spiega passo dopo passo come usare la piattaforma CoachLab.
          </p>

          {/* Barra progresso completamento */}
          {progress > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs opacity-70">Sezioni completate</p>
                <p className="text-xs font-bold">{progress}%</p>
              </div>
              <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Ricerca */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca nella guida… (es. 'quiz', 'messaggio', 'password')"
              className="w-full pl-10 pr-10 py-3 rounded-xl bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* ── Cosa vuoi fare? ── */}
        {!search && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={15} style={{ color: '#1565C0' }} />
              <p className="text-sm font-bold text-gray-900">Cosa vuoi fare?</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickActions.map(qa => (
                <button
                  key={qa.sectionId}
                  onClick={() => jumpTo(qa.sectionId)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition"
                >
                  {qa.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Risultati ricerca vuoti ── */}
        {search.trim().length >= 2 && filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-sm font-semibold text-gray-700">Nessun risultato per "{search}"</p>
            <p className="text-xs text-gray-400 mt-1">Prova con un termine diverso oppure sfoglia le sezioni sotto</p>
            <button onClick={() => setSearch('')} className="mt-3 text-xs text-blue-600 hover:underline">
              Mostra tutte le sezioni
            </button>
          </div>
        )}

        {/* ── Conteggio risultati ricerca ── */}
        {search.trim().length >= 2 && filtered.length > 0 && (
          <p className="text-xs text-gray-500 px-1">
            {filtered.length} sezione{filtered.length !== 1 ? 'i' : ''} trovata{filtered.length !== 1 ? '' : ''}
            {' '}per "<span className="font-medium text-gray-700">{search}</span>"
          </p>
        )}

        {/* ── Lista sezioni ── */}
        <div className="space-y-3">
          {filtered.map(section => (
            <SectionCard
              key={section.id}
              section={section}
              isOpen={openId === section.id}
              isActive={activeId === section.id}
              onToggle={() => setOpenId(prev => prev === section.id ? null : section.id)}
            />
          ))}
        </div>

        {/* ── Footer ── */}
        <div className="text-center py-6">
          <p className="text-xs text-gray-400">
            Hai ancora bisogno di aiuto?{' '}
            <a href="/messaggi" className="text-blue-600 hover:underline font-medium">
              Scrivi al tuo docente
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
