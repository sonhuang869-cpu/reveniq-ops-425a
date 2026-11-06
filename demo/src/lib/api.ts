import { SEED_CONTRACTS, SEED_AUDIT, computeRecognized, CURRENT_MONTH, FISCAL_YEAR_START, REPORT_DATE } from './data'
import type { Contract, PerformanceObligation, RecognitionPeriod, JournalEntry, AuditEntry } from './types'

const STORAGE_KEY = 'reveniq_contracts_v2'
const AUDIT_KEY = 'reveniq_audit_v2'

function loadContracts(): Contract[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored) as Contract[]
  } catch {}
  return SEED_CONTRACTS
}

function saveContracts(contracts: Contract[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts))
  } catch {}
}

function loadAudit(): AuditEntry[] {
  try {
    const stored = localStorage.getItem(AUDIT_KEY)
    if (stored) return JSON.parse(stored) as AuditEntry[]
  } catch {}
  return SEED_AUDIT
}

function saveAudit(entries: AuditEntry[]) {
  try {
    localStorage.setItem(AUDIT_KEY, JSON.stringify(entries))
  } catch {}
}

function delay(ms = 300): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// ─── Contracts ───────────────────────────────────────────────────────────────

export async function getContracts(): Promise<Contract[]> {
  await delay(200)
  return loadContracts()
}

export async function getContract(id: string): Promise<Contract | undefined> {
  await delay(150)
  return loadContracts().find(c => c.id === id)
}

export async function createContract(data: Omit<Contract, 'id' | 'recognizedToDate' | 'deferredBalance'>): Promise<Contract> {
  await delay(400)
  const contracts = loadContracts()
  const recognized = data.performanceObligations.reduce((s, po) => s + computeRecognized(po), 0)
  const deferred = data.performanceObligations.reduce((s, po) => s + (po.allocatedAmount - computeRecognized(po)), 0)
  const contract: Contract = { ...data, id: `c${Date.now()}`, recognizedToDate: recognized, deferredBalance: deferred }
  contracts.push(contract)
  saveContracts(contracts)
  addAuditEntry({ contractId: contract.id, contractNumber: contract.contractNumber, event: 'Contract created', user: 'Current User' })
  return contract
}

export async function updateContract(id: string, updates: Partial<Contract>): Promise<Contract> {
  await delay(350)
  const contracts = loadContracts()
  const idx = contracts.findIndex(c => c.id === id)
  if (idx === -1) throw new Error('Contract not found')
  const updated = { ...contracts[idx], ...updates }
  updated.recognizedToDate = updated.performanceObligations.reduce((s, po) => s + computeRecognized(po), 0)
  updated.deferredBalance = updated.performanceObligations.reduce((s, po) => s + (po.allocatedAmount - computeRecognized(po)), 0)
  contracts[idx] = updated
  saveContracts(contracts)
  return updated
}

export async function deleteContract(id: string): Promise<void> {
  await delay(300)
  const contracts = loadContracts().filter(c => c.id !== id)
  saveContracts(contracts)
}

// ─── Recognition Schedule ────────────────────────────────────────────────────

export function buildRecognitionSchedule(po: PerformanceObligation, months = 36): RecognitionPeriod[] {
  const periods: RecognitionPeriod[] = []
  const start = new Date(po.startDate)
  let cumulative = 0

  if (po.recognitionMethod === 'Point in Time') {
    const milestone = new Date(po.deliveryMilestone || po.startDate)
    const monthStr = `${milestone.getFullYear()}-${String(milestone.getMonth() + 1).padStart(2, '0')}`
    return [{
      month: monthStr,
      poId: po.id,
      contractId: po.contractId,
      amount: po.allocatedAmount,
      cumulativeAmount: po.allocatedAmount,
      deferredBalance: 0,
      recognized: new Date(po.deliveryMilestone || po.startDate) <= new Date(REPORT_DATE),
    }]
  }

  const end = new Date(po.endDate)
  const totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  if (totalMonths <= 0) return periods

  const monthlyAmount = po.allocatedAmount / totalMonths

  for (let i = 0; i < Math.min(totalMonths, months); i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1)
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    cumulative += monthlyAmount
    const reportRef = new Date(REPORT_DATE)
    const isRecognized = d <= reportRef
    periods.push({
      month: monthStr,
      poId: po.id,
      contractId: po.contractId,
      amount: monthlyAmount,
      cumulativeAmount: cumulative,
      deferredBalance: po.allocatedAmount - cumulative,
      recognized: isRecognized,
    })
  }

  return periods
}

