'use client'

import { useState } from 'react'
import { LayoutTemplate } from 'lucide-react'
import ApplicaTemplateModal from '@/components/template/ApplicaTemplateModal'

interface Props {
  corsoId: string
  hasEventi: boolean
}

export default function ApplicaTemplateBtn({ corsoId, hasEventi }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition hover:bg-gray-50"
        style={{ borderColor: 'rgba(27,55,104,0.15)', color: '#1B3768' }}>
        <LayoutTemplate size={14} /> Applica template
      </button>

      {open && (
        <ApplicaTemplateModal
          corsoId={corsoId}
          corsoHasEventi={hasEventi}
          onClose={() => setOpen(false)}
          onDone={() => { setOpen(false); window.location.reload() }}
        />
      )}
    </>
  )
}
