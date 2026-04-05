'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Share2, Check } from 'lucide-react'

export default function CondividiBtn({ questionId, isShared }: { questionId: string; isShared: boolean }) {
  const [shared, setShared] = useState(isShared)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function toggle() {
    setLoading(true)
    const { error } = await supabase
      .from('docente_question_library')
      .update({ is_shared: !shared })
      .eq('id', questionId)
    if (!error) setShared(s => !s)
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={shared ? 'Condivisa — clicca per rendere privata' : 'Rendi condivisa con altri docenti'}
      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition ${
        shared
          ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
          : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
      }`}
    >
      {shared ? <Check size={11} /> : <Share2 size={11} />}
      {shared ? 'Condivisa' : 'Condividi'}
    </button>
  )
}
