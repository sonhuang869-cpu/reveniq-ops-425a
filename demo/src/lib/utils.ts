export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatCurrency(amount: number, compact = false): string {
  if (compact) {
    if (Math.abs(amount) >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`
    if (Math.abs(amount) >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
    return `$${amount.toFixed(0)}`
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

export function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatMonthYear(yyyymm: string): string {
  const [y, m] = yyyymm.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function statusColor(status: string): string {
  switch (status) {
    case 'Active': return 'text-success-DEFAULT bg-success-muted'
    case 'Modified': return 'text-warning-DEFAULT bg-warning-muted'
    case 'Draft': return 'text-text-secondary bg-bg-elevated'
    case 'Terminated': return 'text-danger-DEFAULT bg-danger-muted'
    case 'Completed': return 'text-primary-DEFAULT bg-primary-muted'
    default: return 'text-text-secondary bg-bg-elevated'
  }
}

export function asc606StatusColor(status: string): string {
  switch (status) {
    case 'Complete': return 'text-success-DEFAULT'
    case 'In Progress': return 'text-warning-DEFAULT'
    case 'Needs Attention': return 'text-danger-DEFAULT'
    default: return 'text-text-muted'
  }
}
