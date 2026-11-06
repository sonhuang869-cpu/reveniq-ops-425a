import { cn } from '../../lib/utils'
import type { LucideIcon } from 'lucide-react'

interface Props {
  label: string
  value: string
  subValue?: string
  icon: LucideIcon
  trend?: { value: string; positive: boolean }
  accent?: 'primary' | 'success' | 'warning' | 'danger'
  loading?: boolean
}

const accentMap = {
  primary: { icon: 'text-primary-DEFAULT bg-primary-muted', border: 'border-primary-DEFAULT/20' },
  success: { icon: 'text-success-DEFAULT bg-success-muted', border: 'border-success-DEFAULT/20' },
  warning: { icon: 'text-warning-DEFAULT bg-warning-muted', border: 'border-warning-DEFAULT/20' },
  danger: { icon: 'text-danger-DEFAULT bg-danger-muted', border: 'border-danger-DEFAULT/20' },
}

export default function KpiCard({ label, value, subValue, icon: Icon, trend, accent = 'primary', loading }: Props) {
  const a = accentMap[accent]
  return (
    <div className={cn('bg-bg-surface rounded-xl p-5 border', a.border)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">{label}</div>
          {loading ? (
            <div className="h-7 w-32 bg-bg-elevated rounded animate-pulse mt-1" />
          ) : (
            <div className="text-2xl font-semibold font-mono text-text-primary">{value}</div>
          )}
          {subValue && !loading && (
            <div className="text-xs text-text-muted mt-0.5">{subValue}</div>
          )}
          {trend && !loading && (
            <div className={cn('flex items-center gap-1 text-xs mt-1.5', trend.positive ? 'text-success-DEFAULT' : 'text-danger-DEFAULT')}>
              <span>{trend.positive ? '↑' : '↓'}</span>
              <span>{trend.value}</span>
            </div>
          )}
        </div>
        <div className={cn('p-2.5 rounded-lg', a.icon)}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}
