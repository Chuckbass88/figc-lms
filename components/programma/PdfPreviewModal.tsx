'use client'

import { X, Download, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface Props {
  programId: string
  programTitle: string
  onClose: () => void
}

export default function PdfPreviewModal({ programId, programTitle, onClose }: Props) {
  const [loaded, setLoaded] = useState(false)
  const pdfUrl = `/api/programma/${programId}/export-pdf`

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/70">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 text-white flex-shrink-0">
        <span className="text-sm font-semibold truncate flex-1">{programTitle}</span>
        <a
          href={pdfUrl}
          download
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition"
        >
          <Download size={14} /> Scarica PDF
        </a>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition">
          <X size={18} />
        </button>
      </div>

      {/* Iframe preview */}
      <div className="flex-1 relative">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-center text-white/60">
              <Loader2 size={32} className="animate-spin mx-auto mb-3" />
              <p className="text-sm">Generazione PDF in corso…</p>
            </div>
          </div>
        )}
        <iframe
          src={pdfUrl}
          className="w-full h-full border-0"
          onLoad={() => setLoaded(true)}
          title={`Anteprima — ${programTitle}`}
        />
      </div>
    </div>
  )
}