export async function getRecognitionSchedule(contractId: string): Promise<RecognitionPeriod[]> {
  await delay(200)
  const contract = loadContracts().find(c => c.id === contractId)
  if (!contract) return []
  return contract.performanceObligations.flatMap(po => buildRecognitionSchedule(po))
}

// ─── Portfolio KPIs ───────────────────────────────────────────────────────────

export interface PortfolioKpis {
  totalArr: number
  recognizedYtd: number
  deferredBalance: number
  activeContracts: number
  modifiedContracts: number
  totalTcv: number
  contractsNeedingAttention: number
}

export async function getPortfolioKpis(): Promise<PortfolioKpis> {
  await delay(150)
  const contracts = loadContracts()
  const active = contracts.filter(c => c.status === 'Active' || c.status === 'Modified')

  const totalArr = active.reduce((s, c) => {
    const years = (new Date(c.endDate).getTime() - new Date(c.startDate).getTime()) / (365.25 * 24 * 3600 * 1000)
    return s + (years > 0 ? c.tcv / years : c.tcv)
  }, 0)

  // YTD = recognized from FISCAL_YEAR_START to REPORT_DATE across all contracts
  const fyStart = new Date(FISCAL_YEAR_START)
  const reportRef = new Date(REPORT_DATE)
  let recognizedYtd = 0
  for (const c of contracts) {
    for (const po of c.performanceObligations) {
      if (po.recognitionMethod === 'Point in Time') {
        const milestone = new Date(po.deliveryMilestone || po.startDate)
        if (milestone >= fyStart && milestone <= reportRef) recognizedYtd += po.allocatedAmount
      } else {
        const poStart = new Date(po.startDate)
        const poEnd = new Date(po.endDate)
        const effectiveStart = poStart < fyStart ? fyStart : poStart
        const effectiveEnd = poEnd > reportRef ? reportRef : poEnd
        if (effectiveEnd > effectiveStart) {
          const totalMs = poEnd.getTime() - poStart.getTime()
          const earnedMs = effectiveEnd.getTime() - effectiveStart.getTime()
          if (totalMs > 0) recognizedYtd += (earnedMs / totalMs) * po.allocatedAmount
        }
      }
    }
  }

  const deferredBalance = contracts.reduce((s, c) => s + c.deferredBalance, 0)
  const needingAttention = contracts.filter(c =>
    c.status !== 'Completed' && c.status !== 'Terminated' &&
    (c.asc606Steps.allocatePrice !== 'Complete' || c.asc606Steps.identifyPOs !== 'Complete')
  ).length

  return {
    totalArr: Math.round(totalArr),
    recognizedYtd: Math.round(recognizedYtd),
    deferredBalance: Math.round(deferredBalance),
    activeContracts: active.length,
    modifiedContracts: contracts.filter(c => c.status === 'Modified').length,
    totalTcv: contracts.reduce((s, c) => s + c.tcv, 0),
    contractsNeedingAttention: needingAttention,
  }
}

// ─── Current Period Recognition ───────────────────────────────────────────────

export interface CurrentPeriodItem {
  contractId: string
  contractNumber: string
  customer: string
  poId: string
  poName: string
  poType: string
  amount: number
  journalEntry: JournalEntry
}

