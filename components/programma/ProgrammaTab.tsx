'use client'

import { useState } from 'react'
import { List, CalendarDays, Users, LayoutTemplate } from 'lucide-react'
import ProgrammaElenco from './ProgrammaElenco'
import ApplicaTemplateModal from '@/components/template/ApplicaTemplateModal'
import ProgrammaPresenze from './ProgrammaPresenze'
import PrintLayout from './PrintLayout'
import StampaModal from './StampaModal'
import CalendarioTabella from '@/components/corso/CalendarioTabella'
import type { CorsoEvento, CorsoPresenza } from '@/lib/types'

type SubTab = 'elenco' | 'calendario' | 'presenze'

interface Student { id: string; full_name: string }

interface Props {
  corsoId: string
  corseName: string
  corseLocation?: string | null
  corseStartDate?: string | null
  corseEndDate?: string | null
  eventi: CorsoEvento[]
  studenti: Student[]
  presenzeAll: CorsoPresenza[]
  canEdit: boolean
  canManage: boolean
}

const SUB_TABS: { id: SubTab; label: string; icon: React.ReactNode }[] = [
  { id: 'elenco',     label: 'Elenco',     icon: <List size={14} /> },
  { id: 'calendario', label: 'Calendario', icon: <CalendarDays size={14} /> },
  { id: 'presenze',   label: 'Presenze',   icon: <Users size={14} /> },
]

export default function ProgrammaTab({
  corsoId, corseName, corseLocation, corseStartDate, corseEndDate,
  eventi, studenti, presenzeAll, canEdit, canManage,
}: Props) {
  const [activeTab, setActiveTab] = useState<SubTab>('elenco')
  const [printSections, setPrintSections] = useState({ elenco: true, presenze: false })
  const [showApplica, setShowApplica] = useState(false)

  return (
    <div className="space-y-4">
      {/* Sub-nav + stampa */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(27,55,104,0.06)' }}>
          {SUB_TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition"
              style={{
                background: activeTab === t.id ? '#1B3768' : 'transparent',
                color: activeTab === t.id ? 'white' : 'rgba(27,55,104,0.5)',
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {canManage && (
          <>
            <button
              onClick={() => setShowApplica(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition hover:bg-gray-50"
              style={{ borderColor: 'rgba(27,55,104,0.15)', color: '#1B3768' }}>
              <LayoutTemplate size={14} /> Applica template
            </button>
            {showApplica && (
              <ApplicaTemplateModal
                corsoId={corsoId}
                corsoHasEventi={eventi.length > 0}
                onClose={() => setShowApplica(false)}
                onDone={() => { setShowApplica(false); window.location.reload() }}
              />
            )}
          </>
        )}

        <StampaModal
          corseName={corseName}
          corsoId={corsoId}
          corseLocation={corseLocation}
          corseStartDate={corseStartDate}
          corseEndDate={corseEndDate}
          eventi={eventi}
          presenze={presenzeAll}
          studenti={studenti}
          sections={printSections}
          onSectionsChange={setPrintSections}
        />
      </div>

      {/* Content */}
      {activeTab === 'elenco' && (
        <ProgrammaElenco eventi={eventi} corseName={corseName} corsoId={corsoId} canManage={canManage} />
      )}

      {activeTab === 'calendario' && (
        <CalendarioTabella
          corsoId={corsoId}
          corsoNome={corseName}
          eventi={eventi}
          canShare={canManage}
        />
      )}

      {activeTab === 'presenze' && (
        <ProgrammaPresenze
          corsoId={corsoId}
          eventi={eventi}
          studenti={studenti}
          canEdit={canEdit}
        />
      )}

      {/* Print-only layout (hidden on screen) */}
      <PrintLayout
        corseName={corseName}
        corseLocation={corseLocation}
        corseStartDate={corseStartDate}
        corseEndDate={corseEndDate}
        eventi={eventi}
        presenze={presenzeAll}
        studenti={studenti}
        sections={printSections}
      />
    </div>
  )
}
