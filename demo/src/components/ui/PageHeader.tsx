import { cn } from '../../lib/utils'

interface Props {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export default function PageHeader({ title, subtitle, actions, className }: Props) {
  return (
    <div className={cn('flex items-start justify-between px-8 pt-8 pb-6 border-b border-border', className)}>
      <div>
        <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
        {subtitle && <p className="text-sm text-text-secondary mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 ml-4">{actions}</div>}
    </div>
  )
}
