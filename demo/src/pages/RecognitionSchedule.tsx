import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import { getContracts, getDeferredRollforward, getCurrentPeriodRecognition, type DeferredRollforward, type CurrentPeriodItem } from '../lib/api'
import { buildRecognitionSchedule } from '../lib/api'
import { formatCurrency, formatMonthYear } from '../lib/utils'
import { CURRENT_MONTH } from '../lib/data'
import type { Contract } from '../lib/types'

const PO_TYPE_COLORS: Record<string, string> = {
  'SaaS License': '#4F8EF7',
  'Perpetual License': '#818CF8',
  'Professional Services': '#34D399',
  'Support & Maintenance': '#FBBF24',
  'Training': '#FB923C',
  'Implementation': '#F472B6',
}

function buildPortfolioWaterfall(contracts: Contract[]) {
  const months: Record<string, { month: string; recognized: number; deferred: number; byType: Record<string, number> }> = {}

  for (const c of contracts) {
    for (const po of c.performanceObligations) {
      const schedule = buildRecognitionSchedule(po, 36)
      for (const p of schedule) {
        if (!months[p.month]) months[p.month] = { month: p.month, recognized: 0, deferred: 0, byType: {} }
        if (p.recognized) {
          months[p.month].recognized += p.amount
          months[p.month].byType[po.type] = (months[p.month].byType[po.type] || 0) + p.amount
        } else {
          months[p.month].deferred += p.amount
        }
      }
    }
  }

  return Object.values(months)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(0, 24)
    .map(d => ({ ...d, label: formatMonthYear(d.month) }))
}

function buildByTypeData(contracts: Contract[]) {
  const typeMap: Record<string, number> = {}
  for (const c of contracts) {
    for (const po of c.performanceObligations) {
      typeMap[po.type] = (typeMap[po.type] || 0) + po.allocatedAmount
    }
  }
  return Object.entries(typeMap).map(([type, value]) => ({ type, value: Math.round(value), color: PO_TYPE_COLORS[type] || '#94A3B8' }))
}

