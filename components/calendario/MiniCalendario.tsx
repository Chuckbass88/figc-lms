'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  sessionDates: string[]   // 'YYYY-MM-DD'
  compact?: boolean        // dimensione ridotta per widget
}

const DAYS_IT = ['L', 'M', 'M', 'G', 'V', 'S', 'D']
const MONTHS_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

function buildGrid(year: number, month: number) {
  // month: 0-indexed
  const firstDay = new Date(year, month, 1)
  // ISO weekday 1=Mon ... 7=Sun → 0-indexed: Mon=0
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = Array(startOffset).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export default function MiniCalendario({ sessionDates, compact = false }: Props) {
  const today = new Date()
  const sessionSet = new Set(sessionDates)

  const [year, setYear] = useState(() => {
    // Inizia dal mese con la prima sessione futura o corrente
    const futureDates = sessionDates.filter(d => d >= today.toISOString().split('T')[0]).sort()
    if (futureDates.length > 0) {
      const d = new Date(futureDates[0])
      return d.getFullYear()
    }
    return today.getFullYear()
  })
  const [month, setMonth] = useState(() => {
    const futureDates = sessionDates.filter(d => d >= today.toISOString().split('T')[0]).sort()
    if (futureDates.length > 0) {
      const d = new Date(futureDates[0])
      return d.getMonth()
    }
    return today.getMonth()
  })

  const todayStr = today.toISOString().split('T')[0]

  function prev() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function next() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const cells = buildGrid(year, month)

  const cell = compact ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
  const header = compact ? 'text-sm' : 'text-base'

  return (
    <div className="select-none">
      {/* Header mese */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prev}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
        >
          <ChevronLeft size={15} className="text-gray-500" />
        </button>
        <span className={`font-semibold text-gray-800 ${header}`}>
          {MONTHS_IT[month]} {year}
        </span>
        <button
          onClick={next}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
        >
          <ChevronRight size={15} className="text-gray-500" />
        </button>
      </div>

      {/* Intestazione giorni */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_IT.map((d, i) => (
          <div key={i} className={`${cell} flex items-center justify-center font-semibold text-gray-400 text-xs`}>
            {d}
          </div>
        ))}
      </div>

      {/* Celle giorni */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className={cell} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isSession = sessionSet.has(dateStr)
          const isToday = dateStr === todayStr
          const isPast = dateStr < todayStr

          return (
            <div
              key={i}
              title={isSession ? 'Sessione di corso' : undefined}
              className={`${cell} flex items-center justify-center rounded-full font-medium transition
                ${isSession && !isToday
                  ? isPast
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-blue-600 text-white shadow-sm'
                  : ''}
                ${isToday && isSession ? 'bg-blue-800 text-white ring-2 ring-blue-300' : ''}
                ${isToday && !isSession ? 'ring-2 ring-gray-300 text-gray-800' : ''}
                ${!isSession && !isToday ? 'text-gray-600 hover:bg-gray-50' : ''}
              `}
            >
              {day}
            </div>
          )
        })}
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" /> Sessione futura
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-100 border border-blue-300 inline-block" /> Sessione passata
        </span>
      </div>
    </div>
  )
}
