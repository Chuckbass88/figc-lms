'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const STATI = [
  { value: 'draft', label: 'Bozza', color: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
  { value: 'active', label: 'Attivo', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
  { value: 'completed', label: 'Completato', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
]

interface Props {
  courseId: string
  currentStatus: string
}

export default function CambiaStatoBtn({ courseId, currentStatus }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function changeStatus(newStatus: string) {
    if (newStatus === currentStatus) return
    setLoading(newStatus)
    await supabase.from('courses').update({ status: newStatus }).eq('id', courseId)
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-gray-400 mr-1">Stato:</span>
      {STATI.map(s => (
        <button
          key={s.value}
          onClick={() => changeStatus(s.value)}
          disabled={loading !== null}
          className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition disabled:opacity-60 ${
            s.value === currentStatus
              ? s.color + ' ring-2 ring-offset-1 ring-current'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {loading === s.value && <Loader2 size={10} className="animate-spin" />}
          {s.label}
        </button>
      ))}
    </div>
  )
}
