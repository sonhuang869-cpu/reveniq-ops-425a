import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Info, TrendingUp, PieChart, BookOpen } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart as RePie, Pie, Legend } from 'recharts'
import { toast } from 'sonner'
import Badge, { statusBadge, asc606Badge } from '../components/ui/Badge'
import { getContract, getRecognitionSchedule, buildRecognitionSchedule } from '../lib/api'
import { formatCurrency, formatDate, formatMonthYear, formatPercent } from '../lib/utils'
import { computeRecognized, CURRENT_MONTH } from '../lib/data'
import type { Contract, RecognitionPeriod, PerformanceObligation } from '../lib/types'

const PO_TYPE_COLORS: Record<string, string> = {
  'SaaS License': '#4F8EF7',
  'Perpetual License': '#818CF8',
  'Professional Services': '#34D399',
  'Support & Maintenance': '#FBBF24',
  'Training': '#FB923C',
  'Implementation': '#F472B6',
}

const ASC606_LABELS: Record<string, string> = {
  identifyContract: 'Step 1 · Identify Contract',
  identifyPOs: 'Step 2 · Identify POs',
  determinePrice: 'Step 3 · Determine Price',
  allocatePrice: 'Step 4 · Allocate Price',
  recognizeRevenue: 'Step 5 · Recognize Revenue',
}

function AllocationRow({ po, totalSsp }: { po: PerformanceObligation; totalSsp: number }) {
  const pct = totalSsp > 0 ? (po.ssp / totalSsp) * 100 : 0
  const recognized = computeRecognized(po)
  return (
    <tr className="border-b border-border/40 hover:bg-bg-elevated transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PO_TYPE_COLORS[po.type] || '#94A3B8' }} />
          <div>
            <div className="text-sm font-medium text-text-primary">{po.name}</div>
            <div className="text-xs text-text-muted">{po.type}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-right font-mono text-sm text-text-primary">{formatCurrency(po.ssp)}</td>
      <td className="px-4 py-3 text-right text-sm">
        <div className="font-mono text-text-secondary">{formatPercent(pct)}</div>
        <div className="mt-1 h-1 bg-bg-elevated rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: PO_TYPE_COLORS[po.type] || '#4F8EF7' }} />
        </div>
      </td>
      <td className="px-4 py-3 text-right font-mono text-sm font-medium text-text-primary">{formatCurrency(po.allocatedAmount)}</td>
      <td className="px-4 py-3 text-right font-mono text-sm text-success-DEFAULT">{formatCurrency(recognized)}</td>
      <td className="px-4 py-3 text-right font-mono text-sm text-warning-DEFAULT">{formatCurrency(po.allocatedAmount - recognized)}</td>
      <td className="px-4 py-3 text-center">
        <Badge variant={po.recognitionMethod === 'Point in Time' ? 'primary' : 'muted'}>
          {po.recognitionMethod === 'Point in Time' ? 'Point-in-Time' : 'Over Time'}
        </Badge>
      </td>
    </tr>
  )
}

