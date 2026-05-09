'use client'
import { useState } from 'react'
import { Shield, Check, X } from 'lucide-react'
import { ADMIN_PERMISSIONS, ADMIN_PERMISSION_LABELS, type AdminPermissionKey } from '@/lib/types'
import type { AdminPermission } from '@/lib/types'

interface Props {
  admin: { id: string; full_name: string | null; email: string }
  permessi: AdminPermission[]
}

export default function PermessiAdminClient({ admin, permessi }: Props) {
  const initMap = () => {
    const m: Record<string, boolean> = {}
    ADMIN_PERMISSIONS.forEach(k => { m[k] = false })
    permessi.forEach(p => { m[p.permission_key] = p.enabled })
    return m
  }
  const [perms, setPerms] = useState<Record<string, boolean>>(initMap)
  const [saving, setSaving] = useState<string | null>(null)

  async function toggle(key: AdminPermissionKey) {
    setSaving(key)
    const newVal = !perms[key]
    const res = await fetch(`/api/admin/permessi/${admin.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permission_key: key, enabled: newVal }),
    })
    if (res.ok) setPerms(p => ({ ...p, [key]: newVal }))
    setSaving(null)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Shield size={22} style={{ color: '#1B3768' }} />
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1B3768' }}>
            Permessi — {admin.full_name}
          </h1>
          <p className="text-sm" style={{ color: 'rgba(27,55,104,0.5)' }}>{admin.email}</p>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(27,55,104,0.1)', background: 'rgba(255,255,255,0.6)' }}>
        {ADMIN_PERMISSIONS.map((key) => (
          <div key={key}
            className="flex items-center justify-between px-5 py-4 border-t first:border-t-0"
            style={{ borderColor: 'rgba(27,55,104,0.07)' }}>
            <span className="text-sm font-medium" style={{ color: '#1B3768' }}>
              {ADMIN_PERMISSION_LABELS[key]}
            </span>
            <button
              onClick={() => toggle(key)}
              disabled={saving === key}
              className="w-12 h-6 rounded-full transition-all duration-200 flex items-center px-0.5 relative flex-shrink-0"
              style={{
                background: perms[key] ? '#0891B2' : 'rgba(27,55,104,0.15)',
                opacity: saving === key ? 0.6 : 1,
              }}
            >
              <span
                className="w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 flex items-center justify-center"
                style={{ transform: perms[key] ? 'translateX(24px)' : 'translateX(0)' }}
              >
                {perms[key]
                  ? <Check size={10} style={{ color: '#0891B2' }} />
                  : <X size={10} style={{ color: 'rgba(27,55,104,0.3)' }} />}
              </span>
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs" style={{ color: 'rgba(27,55,104,0.4)' }}>
        Le modifiche ai permessi sono applicate immediatamente.
      </p>
    </div>
  )
}
