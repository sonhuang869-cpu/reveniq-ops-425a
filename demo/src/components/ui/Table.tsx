import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface Column<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  align?: 'left' | 'right' | 'center'
  width?: string
}

interface Props<T> {
  columns: Column<T>[]
  data: T[]
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string) => void
  onRowClick?: (row: T) => void
  keyFn: (row: T) => string
  loading?: boolean
  emptyMessage?: string
}

export default function Table<T>({ columns, data, sortKey, sortDir, onSort, onRowClick, keyFn, loading, emptyMessage = 'No records found' }: Props<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map(col => (
              <th
                key={String(col.key)}
                className={cn(
                  'px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider whitespace-nowrap',
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                  col.sortable ? 'cursor-pointer hover:text-text-secondary select-none' : '',
                  col.width
                )}
                style={col.width ? { width: col.width } : undefined}
                onClick={() => col.sortable && onSort?.(String(col.key))}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && (
                    sortKey === String(col.key)
                      ? sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                      : <ChevronsUpDown size={11} className="opacity-30" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border/50">
                {columns.map(col => (
                  <td key={String(col.key)} className="px-4 py-3">
                    <div className="h-4 bg-bg-elevated rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-text-muted text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map(row => (
              <tr
                key={keyFn(row)}
                className={cn(
                  'border-b border-border/50 transition-colors',
                  onRowClick ? 'cursor-pointer hover:bg-bg-elevated' : 'hover:bg-bg-surface/50'
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(col => (
                  <td
                    key={String(col.key)}
                    className={cn(
                      'px-4 py-3 text-text-primary',
                      col.align === 'right' ? 'text-right font-mono' : col.align === 'center' ? 'text-center' : ''
                    )}
                  >
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[String(col.key)] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
