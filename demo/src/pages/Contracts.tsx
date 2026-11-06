import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Table, { type Column } from '../components/ui/Table'
import { statusBadge } from '../components/ui/Badge'
import { getContracts } from '../lib/api'
import { formatCurrency, formatDate } from '../lib/utils'
import type { Contract, ContractStatus } from '../lib/types'

const PAGE_SIZE = 10

export default function Contracts() {
  const navigate = useNavigate()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'All'>('All')
  const [sortKey, setSortKey] = useState<string>('contractNumber')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)

  useEffect(() => {
    getContracts().then(c => { setContracts(c); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    let result = contracts
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        c.contractNumber.toLowerCase().includes(q) ||
        c.customer.toLowerCase().includes(q) ||
        c.salesperson.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'All') result = result.filter(c => c.status === statusFilter)
    result = [...result].sort((a, b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const av = (a as any)[sortKey]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bv = (b as any)[sortKey]
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
    return result
  }, [contracts, search, statusFilter, sortKey, sortDir])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleSort(key: string) {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  const columns: Column<Contract>[] = [
    { key: 'contractNumber', header: 'Contract #', sortable: true, width: '130px',
      render: c => <span className="font-mono text-xs font-medium text-primary-DEFAULT">{c.contractNumber}</span> },
    { key: 'customer', header: 'Customer', sortable: true,
      render: c => <span className="font-medium text-text-primary">{c.customer}</span> },
    { key: 'tcv', header: 'TCV', sortable: true, align: 'right',
      render: c => <span className="text-text-primary">{formatCurrency(c.tcv)}</span> },
    { key: 'startDate', header: 'Start', sortable: true,
      render: c => <span className="text-text-secondary text-xs">{formatDate(c.startDate)}</span> },
    { key: 'endDate', header: 'End', sortable: true,
      render: c => <span className="text-text-secondary text-xs">{formatDate(c.endDate)}</span> },
    { key: 'status', header: 'Status', sortable: true, align: 'center',
      render: c => statusBadge(c.status) },
    { key: 'recognizedToDate', header: 'Recognized', sortable: true, align: 'right',
      render: c => (
        <div className="text-right">
          <div className="text-text-primary">{formatCurrency(c.recognizedToDate)}</div>
          <div className="text-2xs text-text-muted">{((c.recognizedToDate / c.tcv) * 100).toFixed(0)}% of TCV</div>
        </div>
      )},
    { key: 'deferredBalance', header: 'Deferred', sortable: true, align: 'right',
      render: c => <span className="text-warning-DEFAULT">{formatCurrency(c.deferredBalance)}</span> },
    { key: 'id', header: '', width: '48px',
      render: c => (
        <button
          onClick={e => { e.stopPropagation(); navigate(`/contracts/${c.id}`) }}
          className="p-1.5 text-text-muted hover:text-primary-DEFAULT hover:bg-primary-muted rounded transition-colors"
        >
          <ExternalLink size={13} />
        </button>
      )},
  ]

  const STATUSES: (ContractStatus | 'All')[] = ['All', 'Active', 'Modified', 'Draft', 'Completed', 'Terminated']

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Contract Management"
        subtitle={`${contracts.length} contracts · ${contracts.filter(c => c.status === 'Active').length} active`}
        actions={
          <button
            onClick={() => navigate('/contracts/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-DEFAULT text-white text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            <Plus size={15} />
            New Contract
          </button>
        }
      />

      <div className="px-8 py-6 space-y-4">

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search contracts, customers…"
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-bg-surface border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-DEFAULT/50 focus:bg-bg-elevated transition-colors"
            />
          </div>
          <div className="flex items-center gap-1 p-1 bg-bg-surface rounded-lg border border-border">
            <Filter size={12} className="text-text-muted ml-1 mr-0.5" />
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1) }}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  statusFilter === s ? 'bg-primary-muted text-primary-DEFAULT' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-bg-surface rounded-xl border border-border overflow-hidden">
          <Table
            columns={columns}
            data={pageData}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            onRowClick={c => navigate(`/contracts/${c.id}`)}
            keyFn={c => c.id}
            loading={loading}
            emptyMessage="No contracts match your filters"
          />

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-text-muted">
              <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="p-1.5 rounded hover:bg-bg-elevated disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`w-7 h-7 rounded text-xs ${page === i + 1 ? 'bg-primary-DEFAULT text-white' : 'hover:bg-bg-elevated'}`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="p-1.5 rounded hover:bg-bg-elevated disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Totals footer */}
        {!loading && filtered.length > 0 && (
          <div className="bg-bg-surface/50 rounded-lg border border-border px-5 py-3 grid grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-text-muted">Filtered contracts: </span>
              <span className="font-mono font-medium text-text-primary">{filtered.length}</span>
            </div>
            <div>
              <span className="text-text-muted">Total TCV: </span>
              <span className="font-mono font-medium text-text-primary">{formatCurrency(filtered.reduce((s, c) => s + c.tcv, 0))}</span>
            </div>
            <div>
              <span className="text-text-muted">Total Recognized: </span>
              <span className="font-mono font-medium text-success-DEFAULT">{formatCurrency(filtered.reduce((s, c) => s + c.recognizedToDate, 0))}</span>
            </div>
            <div>
              <span className="text-text-muted">Total Deferred: </span>
              <span className="font-mono font-medium text-warning-DEFAULT">{formatCurrency(filtered.reduce((s, c) => s + c.deferredBalance, 0))}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
