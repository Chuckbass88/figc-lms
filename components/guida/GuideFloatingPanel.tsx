'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  BookOpen, X, ChevronRight, ChevronDown, ChevronUp,
  ExternalLink, Lightbulb, AlertTriangle, CheckCircle2, Search,
} from 'lucide-react'
import { STUDENTE_SECTIONS, STUDENTE_QUICK_ACTIONS } from './guideDataStudente'
import { DOCENTE_SECTIONS, DOCENTE_QUICK_ACTIONS } from './guideDataDocente'
import type { GuideSection } from './guideDataStudente'

const STORAGE_KEY = 'coachlab-guide-floating'

// ── Step singolo (versione compatta) ─────────────────────────────────────────
function CompactStep({ step, index }: { step: GuideSection['steps'][0]; index: number }) {
  return (
    <div className="flex gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white mt-0.5"
        style={{ backgroundColor: '#1565C0' }}>
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900 mb-1">{step.title}</p>
        <div className="text-xs text-gray-500 leading-relaxed space-y-0.5">
          {step.text.split('\n').map((line, i) => (
            <p key={i} className={line.startsWith('•') ? 'pl-2' : ''}>{line}</p>
          ))}
        </div>
        {step.tip && (
          <div className="mt-2 flex gap-1.5 p-2 rounded-lg bg-green-50 border border-green-100">
            <Lightbulb size={11} className="text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-green-800 leading-relaxed">{step.tip}</p>
          </div>
        )}
        {step.warning && (
          <div className="mt-2 flex gap-1.5 p-2 rounded-lg bg-amber-50 border border-amber-100">
            <AlertTriangle size={11} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed">{step.warning}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sezione collassabile (compatta) ──────────────────────────────────────────
function CompactSection({
  section, isOpen, onToggle,
}: {
  section: GuideSection
  isOpen: boolean
  onToggle: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && ref.current) {
      setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }
  }, [isOpen])

  // Badge completato (solo icona)
  const storageKey = `guide-done-${section.id}`
  const [done, setDone] = useState(false)
  useEffect(() => { setDone(localStorage.getItem(storageKey) === '1') }, [storageKey])

  return (
    <div
      ref={ref}
      id={`fp-section-${section.id}`}
      className={`rounded-xl border transition-all duration-200 overflow-hidden ${
        isOpen ? 'border-blue-200 shadow-sm' : 'border-gray-100 hover:border-gray-200'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition"
        style={{ backgroundColor: isOpen ? '#F0F5FF' : 'white' }}
      >
        <span className="text-lg flex-shrink-0">{section.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold truncate ${isOpen ? 'text-blue-900' : 'text-gray-900'}`}>{section.title}</p>
          <p className="text-[10px] text-gray-400 truncate mt-0.5">{section.steps.length} step</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {done && <CheckCircle2 size={12} className="text-green-500" />}
          {isOpen
            ? <ChevronUp size={14} className="text-blue-500" />
            : <ChevronDown size={14} className="text-gray-400" />
          }
        </div>
      </button>
      {isOpen && (
        <div className="px-3 pb-3 bg-white border-t border-blue-50">
          {section.steps.map((step, i) => (
            <CompactStep key={i} step={step} index={i} />
          ))}
          <div className="flex justify-end mt-2">
            <button
              onClick={() => {
                const v = localStorage.getItem(storageKey) === '1'
                if (v) { localStorage.removeItem(storageKey); setDone(false) }
                else   { localStorage.setItem(storageKey, '1'); setDone(true) }
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                done ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              <CheckCircle2 size={11} />
              {done ? 'Completato ✓' : 'Segna completato'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Pannello principale ───────────────────────────────────────────────────────
interface Props {
  role: string
  userName: string
}

export default function GuideFloatingPanel({ role, userName }: Props) {
  const [isFloating, setIsFloating] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [search, setSearch]           = useState('')
  const [openId, setOpenId]           = useState<string | null>(null)

  // Controlla localStorage solo lato client
  useEffect(() => {
    setIsFloating(localStorage.getItem(STORAGE_KEY) === '1')
  }, [])

  // Ascolta evento custom emesso da GuideClient quando si minimizza
  useEffect(() => {
    const handler = () => {
      setIsFloating(true)
    }
    window.addEventListener('guide:minimize', handler)
    return () => window.removeEventListener('guide:minimize', handler)
  }, [])

  // Dati guida in base al ruolo
  const sections     = role === 'studente' ? STUDENTE_SECTIONS : DOCENTE_SECTIONS
  const quickActions = role === 'studente' ? STUDENTE_QUICK_ACTIONS : DOCENTE_QUICK_ACTIONS
  const guidePath    = role === 'studente' ? '/guida/studente' : '/guida/docente'

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

  const jumpTo = useCallback((id: string) => {
    setSearch('')
    setOpenId(id)
    setTimeout(() => {
      document.getElementById(`fp-section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }, [])

  function dismiss() {
    localStorage.removeItem(STORAGE_KEY)
    setIsFloating(false)
    setIsPanelOpen(false)
  }

  if (!isFloating) return null

  return (
    <>
      {/* ── Pulsante flottante (quando pannello chiuso) ── */}
      {!isPanelOpen && (
        <button
          onClick={() => setIsPanelOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl text-white shadow-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #1B3768 0%, #1565C0 100%)' }}
          title="Apri la guida"
        >
          <BookOpen size={18} />
          <span className="text-sm font-bold">Guida</span>
          <ChevronRight size={14} className="opacity-70" />
        </button>
      )}

      {/* ── Backdrop ── */}
      {isPanelOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
          onClick={() => setIsPanelOpen(false)}
        />
      )}

      {/* ── Pannello slide-in ── */}
      {isPanelOpen && (
        <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col overflow-hidden">

          {/* Header pannello */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1B3768 0%, #1565C0 100%)' }}>
            <div className="flex items-center gap-2 text-white">
              <BookOpen size={16} />
              <span className="font-bold text-sm">Guida CoachLab</span>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href={guidePath}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition"
                title="Apri guida completa"
              >
                <ExternalLink size={11} />
                <span>Completa</span>
              </Link>
              <button
                onClick={() => setIsPanelOpen(false)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition"
                title="Riduci a icona"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={dismiss}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition"
                title="Chiudi guida flottante"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Ricerca */}
          <div className="px-3 py-2.5 border-b border-gray-100 flex-shrink-0">
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cerca nella guida..."
                className="w-full pl-8 pr-8 py-2 rounded-xl bg-gray-100 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Quick actions */}
          {!search && (
            <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0">
              <div className="flex flex-wrap gap-1.5">
                {quickActions.map(qa => (
                  <button
                    key={qa.sectionId}
                    onClick={() => jumpTo(qa.sectionId)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-gray-200 bg-gray-50 text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition"
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lista sezioni */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {search.trim().length >= 2 && filtered.length === 0 && (
              <div className="text-center py-8">
                <p className="text-xs text-gray-500">Nessun risultato per "{search}"</p>
                <button onClick={() => setSearch('')} className="mt-2 text-xs text-blue-600 hover:underline">Mostra tutto</button>
              </div>
            )}
            {filtered.map(section => (
              <CompactSection
                key={section.id}
                section={section}
                isOpen={openId === section.id}
                onToggle={() => setOpenId(prev => prev === section.id ? null : section.id)}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="px-3 py-2.5 border-t border-gray-100 flex-shrink-0">
            <p className="text-[11px] text-gray-400 text-center">
              Ciao {userName.split(' ')[0]}! Clicca su una sezione per espanderla.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
