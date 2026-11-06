import { cn } from '../../lib/utils'

interface Props {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary' | 'muted'
}

const variants = {
  default: 'bg-bg-elevated text-text-secondary border-border',
  success: 'bg-success-muted text-success-DEFAULT border-success-DEFAULT/20',
  warning: 'bg-warning-muted text-warning-DEFAULT border-warning-DEFAULT/20',
  danger: 'bg-danger-muted text-danger-DEFAULT border-danger-DEFAULT/20',
  primary: 'bg-primary-muted text-primary-DEFAULT border-primary-DEFAULT/20',
  muted: 'bg-bg-overlay text-text-muted border-border',
}

export default function Badge({ children, className, variant = 'default' }: Props) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border', variants[variant], className)}>
      {children}
    </span>
  )
}

export function statusBadge(status: string) {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'primary' | 'muted'> = {
    Active: 'success', Modified: 'warning', Draft: 'muted', Terminated: 'danger', Completed: 'primary',
  }
  return <Badge variant={map[status] || 'muted'}>{status}</Badge>
}

export function asc606Badge(status: string) {
  const map: Record<string, 'success' | 'warning' | 'danger'> = {
    Complete: 'success', 'In Progress': 'warning', 'Needs Attention': 'danger',
  }
  return <Badge variant={map[status] || 'muted'}>{status}</Badge>
}