export default function RecognitionSchedule() {
  const navigate = useNavigate()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [rollforward, setRollforward] = useState<DeferredRollforward | null>(null)
  const [currentPeriod, setCurrentPeriod] = useState<CurrentPeriodItem[]>([])
  const [loading, setLoading] = useState(true)
  const [poTypeFilter, setPoTypeFilter] = useState('All')

  useEffect(() => {
    Promise.all([getContracts(), getDeferredRollforward(), getCurrentPeriodRecognition()]).then(([c, r, cp]) => {
      setContracts(c)
      setRollforward(r)
      setCurrentPeriod(cp)
      setLoading(false)
    })
  }, [])

  const waterfallData = contracts.length > 0 ? buildPortfolioWaterfall(contracts) : []
  const byTypeData = contracts.length > 0 ? buildByTypeData(contracts) : []
  const poTypes = ['All', ...Object.keys(PO_TYPE_COLORS)]

  const filteredCurrentPeriod = poTypeFilter === 'All' ? currentPeriod : currentPeriod.filter(i => i.poType === poTypeFilter)
  const totalCurrentPeriod = filteredCurrentPeriod.reduce((s, i) => s + i.amount, 0)

  const deferredByType = byTypeData.map(d => ({
    ...d,
    value: contracts.reduce((s, c) => s + c.performanceObligations.filter(p => p.type === d.type).reduce((ps, p) => {
      const rec = p.allocatedAmount * Math.min(1, (() => {
        if (p.recognitionMethod === 'Point in Time') return new Date(p.deliveryMilestone || p.startDate) <= new Date('2024-10-31') ? 1 : 0
        const totalMs = new Date(p.endDate).getTime() - new Date(p.startDate).getTime()
        const earnedMs = new Date('2024-10-31').getTime() - new Date(p.startDate).getTime()
        return totalMs > 0 ? Math.max(0, Math.min(1, earnedMs / totalMs)) : 1
      })())
      return ps + (p.allocatedAmount - rec)
    }, 0), 0)
  })).filter(d => d.value > 0)

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Recognition Schedule"
        subtitle="Portfolio-wide revenue recognition waterfall · As of October 31, 2024"
      />

      <div className="px-8 py-6 space-y-6">

        {/* Portfolio Waterfall */}
        <div className="bg-bg-surface rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-1">
            <div>
              <div className="text-sm font-semibold text-text-primary">24-Month Portfolio Recognition Waterfall</div>
              <div className="text-xs text-text-muted mt-0.5">Monthly recognized (green) vs future deferred (blue) across all contracts</div>
            </div>
          </div>
          {loading ? (
            <div className="h-56 bg-bg-elevated rounded animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={waterfallData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barSize={10}>
                <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v}`} />
                <Tooltip
                  contentStyle={{ background: '#1A2235', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: '#94A3B8' }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any, name: any) => [formatCurrency(v as number), name as string]}
                />
                <Bar dataKey="recognized" name="Recognized" stackId="a" fill="#34D399" radius={[0,0,0,0]}>
                  {waterfallData.map((d, i) => <Cell key={i} fill={d.month <= CURRENT_MONTH ? '#34D399' : '#34D39940'} />)}
                </Bar>
                <Bar dataKey="deferred" name="Future Deferred" stackId="a" fill="#4F8EF730" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Deferred Revenue Rollforward */}
          <div className="bg-bg-surface rounded-xl border border-border p-5">
            <div className="text-sm font-semibold text-text-primary mb-1">Deferred Revenue Roll-Forward</div>
            <div className="text-xs text-text-muted mb-4">Portfolio-wide · January 1 – October 31, 2024</div>
            {loading ? (
              <div className="space-y-2">{Array.from({length: 4}).map((_, i) => <div key={i} className="h-10 bg-bg-elevated rounded animate-pulse" />)}</div>
            ) : rollforward && (
              <div>
                {[
                  { label: 'Opening Balance', sublabel: 'January 1, 2024', value: rollforward.openingBalance, type: 'neutral' },
                  { label: 'Billings / Additions', sublabel: 'Cash received in period', value: rollforward.additions, type: 'positive' },
                  { label: 'Revenue Recognized YTD', sublabel: 'Jan–Oct 2024', value: -rollforward.recognized, type: 'negative' },
                  { label: 'Ending Balance', sublabel: 'October 31, 2024', value: rollforward.endingBalance, type: 'total' },
                ].map((row, i) => (
                  <div key={i} className={`flex items-center justify-between py-3.5 border-b border-border/40 last:border-0 ${row.type === 'total' ? 'font-semibold' : ''}`}>
                    <div>
                      <div className={`text-sm ${row.type === 'total' ? 'text-text-primary' : 'text-text-secondary'}`}>{row.label}</div>
                      <div className="text-xs text-text-muted">{row.sublabel}</div>
                    </div>
                    <div className={`text-sm font-mono ${
                      row.type === 'total' ? 'text-text-primary text-base' :
                      row.type === 'positive' ? 'text-success-DEFAULT' :
                      row.type === 'negative' ? 'text-danger-DEFAULT' : 'text-text-primary'
                    }`}>
                      {row.value < 0 ? `(${formatCurrency(Math.abs(row.value))})` : formatCurrency(row.value)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Revenue by PO Type */}
          <div className="bg-bg-surface rounded-xl border border-border p-5">
            <div className="text-sm font-semibold text-text-primary mb-1">Deferred Revenue by PO Type</div>
            <div className="text-xs text-text-muted mb-2">Current deferred balance breakdown</div>
            {loading ? (
              <div className="h-48 bg-bg-elevated rounded animate-pulse" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={deferredByType} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                      {deferredByType.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#1A2235', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any) => formatCurrency(v as number)}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1.5">
                  {deferredByType.map(d => (
                    <div key={d.type} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-text-secondary">
                        <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                        {d.type}
                      </span>
                      <span className="font-mono text-text-primary">{formatCurrency(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Current Period Recognition */}
        <div className="bg-bg-surface rounded-xl border border-border">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-text-primary">Current Period Recognition — October 2024</div>
              <div className="text-xs text-text-muted mt-0.5">Journal entry basis: Dr Deferred Revenue / Cr Revenue</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1 p-1 bg-bg-elevated rounded-lg border border-border">
                {poTypes.slice(0, 5).map(t => (
                  <button key={t} onClick={() => setPoTypeFilter(t)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${poTypeFilter === t ? 'bg-primary-muted text-primary-DEFAULT' : 'text-text-muted hover:text-text-secondary'}`}>
                    {t === 'All' ? 'All' : t.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-5 space-y-2">{Array.from({length:5}).map((_,i) => <div key={i} className="h-12 bg-bg-elevated rounded animate-pulse" />)}</div>
          ) : filteredCurrentPeriod.length === 0 ? (
            <div className="px-5 py-10 text-center text-text-muted text-sm">No revenue recognizing in current period for this filter</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {['Contract', 'Customer', 'Performance Obligation', 'Type', 'Oct 2024 Amount', 'Dr Account', 'Cr Account'].map(h => (
                        <th key={h} className={`px-4 py-3 text-text-muted font-medium uppercase tracking-wider whitespace-nowrap ${h.includes('Amount') ? 'text-right' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCurrentPeriod.map((item, i) => (
                      <tr key={i} className="border-b border-border/40 hover:bg-bg-elevated cursor-pointer transition-colors" onClick={() => navigate(`/contracts/${item.contractId}`)}>
                        <td className="px-4 py-3 font-mono text-xs font-medium text-primary-DEFAULT">{item.contractNumber}</td>
                        <td className="px-4 py-3 text-text-primary">{item.customer}</td>
                        <td className="px-4 py-3 text-text-secondary">{item.poName}</td>
                        <td className="px-4 py-3">
                          <span className="px-1.5 py-0.5 rounded text-2xs font-medium text-text-secondary bg-bg-elevated border border-border">{item.poType}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-success-DEFAULT">{formatCurrency(item.amount)}</td>
                        <td className="px-4 py-3 text-text-muted">Deferred Revenue (2010)</td>
                        <td className="px-4 py-3 text-text-muted">Revenue (4000)</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-bg-elevated">
                      <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-text-primary">Total October 2024</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-success-DEFAULT">{formatCurrency(totalCurrentPeriod)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
