'use client'

interface Props {
  value: number | null
  onChange: (v: number) => void
  min?: number
  max?: number
}

function scoreColor(n: number): string {
  if (n <= 4) return 'border-red-300 bg-red-500 text-white'
  if (n <= 6) return 'border-amber-300 bg-amber-500 text-white'
  if (n <= 8) return 'border-blue-300 bg-blue-600 text-white'
  return 'border-green-400 bg-green-600 text-white'
}

function idleColor(n: number): string {
  if (n <= 4) return 'border-red-200 text-red-400 hover:bg-red-50 active:bg-red-100'
  if (n <= 6) return 'border-amber-200 text-amber-500 hover:bg-amber-50 active:bg-amber-100'
  if (n <= 8) return 'border-blue-200 text-blue-500 hover:bg-blue-50 active:bg-blue-100'
  return 'border-green-200 text-green-600 hover:bg-green-50 active:bg-green-100'
}

export default function ScoreSelector({ value, onChange, min = 1, max = 10 }: Props) {
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => i + min)
  const half = Math.ceil(numbers.length / 2)
  const row1 = numbers.slice(0, half)
  const row2 = numbers.slice(half)

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {row1.map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 min-w-0 h-11 rounded-xl border-2 text-sm font-bold transition-all touch-manipulation select-none
              ${value === n ? scoreColor(n) + ' shadow-sm scale-105' : idleColor(n) + ' bg-white'}`}
          >
            {n}
          </button>
        ))}
      </div>
      {row2.length > 0 && (
        <div className="flex gap-2">
          {row2.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`flex-1 min-w-0 h-11 rounded-xl border-2 text-sm font-bold transition-all touch-manipulation select-none
                ${value === n ? scoreColor(n) + ' shadow-sm scale-105' : idleColor(n) + ' bg-white'}`}
            >
              {n}
            </button>
          ))}
        </div>
      )}
      {value !== null && (
        <div className="flex justify-end">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            value <= 4 ? 'bg-red-50 text-red-600' :
            value <= 6 ? 'bg-amber-50 text-amber-700' :
            value <= 8 ? 'bg-blue-50 text-blue-700' :
            'bg-green-50 text-green-700'
          }`}>
            {value <= 4 ? 'Insufficiente' : value <= 6 ? 'Sufficiente' : value <= 8 ? 'Buono' : 'Ottimo'}
          </span>
        </div>
      )}
    </div>
  )
}