export async function getCurrentPeriodRecognition(): Promise<CurrentPeriodItem[]> {
  await delay(200)
  const contracts = loadContracts()
  const items: CurrentPeriodItem[] = []

  for (const c of contracts) {
    for (const po of c.performanceObligations) {
      const schedule = buildRecognitionSchedule(po)
      const currentEntry = schedule.find(p => p.month === CURRENT_MONTH && p.recognized)
      if (!currentEntry) continue

      items.push({
        contractId: c.id,
        contractNumber: c.contractNumber,
        customer: c.customer,
        poId: po.id,
        poName: po.name,
        poType: po.type,
        amount: currentEntry.amount,
        journalEntry: {
          date: `${CURRENT_MONTH}-31`,
          description: `Revenue recognition — ${po.name} (${c.contractNumber})`,
          debitAccount: 'Deferred Revenue (2010)',
          creditAccount: 'Revenue (4000)',
          amount: currentEntry.amount,
          contractId: c.id,
          poId: po.id,
        },
      })
    }
  }

  return items.sort((a, b) => b.amount - a.amount)
}

// ─── Deferred Revenue Rollforward ─────────────────────────────────────────────

export interface DeferredRollforward {
  openingBalance: number
  additions: number
  recognized: number
  endingBalance: number
  byPoType: { type: string; amount: number; color: string }[]
}

export async function getDeferredRollforward(): Promise<DeferredRollforward> {
  await delay(200)
  const contracts = loadContracts()

  // Opening balance = deferred as of 2024-01-01
  const openingDate = new Date('2024-01-01')
  let openingBalance = 0
  for (const c of contracts) {
    for (const po of c.performanceObligations) {
      if (po.recognitionMethod === 'Point in Time') {
        const milestone = new Date(po.deliveryMilestone || po.startDate)
        if (milestone >= openingDate) openingBalance += po.allocatedAmount
      } else {
        const poStart = new Date(po.startDate)
        const poEnd = new Date(po.endDate)
        if (poEnd > openingDate) {
          const billedByOpening = poStart < openingDate
            ? ((openingDate.getTime() - poStart.getTime()) / (poEnd.getTime() - poStart.getTime())) * po.allocatedAmount
            : 0
          if (billedByOpening > 0 || poStart >= openingDate) {
            const remaining = po.allocatedAmount - Math.min(billedByOpening, po.allocatedAmount)
            openingBalance += remaining
          }
        }
      }
    }
  }

  const kpis = await getPortfolioKpis()
  const totalBilled = contracts.reduce((s, c) => s + c.tcv, 0)
  const additions = Math.round(totalBilled * 0.72) // billings in period
  const recognized = kpis.recognizedYtd
  const endingBalance = kpis.deferredBalance

  const byPoType: { type: string; amount: number; color: string }[] = []
  const typeMap: Record<string, number> = {}
  for (const c of contracts) {
    for (const po of c.performanceObligations) {
      const deferred = po.allocatedAmount - computeRecognized(po)
      if (deferred > 0) typeMap[po.type] = (typeMap[po.type] || 0) + deferred
    }
  }

  const colorMap: Record<string, string> = {
    'SaaS License': '#4F8EF7',
    'Perpetual License': '#818CF8',
    'Professional Services': '#34D399',
    'Support & Maintenance': '#FBBF24',
    'Training': '#FB923C',
    'Implementation': '#F472B6',
  }

  for (const [type, amount] of Object.entries(typeMap)) {
    byPoType.push({ type, amount: Math.round(amount), color: colorMap[type] || '#94A3B8' })
  }

  return { openingBalance: Math.round(openingBalance), additions, recognized: Math.round(recognized), endingBalance, byPoType }
}

// ─── Audit ───────────────────────────────────────────────────────────────────

export async function getAuditTrail(): Promise<AuditEntry[]> {
  await delay(100)
  return loadAudit().sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

export function addAuditEntry(entry: Omit<AuditEntry, 'id' | 'timestamp'>) {
  const entries = loadAudit()
  entries.push({ ...entry, id: `a${Date.now()}`, timestamp: new Date().toISOString() })
  saveAudit(entries)
}

// ─── Reset ───────────────────────────────────────────────────────────────────

export function resetDemoData() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(AUDIT_KEY)
  } catch {}
}
