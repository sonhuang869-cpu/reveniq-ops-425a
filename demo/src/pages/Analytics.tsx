import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import { getContracts } from '../lib/api'
import { buildRecognitionSchedule } from '../lib/api'
import { formatCurrency, formatMonthYear } from '../lib/utils'
import { CURRENT_MONTH } from '../lib/data'
import type { Contract } from '../lib/types'

const CUSTOMER_COLORS = ['#4F8EF7', '#34D399', '#FBBF24', '#F472B6', '#818CF8', '#FB923C']
const PO_COLORS: Record<string, string> = {
  'SaaS License': '#4F8EF7',
  'Perpetual License': '#818CF8',
  'Professional Services': '#34D399',
  'Support & Maintenance': '#FBBF24',
  'Training': '#FB923C',
  'Implementation': '#F472B6',
}

export default function Analytics() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getContracts().then(c => { setContracts(c); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="min-h-screen">
      <PageHeader title="Revenue Analytics" subtitle="Portfolio-level revenue intelligence" />
      <div className="px-8 py-6 grid grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-64 bg-bg-surface rounded-xl border border-border animate-pulse" />)}
      </div>
    </div>
  )

  // TCV by customer
  const customerTcv = contracts.reduce((acc, c) => {
    acc[c.customer] = (acc[c.customer] || 0) + c.tcv
    return acc
  }, {} as Record<string, number>)
  const customerData = Object.entries(customerTcv)
    .map(([name, value]) => ({ name: name.split(' ')[0], fullName: name, value }))
    .sort((a, b) => b.value - a.value)

  // Revenue by PO type (allocated)
  const poTypeData = contracts.reduce((acc, c) => {
    for (const po of c.performanceObligations) {
      acc[po.type] = (acc[po.type] || 0) + po.allocatedAmount
    }
    return acc
  }, {} as Record<string, number>)
  const poTypePieData = Object.entries(poTypeData).map(([type, value]) => ({ type, value: Math.round(value), color: PO_COLORS[type] || '#94A3B8' }))

  // Monthly recognized trend (all contracts, 12 months)
  const trendMonths: Record<string, { month: string; recognized: number; cumulative: number }> = {}
  for (const c of contracts) {
    for (const po of c.performanceObligations) {
      const schedule = buildRecognitionSchedule(po, 36)
      for (const p of schedule) {
        if (!trendMonths[p.month]) trendMonths[p.month] = { month: p.month, recognized: 0, cumulative: 0 }
        if (p.recognized) trendMonths[p.month].recognized += p.amount
      }
    }
  }
  let cum = 0
  const trendData = Object.values(trendMonths)
    .sort((a, b) => a.month.localeCompare(b.month))
    .filter(d => d.month <= CURRENT_MONTH)
    .map(d => { cum += d.recognized; return { ...d, cumulative: cum, label: formatMonthYear(d.month) } })

  // Status breakdown
  const statusData = ['Active', 'Modified', 'Completed', 'Draft', 'Terminated'].map(s => ({
    name: s,
    value: contracts.filter(c => c.status === s).length,
    tcv: contracts.filter(c => c.status === s).reduce((sum, c) => sum + c.tcv, 0),
  })).filter(d => d.value > 0)

  // ARR trend: annualized by customer
  const arrByCustomer = contracts
    .filter(c => c.status === 'Active' || c.status === 'Modified')
    .reduce((acc, c) => {
      const years = Math.max(0.1, (new Date(c.endDate).getTime() - new Date(c.startDate).getTime()) / (365.25 * 24 * 3600 * 1000))
      acc[c.customer] = (acc[c.customer] || 0) + c.tcv / years
      return acc
    }, {} as Record<string, number>)

  const arrData = Object.entries(arrByCustomer)
    .map(([name, value]) => ({ name: name.split(' ')[0], fullName: name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="min-h-screen">
      <PageHeader title="Revenue Analytics" subtitle={`Portfolio intelligence across ${contracts.length} contracts · As of October 2024`} />

      <div className="px-8 py-6 space-y-6">

        {/* Row 1: Trend + ARR */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-bg-surface rounded-xl border border-border p-5">
            <div className="text-sm font-semibold text-text-primary mb-0.5">Monthly Recognized Revenue (2024 YTD)</div>
            <div className="text-xs text-text-muted mb-4">Monthly recognized vs cumulative YTD recognition</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : `$${(v/1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ background: '#1A2235', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any, name: any) => [formatCurrency(v as number), name as string]}
                />
                <Line type="monotone" dataKey="recognized" name="Monthly" stroke="#4F8EF7" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cumulative" name="Cumulative" stroke="#34D399" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-bg-surface rounded-xl border border-border p-5">
            <div className="text-sm font-semibold text-text-primary mb-0.5">ARR by Customer</div>
            <div className="text-xs text-text-muted mb-4">Annualized recurring revenue, active contracts only</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={arrData} layout="vertical" margin={{ top: 4, right: 60, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : `$${(v/1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip
                  contentStyle={{ background: '#1A2235', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [formatCurrency(v as number), 'ARR']}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {arrData.map((_, i) => <Cell key={i} fill={CUSTOMER_COLORS[i % CUSTOMER_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 2: TCV by customer + PO type */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-bg-surface rounded-xl border border-border p-5">
            <div className="text-sm font-semibold text-text-primary mb-0.5">Total Contract Value by Customer</div>
            <div className="text-xs text-text-muted mb-4">All contracts, all statuses</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={customerData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : `$${(v/1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ background: '#1A2235', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [formatCurrency(v as number), 'TCV']}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  labelFormatter={(_: any, p: readonly any[]) => p?.[0]?.payload?.fullName || ''}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {customerData.map((_, i) => <Cell key={i} fill={CUSTOMER_COLORS[i % CUSTOMER_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-bg-surface rounded-xl border border-border p-5">
            <div className="text-sm font-semibold text-text-primary mb-0.5">Revenue Allocation by PO Type</div>
            <div className="text-xs text-text-muted mb-2">Transaction price allocated across performance obligation types</div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={poTypePieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                  {poTypePieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1A2235', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any, _: any, p: any) => [formatCurrency(v as number), p?.payload?.type || '']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-1.5">
              {poTypePieData.sort((a, b) => b.value - a.value).map(d => (
                <div key={d.type} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-text-secondary">
                    <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    {d.type}
                  </span>
                  <span className="font-mono text-text-primary">{formatCurrency(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contract Status Summary */}
        <div className="bg-bg-surface rounded-xl border border-border p-5">
          <div className="text-sm font-semibold text-text-primary mb-4">Contract Portfolio Summary</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Status', '# Contracts', 'Total TCV', 'Avg TCV', 'Avg Term'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {statusData.map(row => {
                  const statusContracts = contracts.filter(c => c.status === row.name)
                  const avgTcv = row.value > 0 ? row.tcv / row.value : 0
                  const avgTermMonths = statusContracts.reduce((s, c) => {
                    const months = (new Date(c.endDate).getTime() - new Date(c.startDate).getTime()) / (30.44 * 24 * 3600 * 1000)
                    return s + months
                  }, 0) / (statusContracts.length || 1)
                  return (
                    <tr key={row.name} className="border-b border-border/40 hover:bg-bg-elevated transition-colors">
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium border ${
                          row.name === 'Active' ? 'bg-success-muted text-success-DEFAULT border-success-DEFAULT/20' :
                          row.name === 'Modified' ? 'bg-warning-muted text-warning-DEFAULT border-warning-DEFAULT/20' :
                          row.name === 'Completed' ? 'bg-primary-muted text-primary-DEFAULT border-primary-DEFAULT/20' :
                          'bg-bg-elevated text-text-muted border-border'
                        }`}>{row.name}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-text-primary">{row.value}</td>
                      <td className="px-4 py-3 font-mono text-text-primary">{formatCurrency(row.tcv)}</td>
                      <td className="px-4 py-3 font-mono text-text-secondary">{formatCurrency(avgTcv)}</td>
                      <td className="px-4 py-3 font-mono text-text-secondary">{avgTermMonths.toFixed(0)} mo</td>
                    </tr>
                  )
                })}
                <tr className="border-t border-border bg-bg-elevated font-semibold">
                  <td className="px-4 py-3 text-text-primary">Total</td>
                  <td className="px-4 py-3 font-mono text-text-primary">{contracts.length}</td>
                  <td className="px-4 py-3 font-mono text-text-primary">{formatCurrency(contracts.reduce((s, c) => s + c.tcv, 0))}</td>
                  <td className="px-4 py-3 font-mono text-text-secondary">{formatCurrency(contracts.reduce((s, c) => s + c.tcv, 0) / (contracts.length || 1))}</td>
                  <td className="px-4 py-3" />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
