'use client'

import { useState, useRef, useEffect } from 'react'
import { Info, X } from 'lucide-react'

interface Props {
  content: string
  title?: string
  screenshot?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  size?: 'sm' | 'md'
}

export default function GuideTooltip({ content, title, screenshot, position = 'top', size = 'md' }: Props) {
  const [open, setOpen] = useState(false)
  const ref  = useRef<HTMLDivElement>(null)

  // Chiudi cliccando fuori
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const posClasses: Record<string, string> = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left:   'right-full top-1/2 -translate-y-1/2 mr-2',
    right:  'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <div ref={ref} className="relative inline-flex items-center">
      {/* Bottone ⓘ */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex-shrink-0 rounded-full flex items-center justify-center transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-400
          ${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'}
        `}
        style={{ backgroundColor: '#EFF4FF', color: '#1565C0' }}
        title="Aiuto"
        aria-label="Apri guida"
      >
        <Info size={size === 'sm' ? 10 : 12} />
      </button>

      {/* Popover */}
      {open && (
        <div className={`absolute z-[200] ${posClasses[position]} w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden`}>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-50" style={{ backgroundColor: '#EFF4FF' }}>
            <p className="text-xs font-bold text-blue-800">{title ?? '💡 Suggerimento'}</p>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={12} /></button>
          </div>

          {/* Content */}
          <div className="px-3 py-2.5">
            <p className="text-xs text-gray-700 leading-relaxed">{content}</p>
            {screenshot && (
              <div className="mt-2 rounded-lg overflow-hidden border border-gray-100">
                <img src={screenshot} alt="Screenshot" className="w-full" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
