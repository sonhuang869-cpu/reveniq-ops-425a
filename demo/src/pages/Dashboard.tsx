import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DollarSign, TrendingUp, Clock, FileText, AlertTriangle, CheckCircle2, AlertCircle, Circle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import PageHeader from '../components/ui/PageHeader'
import KpiCard from '../components/ui/KpiCard'
import Badge, { statusBadge } from '../components/ui/Badge'
import { getPortfolioKpis, getAuditTrail, getContracts, resetDemoData, type PortfolioKpis } from '../lib/api'
import { formatCurrency, formatDate, asc606StatusColor } from '../lib/utils'
import type { Contract, AuditEntry } from '../lib/types'

const ASC606_STEPS = [
  'Identify Contract',
  'Identify POs',
  'Determine Price',
  'Allocate Price',
  'Recognize Revenue',
] as const

const STEP_KEYS: (keyof Contract['asc606Steps'])[] = [
  'identifyContract', 'identifyPOs', 'determinePrice', 'allocatePrice', 'recognizeRevenue',
]

function StepIcon({ status }: { status: string }) {
  if (status === 'Complete') return <CheckCircle2 size={14} className="text-success-DEFAULT" />
  if (status === 'In Progress') return <AlertCircle size={14} className="text-warning-DEFAULT" />
  return <Circle size={14} className="text-danger-DEFAULT" />
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <div className="w-1.5 h-1.5 rounded-full bg-primary-DEFAULT mt-1.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-medium text-primary-DEFAULT mr-2">{entry.contractNumber}</span>
            <span className="text-xs text-text-primary">{entry.event}</span>
          </div>
          {entry.amount && (
            <span className="text-xs font-mono text-success-DEFAULT whitespace-nowrap">{formatCurrency(entry.amount)}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-2xs text-text-muted">{formatDate(entry.timestamp)}</span>
          <span className="text-2xs text-text-muted">·</span>
          <span className="text-2xs text-text-muted">{entry.user}</span>
          {entry.newValue && (
            <>
              <span className="text-2xs text-text-muted">·</span>
              <span className="text-2xs text-text-secondary truncate">{entry.newValue}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [kpis, setKpis] = useState<PortfolioKpis | null>(null)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [k, c, a] = await Promise.all([getPortfolioKpis(), getContracts(), getAuditTrail()])
    setKpis(k)
    setContracts(c)
    setAudit(a)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function handleReset() {
    resetDemoData()
    toast.success('Demo data reset to defaults')
    load()
  }

  const attentionContracts = contracts.filter(c =>
    c.status !== 'Completed' && c.status !== 'Terminated' && (
      Object.values(c.asc606Steps).some(v => v === 'Needs Attention') ||
      Object.values(c.asc606Steps).some(v => v === 'In Progress')
    )
  ).slice(0, 6)

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Compliance Dashboard"
        subtitle="ASC 606 portfolio overview · As of October 31, 2024"
        actions={
          <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-secondary hover:bg-bg-elevated border border-border transition-colors">
            <RefreshCw size={12} />
            Reset Demo
          </button>
        }
      />

      <div className="px-8 py-6 space-y-6">

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            label="Total ARR"
            value={kpis ? formatCurrency(kpis.totalArr, true) : '—'}
            subValue="Annualized recurring"
            icon={DollarSign}
            accent="primary"
            loading={loading}
          />
          <KpiCard
            label="Recognized YTD"
            value={kpis ? formatCurrency(kpis.recognizedYtd, true) : '—'}
            subValue="Jan–Oct 2024"
            icon={TrendingUp}
            accent="success"
            loading={loading}
          />
          <KpiCard
            label="Deferred Balance"
            value={kpis ? formatCurrency(kpis.deferredBalance, true) : '—'}
            subValue="Unbilled / unearned"
            icon={Clock}
            accent="warning"
            loading={loading}
          />
          <KpiCard
            label="Active Contracts"
            value={kpis ? String(kpis.activeContracts) : '—'}
            subValue={kpis ? `${kpis.modifiedContracts} modified` : undefined}
            icon={FileText}
            accent="primary"
            loading={loading}
          />
          <KpiCard
            label="Needs Attention"
            value={kpis ? String(kpis.contractsNeedingAttention) : '—'}
            subValue="ASC 606 checklist"
            icon={AlertTriangle}
            accent="danger"
            loading={loading}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* ASC 606 Checklist */}
          <div className="bg-bg-surface rounded-xl border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-text-primary">ASC 606 Five-Step Checklist</div>
                <div className="text-xs text-text-muted mt-0.5">Completion status per contract</div>
              </div>
              <Badge variant="primary">{contracts.length} Contracts</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-4 py-2.5 text-left text-text-muted font-medium">Contract</th>
                    {ASC606_STEPS.map(s => (
                      <th key={s} className="px-2 py-2.5 text-center text-text-muted font-medium whitespace-nowrap">{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="px-4 py-3"><div className="h-3 bg-bg-elevated rounded animate-pulse w-24" /></td>
                        {STEP_KEYS.map(k => <td key={k} className="px-2 py-3"><div className="h-3 w-3 bg-bg-elevated rounded-full animate-pulse mx-auto" /></td>)}
                      </tr>
                    ))
                  ) : contracts.map(c => (
                    <tr
                      key={c.id}
                      className="border-b border-border/30 hover:bg-bg-elevated cursor-pointer transition-colors"
                      onClick={() => navigate(`/contracts/${c.id}`)}
                    >
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-text-primary">{c.contractNumber}</div>
                        <div className="text-text-muted truncate max-w-[100px]">{c.customer.split(' ')[0]}</div>
                      </td>
                      {STEP_KEYS.map(key => (
                        <td key={key} className="px-2 py-2.5 text-center">
                          <div className="flex items-center justify-center">
                            <StepIcon status={c.asc606Steps[key]} />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 flex items-center gap-4 text-2xs text-text-muted border-t border-border/50">
              <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-success-DEFAULT" /> Complete</span>
              <span className="flex items-center gap-1"><AlertCircle size={11} className="text-warning-DEFAULT" /> In Progress</span>
              <span className="flex items-center gap-1"><Circle size={11} className="text-danger-DEFAULT" /> Needs Attention</span>
            </div>
          </div>

          {/* Contracts Requiring Attention */}
          <div className="bg-bg-surface rounded-xl border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-text-primary">Contracts Requiring Attention</div>
                <div className="text-xs text-text-muted mt-0.5">Incomplete ASC 606 steps or pending items</div>
              </div>
            </div>
            <div className="divide-y divide-border/50">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-5 py-3 space-y-1">
                    <div className="h-3 bg-bg-elevated rounded animate-pulse w-32" />
                    <div className="h-3 bg-bg-elevated rounded animate-pulse w-48" />
                  </div>
                ))
              ) : attentionContracts.length === 0 ? (
                <div className="px-5 py-10 text-center text-text-muted text-sm">All contracts are fully compliant</div>
              ) : attentionContracts.map(c => {
                const pendingSteps = STEP_KEYS.filter(k => c.asc606Steps[k] !== 'Complete')
                return (
                  <div
                    key={c.id}
                    className="px-5 py-3.5 hover:bg-bg-elevated cursor-pointer transition-colors"
                    onClick={() => navigate(`/contracts/${c.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text-primary">{c.contractNumber}</span>
                          {statusBadge(c.status)}
                        </div>
                        <div className="text-xs text-text-secondary mt-0.5">{c.customer}</div>
                      </div>
                      <span className="text-xs font-mono text-text-secondary whitespace-nowrap">{formatCurrency(c.tcv, true)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {pendingSteps.map(key => (
                        <span key={key} className={`text-2xs px-1.5 py-0.5 rounded border border-current/20 bg-current/5 ${asc606StatusColor(c.asc606Steps[key])}`}>
                          {ASC606_STEPS[STEP_KEYS.indexOf(key)]} · {c.asc606Steps[key]}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Audit Trail */}
        <div className="bg-bg-surface rounded-xl border border-border">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-text-primary">Audit Trail</div>
              <div className="text-xs text-text-muted mt-0.5">Timestamped log of allocation changes and recognition events</div>
            </div>
            <Badge variant="muted">{audit.length} Events</Badge>
          </div>
          <div className="px-5 max-h-80 overflow-y-auto">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="py-3 border-b border-border/50">
                  <div className="h-3 bg-bg-elevated rounded animate-pulse w-3/4 mb-1.5" />
                  <div className="h-2.5 bg-bg-elevated rounded animate-pulse w-1/2" />
                </div>
              ))
            ) : audit.slice(0, 20).map(e => <AuditRow key={e.id} entry={e} />)}
          </div>
        </div>
      </div>
    </div>
  )
}
