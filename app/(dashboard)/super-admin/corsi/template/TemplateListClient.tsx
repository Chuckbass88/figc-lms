'use client'
import Link from 'next/link'
import { Plus, BookTemplate, Trash2 } from 'lucide-react'
import type { CourseTemplate } from '@/lib/types'

export default function TemplateListClient({
  templates,
}: { templates: CourseTemplate[]; aree: any[] }) {
  async function handleDelete(id: string) {
    if (!confirm('Eliminare questo template?')) return
    await fetch(`/api/course-templates/${id}`, { method: 'DELETE' })
    window.location.reload()
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: '#1B3768' }}>Template Corsi</h1>
        <Link href="/super-admin/corsi/template/nuovo"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: '#0891B2' }}>
          <Plus size={16} /> Nuovo template
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-2xl p-8 text-center"
          style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(27,55,104,0.1)' }}>
          <p className="text-sm" style={{ color: 'rgba(27,55,104,0.5)' }}>
            Nessun template. Crea il primo!
          </p>
        </div>
      ) : templates.map(t => (
        <div key={t.id} className="rounded-2xl p-5 flex items-start gap-4"
          style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(27,55,104,0.1)' }}>
          <BookTemplate size={20} style={{ color: '#0891B2', flexShrink: 0, marginTop: 2 }} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold" style={{ color: '#1B3768' }}>{t.nome}</p>
            {t.tipologia && (
              <p className="text-xs mt-0.5" style={{ color: 'rgba(27,55,104,0.5)' }}>{t.tipologia}</p>
            )}
            <div className="flex gap-3 mt-2 text-xs" style={{ color: 'rgba(27,55,104,0.6)' }}>
              {t.parametri.durata_giorni && <span>{t.parametri.durata_giorni} giorni</span>}
              {t.parametri.materie && <span>{t.parametri.materie.length} materie</span>}
              {t.parametri.tipo_corso && <span className="capitalize">{t.parametri.tipo_corso}</span>}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link href={`/super-admin/corsi/template/${t.id}`}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(8,145,178,0.08)', color: '#0891B2' }}>
              Modifica
            </Link>
            <button onClick={() => handleDelete(t.id)}
              className="p-1.5 rounded-lg transition"
              style={{ color: 'rgba(27,55,104,0.4)' }}>
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
