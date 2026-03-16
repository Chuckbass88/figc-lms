import type { ReactNode } from 'react'

interface StatsCardProps {
  title: string
  value: number | string
  icon: ReactNode
  variant?: 'blue' | 'green' | 'amber' | 'purple' | 'red'
  subtitle?: string
}

const VARIANT_STYLES = {
  blue:   { dot: 'bg-blue-500',    icon: 'text-blue-600',    iconBg: 'bg-blue-50'    },
  green:  { dot: 'bg-emerald-500', icon: 'text-emerald-600', iconBg: 'bg-emerald-50' },
  amber:  { dot: 'bg-amber-500',   icon: 'text-amber-600',   iconBg: 'bg-amber-50'   },
  purple: { dot: 'bg-purple-500',  icon: 'text-purple-600',  iconBg: 'bg-purple-50'  },
  red:    { dot: 'bg-red-500',     icon: 'text-red-600',     iconBg: 'bg-red-50'     },
}

export default function StatsCard({ title, value, icon, variant = 'blue', subtitle }: StatsCardProps) {
  const s = VARIANT_STYLES[variant]
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${s.iconBg} ${s.icon}`}>
          {icon}
        </div>
        <span className={`w-2 h-2 rounded-full mt-1 ${s.dot}`} />
      </div>
      <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
      <p className="text-sm text-gray-500 font-medium mt-1">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}