function WaterfallChart({ pos }: { pos: PerformanceObligation[] }) {
  const months: Record<string, { month: string; recognized: number; deferred: number }> = {}
  for (const po of pos) {
    const schedule = buildRecognitionSchedule(po, 36)
    for (const p of schedule) {
      if (!months[p.month]) months[p.month] = { month: p.month, recognized: 0, deferred: 0 }
      if (p.recognized) months[p.month].recognized += p.amount
      else months[p.month].deferred += p.amount
    }
  }
  const data = Object.values(months)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(0, 24)
    .map(d => ({ ...d, label: formatMonthYear(d.month) }))

  const currentIdx = data.findIndex(d => d.month === CURRENT_MONTH)

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barSize={8}>
        <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false}
          interval={Math.floor(data.length / 8)} />
        <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false}
          tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v}`} />
        <Tooltip
          contentStyle={{ background: '#1A2235', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: '#94A3B8' }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any, name: any) => [formatCurrency(v as number), name as string]}
        />
        <Bar dataKey="recognized" name="Recognized" stackId="a" fill="#34D399" radius={[0, 0, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={i <= currentIdx ? '#34D399' : '#34D39940'} />)}
        </Bar>
        <Bar dataKey="deferred" name="Deferred" stackId="a" fill="#4F8EF730" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function AllocationPie({ pos }: { pos: PerformanceObligation[] }) {
  const data = pos.map(po => ({ name: po.name, value: po.allocatedAmount, type: po.type }))
  return (
    <ResponsiveContainer width="100%" height={200}>
      <RePie>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value">
          {data.map((entry, i) => <Cell key={i} fill={PO_TYPE_COLORS[entry.type] || '#94A3B8'} />)}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#1A2235', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any) => formatCurrency(v as number)}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: '#94A3B8' }} />
      </RePie>
    </ResponsiveContainer>
  )
}

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [contract, setContract] = useState<Contract | null>(null)
  const [schedule, setSchedule] = useState<RecognitionPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'allocations' | 'schedule' | 'journal'>('overview')

  useEffect(() => {
    if (!id) return
    Promise.all([getContract(id), getRecognitionSchedule(id)]).then(([c, s]) => {
      if (!c) { toast.error('Contract not found'); navigate('/contracts'); return }
      setContract(c)
      setSchedule(s)
      setLoading(false)
    })
  }, [id])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-text-muted text-sm animate-pulse">Loading contract…</div>
    </div>
  )
  if (!contract) return null

  const totalSsp = contract.performanceObligations.reduce((s, p) => s + p.ssp, 0)
  const recognitionPct = contract.tcv > 0 ? (contract.recognizedToDate / contract.tcv) * 100 : 0

  // Current month schedule entries
  const currentMonthEntries = schedule.filter(p => p.month === CURRENT_MONTH && p.recognized)

  // Journal entries for current period
  const journalEntries = currentMonthEntries.map(entry => {
    const po = contract.performanceObligations.find(p => p.id === entry.poId)
    return {
      poName: po?.name || 'Unknown PO',
      amount: entry.amount,
      date: `${CURRENT_MONTH}-31`,
    }
  })

  const TABS = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'allocations', label: 'Allocations', icon: PieChart },
    { id: 'schedule', label: 'Recognition Schedule', icon: TrendingUp },
    { id: 'journal', label: 'Journal Entries', icon: BookOpen },
  ] as const

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-8 pt-6 pb-0 border-b border-border">
        <button
          onClick={() => navigate('/contracts')}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-4 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Contracts
        </button>
        <div className="flex items-start justify-between pb-5">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-text-primary font-mono">{contract.contractNumber}</h1>
              {statusBadge(contract.status)}
            </div>
            <div className="text-sm text-text-secondary mt-1">{contract.customer}</div>
            {contract.notes && <div className="text-xs text-text-muted mt-1 max-w-xl">{contract.notes}</div>}
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold font-mono text-text-primary">{formatCurrency(contract.tcv)}</div>
            <div className="text-xs text-text-muted mt-0.5">Total Contract Value</div>
          </div>
        </div>

        {/* Key metrics strip */}
        <div className="grid grid-cols-4 gap-px bg-border -mx-8 px-8 border-t border-border">
          {[
            { label: 'Start Date', value: formatDate(contract.startDate) },
            { label: 'End Date', value: formatDate(contract.endDate) },
            { label: 'Recognized to Date', value: formatCurrency(contract.recognizedToDate) },
            { label: 'Deferred Balance', value: formatCurrency(contract.deferredBalance) },
          ].map(m => (
            <div key={m.label} className="bg-bg-base px-4 py-3 first:pl-0 last:pr-0">
              <div className="text-2xs text-text-muted uppercase tracking-wider">{m.label}</div>
              <div className="text-sm font-mono font-medium text-text-primary mt-0.5">{m.value}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="py-3 border-t border-border">
          <div className="flex justify-between text-xs text-text-muted mb-1.5">
            <span>Recognition Progress</span>
            <span className="font-mono">{formatPercent(recognitionPct)} recognized</span>
          </div>
          <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-DEFAULT to-success-DEFAULT rounded-full transition-all duration-500"
              style={{ width: `${Math.min(recognitionPct, 100)}%` }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 -mx-8 px-8">
          {TABS.map(({ id: tid, label, icon: Icon }) => (
            <button
              key={tid}
              onClick={() => setActiveTab(tid as typeof activeTab)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tid
                  ? 'border-primary-DEFAULT text-primary-DEFAULT'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-8 py-6">

        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Contract Info */}
              <div className="bg-bg-surface rounded-xl border border-border p-5 space-y-3">
                <div className="text-sm font-semibold text-text-primary mb-1">Contract Details</div>
                {[
                  { label: 'Contract Number', value: contract.contractNumber },
                  { label: 'Customer', value: contract.customer },
                  { label: 'Billing Schedule', value: contract.billingSchedule },
                  { label: 'Account Owner', value: contract.salesperson },
                  { label: 'Effective Period', value: `${formatDate(contract.startDate)} – ${formatDate(contract.endDate)}` },
                  { label: 'Performance Obligations', value: String(contract.performanceObligations.length) },
                  { label: 'Modifications', value: contract.modifications.length === 0 ? 'None' : String(contract.modifications.length) },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                    <span className="text-xs text-text-muted">{r.label}</span>
                    <span className="text-xs font-medium text-text-primary">{r.value}</span>
                  </div>
                ))}
              </div>

              {/* ASC 606 Checklist */}
              <div className="bg-bg-surface rounded-xl border border-border p-5">
                <div className="text-sm font-semibold text-text-primary mb-4">ASC 606 Five-Step Model</div>
                <div className="space-y-2.5">
                  {(Object.entries(ASC606_LABELS) as [keyof Contract['asc606Steps'], string][]).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-3 p-3 rounded-lg bg-bg-elevated border border-border/50">
                      <div className="flex-1">
                        <div className="text-xs font-medium text-text-primary">{label}</div>
                      </div>
                      {asc606Badge(contract.asc606Steps[key])}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Revenue Waterfall Chart */}
            <div className="bg-bg-surface rounded-xl border border-border p-5">
              <div className="text-sm font-semibold text-text-primary mb-1">24-Month Recognition Waterfall</div>
              <div className="text-xs text-text-muted mb-4">Monthly recognized vs deferred revenue by period</div>
              <WaterfallChart pos={contract.performanceObligations} />
            </div>

            {/* Modifications */}
            {contract.modifications.length > 0 && (
              <div className="bg-bg-surface rounded-xl border border-warning-DEFAULT/20 p-5">
                <div className="text-sm font-semibold text-warning-DEFAULT mb-3">Contract Modifications</div>
                <div className="space-y-3">
                  {contract.modifications.map(mod => (
                    <div key={mod.id} className="p-3.5 bg-warning-muted/30 rounded-lg border border-warning-DEFAULT/15">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-medium text-text-primary">{mod.description}</div>
                          <div className="text-2xs text-text-muted mt-1">Modified: {formatDate(mod.date)}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge variant="warning">{mod.type}</Badge>
                          {mod.catchUpAmount && (
                            <div className="text-xs font-mono text-warning-DEFAULT mt-1">
                              Catch-up: {formatCurrency(mod.catchUpAmount)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Allocations Tab ── */}
        {activeTab === 'allocations' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* PO Allocation table */}
              <div className="xl:col-span-2 bg-bg-surface rounded-xl border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <div className="text-sm font-semibold text-text-primary">Transaction Price Allocation</div>
                  <div className="text-xs text-text-muted mt-0.5">Allocated using SSP ratios · Total SSP: {formatCurrency(totalSsp)}</div>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {['Performance Obligation', 'SSP', 'SSP %', 'Allocated Amount', 'Recognized', 'Deferred', 'Method'].map(h => (
                        <th key={h} className={`px-4 py-3 text-text-muted font-medium uppercase tracking-wider whitespace-nowrap ${h === 'Performance Obligation' ? 'text-left' : 'text-right last:text-center'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {contract.performanceObligations.map(po => (
                      <AllocationRow key={po.id} po={po} totalSsp={totalSsp} />
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-bg-elevated">
                      <td className="px-4 py-3 text-sm font-semibold text-text-primary">Total</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-text-primary">{formatCurrency(totalSsp)}</td>
                      <td className="px-4 py-3 text-right font-mono text-text-secondary">100.0%</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-text-primary">{formatCurrency(contract.tcv)}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-success-DEFAULT">{formatCurrency(contract.recognizedToDate)}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-warning-DEFAULT">{formatCurrency(contract.deferredBalance)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Allocation Pie */}
              <div className="bg-bg-surface rounded-xl border border-border p-5">
                <div className="text-sm font-semibold text-text-primary mb-1">Allocation by PO</div>
                <div className="text-xs text-text-muted mb-3">% of TCV</div>
                <AllocationPie pos={contract.performanceObligations} />
                <div className="mt-3 space-y-2">
                  {contract.performanceObligations.map(po => (
                    <div key={po.id} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-text-secondary">
                        <span className="w-2 h-2 rounded-full" style={{ background: PO_TYPE_COLORS[po.type] || '#94A3B8' }} />
                        {po.name}
                      </span>
                      <span className="font-mono text-text-primary">{formatPercent(po.sspPercentage)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Variable Consideration */}
            {contract.performanceObligations.some(po => po.variableConsideration) && (
              <div className="bg-bg-surface rounded-xl border border-border p-5">
                <div className="text-sm font-semibold text-text-primary mb-3">Variable Consideration</div>
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border">
                    {['PO', 'Description', 'Estimated Amount', 'Method', 'Constrained Amount'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-text-muted font-medium">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {contract.performanceObligations.filter(po => po.variableConsideration).map(po => (
                      <tr key={po.id} className="border-b border-border/40">
                        <td className="px-4 py-3 font-medium text-text-primary">{po.name}</td>
                        <td className="px-4 py-3 text-text-secondary">{po.variableConsideration!.description}</td>
                        <td className="px-4 py-3 font-mono text-text-primary">{formatCurrency(po.variableConsideration!.estimatedAmount)}</td>
                        <td className="px-4 py-3"><Badge variant="muted">{po.variableConsideration!.method}</Badge></td>
                        <td className="px-4 py-3 font-mono text-success-DEFAULT">{formatCurrency(po.variableConsideration!.constrainedAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Recognition Schedule Tab ── */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <div className="bg-bg-surface rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <div className="text-sm font-semibold text-text-primary">Monthly Recognition Schedule by PO</div>
                <div className="text-xs text-text-muted mt-0.5">Recognized periods highlighted · Current month: October 2024</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-text-muted font-medium sticky left-0 bg-bg-surface">PO / Month</th>
                      <th className="px-4 py-3 text-right text-text-muted font-medium">Method</th>
                      <th className="px-4 py-3 text-right text-text-muted font-medium">Allocated</th>
                      {schedule
                        .map(s => s.month)
                        .filter((m, i, a) => a.indexOf(m) === i)
                        .sort()
                        .slice(0, 24)
                        .map(month => (
                          <th key={month} className={`px-3 py-3 text-right font-medium ${month === CURRENT_MONTH ? 'text-primary-DEFAULT' : 'text-text-muted'}`}>
                            {formatMonthYear(month)}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {contract.performanceObligations.map(po => {
                      const poSchedule = schedule.filter(s => s.poId === po.id)
                      const months = [...new Set(schedule.map(s => s.month))].sort().slice(0, 24)
                      return (
                        <tr key={po.id} className="border-b border-border/40">
                          <td className="px-4 py-3 sticky left-0 bg-bg-surface">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: PO_TYPE_COLORS[po.type] || '#94A3B8' }} />
                              <div>
                                <div className="font-medium text-text-primary">{po.name}</div>
                                <div className="text-text-muted">{po.type}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Badge variant={po.recognitionMethod === 'Point in Time' ? 'primary' : 'muted'}>
                              {po.recognitionMethod === 'Point in Time' ? 'PiT' : 'OT'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-medium text-text-primary">{formatCurrency(po.allocatedAmount)}</td>
                          {months.map(month => {
                            const entry = poSchedule.find(s => s.month === month)
                            return (
                              <td key={month} className={`px-3 py-3 text-right font-mono ${
                                month === CURRENT_MONTH ? 'bg-primary-muted/20' : ''
                              } ${entry?.recognized ? 'text-success-DEFAULT' : 'text-text-muted'}`}>
                                {entry ? (entry.amount >= 1000 ? `$${(entry.amount/1000).toFixed(1)}K` : `$${Math.round(entry.amount)}`) : '—'}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Journal Entries Tab ── */}
        {activeTab === 'journal' && (
          <div className="space-y-6">
            <div className="bg-bg-surface rounded-xl border border-border">
              <div className="px-5 py-4 border-b border-border">
                <div className="text-sm font-semibold text-text-primary">Journal Entry Preview — October 2024</div>
                <div className="text-xs text-text-muted mt-0.5">Dr Deferred Revenue / Cr Revenue · per ASC 606-10-45</div>
              </div>
              {journalEntries.length === 0 ? (
                <div className="px-5 py-10 text-center text-text-muted text-sm">No revenue recognizing in current period</div>
              ) : (
                <div className="divide-y divide-border/40">
                  {journalEntries.map((je, i) => (
                    <div key={i} className="px-5 py-4">
                      <div className="text-xs text-text-muted mb-2 font-mono">{je.date} · {je.poName}</div>
                      <table className="w-full text-xs">
                        <tbody>
                          <tr>
                            <td className="py-1 pl-4 text-text-secondary">Dr  Deferred Revenue (2010)</td>
                            <td className="py-1 text-right font-mono text-text-primary">{formatCurrency(je.amount)}</td>
                            <td className="py-1" />
                          </tr>
                          <tr>
                            <td className="py-1 pl-8 text-text-secondary">Cr  Revenue (4000)</td>
                            <td className="py-1" />
                            <td className="py-1 text-right font-mono text-success-DEFAULT">{formatCurrency(je.amount)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ))}
                  <div className="px-5 py-3 bg-bg-elevated flex justify-between text-sm font-semibold">
                    <span className="text-text-muted">Total October 2024 Recognition</span>
                    <span className="font-mono text-success-DEFAULT">{formatCurrency(journalEntries.reduce((s, j) => s + j.amount, 0))}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Deferred Revenue Rollforward for this contract */}
            <div className="bg-bg-surface rounded-xl border border-border p-5">
              <div className="text-sm font-semibold text-text-primary mb-4">Deferred Revenue Roll-Forward (YTD 2024)</div>
              <div className="space-y-0">
                {[
                  { label: 'Opening Balance (Jan 1, 2024)', value: contract.tcv - contract.performanceObligations.reduce((s, po) => {
                    const rec = computeRecognized(po)
                    return s + rec
                  }, 0) + contract.recognizedToDate * 0.4, type: 'neutral' as const },
                  { label: 'Billings / Additions in Period', value: contract.tcv * 0.6, type: 'positive' as const },
                  { label: 'Revenue Recognized YTD', value: -contract.recognizedToDate, type: 'negative' as const },
                  { label: 'Ending Balance (Oct 31, 2024)', value: contract.deferredBalance, type: 'total' as const },
                ].map((row, i) => (
                  <div key={i} className={`flex justify-between py-3 text-sm border-b border-border/40 last:border-0 ${row.type === 'total' ? 'font-semibold' : ''}`}>
                    <span className="text-text-secondary">{row.label}</span>
                    <span className={`font-mono ${
                      row.type === 'total' ? 'text-text-primary' :
                      row.type === 'positive' ? 'text-success-DEFAULT' :
                      row.type === 'negative' ? 'text-danger-DEFAULT' :
                      'text-text-primary'
                    }`}>
                      {row.value < 0 ? `(${formatCurrency(Math.abs(row.value))})` : formatCurrency(row.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
