import type { Contract, PerformanceObligation, AuditEntry } from './types'

// Reference date: reporting as of 2024-10-31 (10 months into fiscal year)
export const REPORT_DATE = '2024-10-31'
export const CURRENT_MONTH = '2024-10'
export const FISCAL_YEAR_START = '2024-01-01'

// ─── Helper: compute allocations from SSP ratios ────────────────────────────
export function computeAllocations(pos: Omit<PerformanceObligation, 'allocatedAmount' | 'sspPercentage'>[], tcv: number): PerformanceObligation[] {
  const totalSsp = pos.reduce((s, p) => s + p.ssp, 0)
  return pos.map(p => ({
    ...p,
    sspPercentage: totalSsp > 0 ? (p.ssp / totalSsp) * 100 : 0,
    allocatedAmount: totalSsp > 0 ? (p.ssp / totalSsp) * tcv : 0,
  }))
}

// ─── Helper: months between two ISO date strings ────────────────────────────
function monthsBetween(start: string, end: string): number {
  const s = new Date(start), e = new Date(end)
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth())
}

// ─── Helper: months elapsed from start to report date ───────────────────────
function monthsElapsed(start: string, reportDate: string = REPORT_DATE): number {
  const s = new Date(start), r = new Date(reportDate)
  if (r < s) return 0
  return Math.min(
    (r.getFullYear() - s.getFullYear()) * 12 + (r.getMonth() - s.getMonth()) + 1,
    monthsBetween(start, start) + 1000
  )
}

// ─── Helper: recognized amount for a PO as of REPORT_DATE ───────────────────
export function computeRecognized(po: PerformanceObligation): number {
  if (po.recognitionMethod === 'Point in Time') {
    // Recognized if delivery milestone is in the past
    const milestoneDate = po.deliveryMilestone || po.startDate
    return new Date(milestoneDate) <= new Date(REPORT_DATE) ? po.allocatedAmount : 0
  }
  const totalMonths = monthsBetween(po.startDate, po.endDate)
  if (totalMonths <= 0) return po.allocatedAmount
  const elapsed = monthsElapsed(po.startDate)
  const cappedElapsed = Math.min(elapsed, totalMonths)
  return (cappedElapsed / totalMonths) * po.allocatedAmount
}

// ─── Seed Data ───────────────────────────────────────────────────────────────

type RawContract = Omit<Contract, 'performanceObligations' | 'recognizedToDate' | 'deferredBalance'> & {
  pos: Omit<PerformanceObligation, 'allocatedAmount' | 'sspPercentage'>[]
}

const rawContracts: RawContract[] = [

  // ── 1. Meridian Healthcare — SaaS + Implementation + Support ─────────────
  {
    id: 'c001',
    contractNumber: 'MH-2024-001',
    customer: 'Meridian Healthcare',
    tcv: 450000,
    startDate: '2024-01-01',
    endDate: '2026-12-31',
    status: 'Active',
    billingSchedule: 'Monthly',
    salesperson: 'Sarah Chen',
    modifications: [],
    notes: 'Multi-year SaaS platform with dedicated implementation team',
    asc606Steps: { identifyContract: 'Complete', identifyPOs: 'Complete', determinePrice: 'Complete', allocatePrice: 'Complete', recognizeRevenue: 'In Progress' },
    pos: [
      { id: 'po-c001-1', contractId: 'c001', name: 'SaaS Platform License', type: 'SaaS License', ssp: 270000, startDate: '2024-01-01', endDate: '2026-12-31', recognitionMethod: 'Over Time' },
      { id: 'po-c001-2', contractId: 'c001', name: 'Implementation Services', type: 'Implementation', ssp: 90000, startDate: '2024-01-01', endDate: '2024-06-30', recognitionMethod: 'Over Time' },
      { id: 'po-c001-3', contractId: 'c001', name: 'Premium Support', type: 'Support & Maintenance', ssp: 90000, startDate: '2024-01-01', endDate: '2026-12-31', recognitionMethod: 'Over Time' },
    ],
  },

  // ── 2. Meridian Healthcare — Analytics Add-On ────────────────────────────
  {
    id: 'c002',
    contractNumber: 'MH-2024-002',
    customer: 'Meridian Healthcare',
    tcv: 95000,
    startDate: '2024-04-01',
    endDate: '2025-03-31',
    status: 'Active',
    billingSchedule: 'Upfront',
    salesperson: 'Sarah Chen',
    modifications: [],
    notes: 'Analytics add-on billed upfront',
    asc606Steps: { identifyContract: 'Complete', identifyPOs: 'Complete', determinePrice: 'Complete', allocatePrice: 'Complete', recognizeRevenue: 'In Progress' },
    pos: [
      { id: 'po-c002-1', contractId: 'c002', name: 'Analytics Module License', type: 'SaaS License', ssp: 72000, startDate: '2024-04-01', endDate: '2025-03-31', recognitionMethod: 'Over Time' },
      { id: 'po-c002-2', contractId: 'c002', name: 'Analytics Onboarding', type: 'Training', ssp: 23000, startDate: '2024-04-01', endDate: '2024-04-30', recognitionMethod: 'Point in Time', deliveryMilestone: '2024-04-30' },
    ],
  },

  // ── 3. Apex Manufacturing — ERP Integration + Training (Modified) ─────────
  {
    id: 'c003',
    contractNumber: 'AM-2023-001',
    customer: 'Apex Manufacturing',
    tcv: 285000,
    startDate: '2023-07-01',
    endDate: '2025-06-30',
    status: 'Modified',
    billingSchedule: 'Milestone',
    salesperson: 'James Okafor',
    modifications: [
      {
        id: 'mod-c003-1',
        date: '2024-03-15',
        description: 'Added advanced reporting module; price increased by $45,000. Treated as cumulative catch-up adjustment.',
        type: 'Cumulative Catch-Up',
        catchUpAmount: 12800,
        affectedPoIds: ['po-c003-1'],
      },
    ],
    notes: 'Original contract $240K; modified Mar 2024 to add reporting module',
    asc606Steps: { identifyContract: 'Complete', identifyPOs: 'Complete', determinePrice: 'Complete', allocatePrice: 'Complete', recognizeRevenue: 'In Progress' },
    pos: [
      { id: 'po-c003-1', contractId: 'c003', name: 'ERP Integration License', type: 'SaaS License', ssp: 155000, startDate: '2023-07-01', endDate: '2025-06-30', recognitionMethod: 'Over Time' },
      { id: 'po-c003-2', contractId: 'c003', name: 'Integration Services', type: 'Professional Services', ssp: 85000, startDate: '2023-07-01', endDate: '2024-01-31', recognitionMethod: 'Over Time' },
      { id: 'po-c003-3', contractId: 'c003', name: 'Admin Training', type: 'Training', ssp: 28000, startDate: '2024-02-01', endDate: '2024-02-28', recognitionMethod: 'Point in Time', deliveryMilestone: '2024-02-28' },
      { id: 'po-c003-4', contractId: 'c003', name: 'Reporting Module', type: 'SaaS License', ssp: 45000, startDate: '2024-04-01', endDate: '2025-06-30', recognitionMethod: 'Over Time' },
    ],
  },

  // ── 4. Cascade Financial — Perpetual License + Support ───────────────────
  {
    id: 'c004',
    contractNumber: 'CF-2024-001',
    customer: 'Cascade Financial',
    tcv: 2400000,
    startDate: '2024-01-01',
    endDate: '2026-12-31',
    status: 'Active',
    billingSchedule: 'Upfront',
    salesperson: 'Maya Patel',
    modifications: [],
    notes: 'Largest deal — perpetual license with 3-year support & professional services',
    asc606Steps: { identifyContract: 'Complete', identifyPOs: 'Complete', determinePrice: 'Complete', allocatePrice: 'Complete', recognizeRevenue: 'In Progress' },
    pos: [
      { id: 'po-c004-1', contractId: 'c004', name: 'Perpetual License', type: 'Perpetual License', ssp: 1600000, startDate: '2024-01-01', endDate: '2024-01-01', recognitionMethod: 'Point in Time', deliveryMilestone: '2024-01-15' },
      { id: 'po-c004-2', contractId: 'c004', name: 'Support & Maintenance', type: 'Support & Maintenance', ssp: 480000, startDate: '2024-01-01', endDate: '2026-12-31', recognitionMethod: 'Over Time' },
      { id: 'po-c004-3', contractId: 'c004', name: 'Implementation & Customization', type: 'Implementation', ssp: 320000, startDate: '2024-01-01', endDate: '2024-09-30', recognitionMethod: 'Over Time' },
    ],
  },

  // ── 5. Cascade Financial — Professional Services ─────────────────────────
  {
    id: 'c005',
    contractNumber: 'CF-2023-002',
    customer: 'Cascade Financial',
    tcv: 180000,
    startDate: '2023-10-01',
    endDate: '2024-09-30',
    status: 'Completed',
    billingSchedule: 'Milestone',
    salesperson: 'Maya Patel',
    modifications: [],
    notes: 'Data migration and regulatory compliance project — completed on schedule',
    asc606Steps: { identifyContract: 'Complete', identifyPOs: 'Complete', determinePrice: 'Complete', allocatePrice: 'Complete', recognizeRevenue: 'Complete' },
    pos: [
      { id: 'po-c005-1', contractId: 'c005', name: 'Data Migration Services', type: 'Professional Services', ssp: 110000, startDate: '2023-10-01', endDate: '2024-04-30', recognitionMethod: 'Over Time' },
      { id: 'po-c005-2', contractId: 'c005', name: 'Regulatory Compliance Review', type: 'Professional Services', ssp: 50000, startDate: '2024-05-01', endDate: '2024-09-30', recognitionMethod: 'Over Time' },
      { id: 'po-c005-3', contractId: 'c005', name: 'Go-Live Support', type: 'Support & Maintenance', ssp: 20000, startDate: '2024-04-01', endDate: '2024-09-30', recognitionMethod: 'Over Time' },
    ],
  },

  // ── 6. TerraLogic Inc — SaaS Subscription ────────────────────────────────
  {
    id: 'c006',
    contractNumber: 'TL-2024-001',
    customer: 'TerraLogic Inc',
    tcv: 120000,
    startDate: '2024-02-01',
    endDate: '2026-01-31',
    status: 'Active',
    billingSchedule: 'Annual',
    salesperson: 'Sarah Chen',
    modifications: [],
    notes: 'Two-year SaaS subscription, annual prepayment',
    asc606Steps: { identifyContract: 'Complete', identifyPOs: 'Complete', determinePrice: 'Complete', allocatePrice: 'Complete', recognizeRevenue: 'In Progress' },
    pos: [
      { id: 'po-c006-1', contractId: 'c006', name: 'SaaS Platform — Core', type: 'SaaS License', ssp: 96000, startDate: '2024-02-01', endDate: '2026-01-31', recognitionMethod: 'Over Time' },
      { id: 'po-c006-2', contractId: 'c006', name: 'Standard Support', type: 'Support & Maintenance', ssp: 24000, startDate: '2024-02-01', endDate: '2026-01-31', recognitionMethod: 'Over Time' },
    ],
  },

  // ── 7. TerraLogic Inc — Implementation Services (Modified) ───────────────
  {
    id: 'c007',
    contractNumber: 'TL-2023-002',
    customer: 'TerraLogic Inc',
    tcv: 75000,
    startDate: '2023-11-01',
    endDate: '2024-07-31',
    status: 'Modified',
    billingSchedule: 'Milestone',
    salesperson: 'James Okafor',
    modifications: [
      {
        id: 'mod-c007-1',
        date: '2024-05-01',
        description: 'Scope expanded to include API connector development; $15,000 added prospectively.',
        type: 'Prospective',
        affectedPoIds: ['po-c007-2'],
      },
    ],
    notes: 'Scope expansion resulted in prospective treatment — no catch-up required',
    asc606Steps: { identifyContract: 'Complete', identifyPOs: 'Complete', determinePrice: 'In Progress', allocatePrice: 'In Progress', recognizeRevenue: 'In Progress' },
    pos: [
      { id: 'po-c007-1', contractId: 'c007', name: 'Platform Implementation', type: 'Implementation', ssp: 55000, startDate: '2023-11-01', endDate: '2024-04-30', recognitionMethod: 'Over Time' },
      { id: 'po-c007-2', contractId: 'c007', name: 'API Connector Development', type: 'Professional Services', ssp: 20000, startDate: '2024-05-01', endDate: '2024-07-31', recognitionMethod: 'Over Time' },
    ],
  },

  // ── 8. Sterling Capital — Perpetual License + SaaS Upgrade ───────────────
  {
    id: 'c008',
    contractNumber: 'SC-2024-001',
    customer: 'Sterling Capital',
    tcv: 890000,
    startDate: '2024-03-01',
    endDate: '2027-02-28',
    status: 'Active',
    billingSchedule: 'Annual',
    salesperson: 'Maya Patel',
    modifications: [],
    notes: 'Hybrid perpetual + SaaS model — license delivered at signing',
    asc606Steps: { identifyContract: 'Complete', identifyPOs: 'Complete', determinePrice: 'Complete', allocatePrice: 'Complete', recognizeRevenue: 'In Progress' },
    pos: [
      { id: 'po-c008-1', contractId: 'c008', name: 'Perpetual Core License', type: 'Perpetual License', ssp: 500000, startDate: '2024-03-01', endDate: '2024-03-01', recognitionMethod: 'Point in Time', deliveryMilestone: '2024-03-15' },
      { id: 'po-c008-2', contractId: 'c008', name: 'SaaS Upgrade Access', type: 'SaaS License', ssp: 240000, startDate: '2024-03-01', endDate: '2027-02-28', recognitionMethod: 'Over Time' },
      { id: 'po-c008-3', contractId: 'c008', name: 'Premium Support', type: 'Support & Maintenance', ssp: 150000, startDate: '2024-03-01', endDate: '2027-02-28', recognitionMethod: 'Over Time' },
    ],
  },

  // ── 9. Sterling Capital — Additional User Licenses ────────────────────────
  {
    id: 'c009',
    contractNumber: 'SC-2024-002',
    customer: 'Sterling Capital',
    tcv: 45000,
    startDate: '2024-06-01',
    endDate: '2025-05-31',
    status: 'Active',
    billingSchedule: 'Upfront',
    salesperson: 'Maya Patel',
    modifications: [],
    notes: 'Seat expansion — 50 additional user licenses',
    asc606Steps: { identifyContract: 'Complete', identifyPOs: 'Complete', determinePrice: 'Complete', allocatePrice: 'Complete', recognizeRevenue: 'In Progress' },
    pos: [
      { id: 'po-c009-1', contractId: 'c009', name: 'Additional User Licenses (50)', type: 'SaaS License', ssp: 45000, startDate: '2024-06-01', endDate: '2025-05-31', recognitionMethod: 'Over Time' },
    ],
  },

  // ── 10. NovaBridge Corp — Full Platform + Professional Services ───────────
  {
    id: 'c010',
    contractNumber: 'NB-2024-001',
    customer: 'NovaBridge Corp',
    tcv: 1200000,
    startDate: '2024-01-01',
    endDate: '2026-12-31',
    status: 'Active',
    billingSchedule: 'Monthly',
    salesperson: 'James Okafor',
    modifications: [],
    notes: 'Strategic account — full platform deployment with dedicated success team',
    asc606Steps: { identifyContract: 'Complete', identifyPOs: 'Complete', determinePrice: 'Complete', allocatePrice: 'Complete', recognizeRevenue: 'In Progress' },
    pos: [
      { id: 'po-c010-1', contractId: 'c010', name: 'Enterprise SaaS License', type: 'SaaS License', ssp: 720000, startDate: '2024-01-01', endDate: '2026-12-31', recognitionMethod: 'Over Time' },
      { id: 'po-c010-2', contractId: 'c010', name: 'Deployment & Configuration', type: 'Implementation', ssp: 240000, startDate: '2024-01-01', endDate: '2024-08-31', recognitionMethod: 'Over Time' },
      { id: 'po-c010-3', contractId: 'c010', name: 'Dedicated Success Management', type: 'Professional Services', ssp: 180000, startDate: '2024-01-01', endDate: '2026-12-31', recognitionMethod: 'Over Time' },
      { id: 'po-c010-4', contractId: 'c010', name: 'Enterprise Support', type: 'Support & Maintenance', ssp: 60000, startDate: '2024-01-01', endDate: '2026-12-31', recognitionMethod: 'Over Time' },
    ],
  },

  // ── 11. NovaBridge Corp — Training + Support Bundle (Modified) ───────────
  {
    id: 'c011',
    contractNumber: 'NB-2023-001',
    customer: 'NovaBridge Corp',
    tcv: 165000,
    startDate: '2023-09-01',
    endDate: '2025-08-31',
    status: 'Modified',
    billingSchedule: 'Annual',
    salesperson: 'James Okafor',
    modifications: [
      {
        id: 'mod-c011-1',
        date: '2024-02-10',
        description: 'Added advanced training curriculum ($25,000). Contract modification treated as cumulative catch-up per ASC 606-10-25-13.',
        type: 'Cumulative Catch-Up',
        catchUpAmount: 8750,
        affectedPoIds: ['po-c011-2'],
      },
    ],
    notes: 'Training bundle expanded to include advanced analytics curriculum in Feb 2024',
    asc606Steps: { identifyContract: 'Complete', identifyPOs: 'Complete', determinePrice: 'Complete', allocatePrice: 'Complete', recognizeRevenue: 'In Progress' },
    pos: [
      { id: 'po-c011-1', contractId: 'c011', name: 'Standard Support Bundle', type: 'Support & Maintenance', ssp: 100000, startDate: '2023-09-01', endDate: '2025-08-31', recognitionMethod: 'Over Time' },
      { id: 'po-c011-2', contractId: 'c011', name: 'User Training Program', type: 'Training', ssp: 40000, startDate: '2023-09-01', endDate: '2024-06-30', recognitionMethod: 'Over Time' },
      { id: 'po-c011-3', contractId: 'c011', name: 'Advanced Analytics Training', type: 'Training', ssp: 25000, startDate: '2024-02-01', endDate: '2024-06-30', recognitionMethod: 'Point in Time', deliveryMilestone: '2024-05-31' },
    ],
  },

  // ── 12. Apex Manufacturing — SaaS Renewal + Feature Add-On ───────────────
  {
    id: 'c012',
    contractNumber: 'AM-2024-002',
    customer: 'Apex Manufacturing',
    tcv: 340000,
    startDate: '2024-05-01',
    endDate: '2026-04-30',
    status: 'Active',
    billingSchedule: 'Annual',
    salesperson: 'Sarah Chen',
    modifications: [],
    notes: 'Renewal of expired contract with feature expansion',
    asc606Steps: { identifyContract: 'Complete', identifyPOs: 'Complete', determinePrice: 'Complete', allocatePrice: 'Complete', recognizeRevenue: 'In Progress' },
    pos: [
      { id: 'po-c012-1', contractId: 'c012', name: 'SaaS Platform Renewal', type: 'SaaS License', ssp: 220000, startDate: '2024-05-01', endDate: '2026-04-30', recognitionMethod: 'Over Time' },
      { id: 'po-c012-2', contractId: 'c012', name: 'AI Analytics Feature Pack', type: 'SaaS License', ssp: 80000, startDate: '2024-05-01', endDate: '2026-04-30', recognitionMethod: 'Over Time' },
      { id: 'po-c012-3', contractId: 'c012', name: 'Migration Support', type: 'Professional Services', ssp: 25000, startDate: '2024-05-01', endDate: '2024-07-31', recognitionMethod: 'Over Time' },
      { id: 'po-c012-4', contractId: 'c012', name: 'Standard Support', type: 'Support & Maintenance', ssp: 15000, startDate: '2024-05-01', endDate: '2026-04-30', recognitionMethod: 'Over Time' },
    ],
  },
]

// ─── Build final contracts with computed allocations and recognized amounts ──

export const SEED_CONTRACTS: Contract[] = rawContracts.map(({ pos, ...c }) => {
  const performanceObligations = computeAllocations(pos, c.tcv)
  const recognizedToDate = performanceObligations.reduce((s, po) => s + computeRecognized(po), 0)
  const deferredBalance = performanceObligations.reduce((s, po) => s + (po.allocatedAmount - computeRecognized(po)), 0)
  return { ...c, performanceObligations, recognizedToDate, deferredBalance }
})

// ─── Audit Trail ─────────────────────────────────────────────────────────────

export const SEED_AUDIT: AuditEntry[] = [
  { id: 'a001', timestamp: '2024-01-15T09:23:11Z', contractId: 'c004', contractNumber: 'CF-2024-001', event: 'Perpetual License PO recognized — delivery accepted', user: 'Maya Patel', amount: 1537600, newValue: 'Recognized' },
  { id: 'a002', timestamp: '2024-02-28T14:05:44Z', contractId: 'c011', contractNumber: 'NB-2023-001', event: 'SSP updated for User Training Program', user: 'James Okafor', oldValue: '$35,000', newValue: '$40,000' },
  { id: 'a003', timestamp: '2024-02-10T11:30:00Z', contractId: 'c011', contractNumber: 'NB-2023-001', event: 'Contract modification — Advanced Analytics Training added', user: 'James Okafor', amount: 8750, newValue: 'Cumulative catch-up $8,750 recorded' },
  { id: 'a004', timestamp: '2024-03-15T10:00:00Z', contractId: 'c003', contractNumber: 'AM-2023-001', event: 'Contract modification — Reporting Module added ($45K)', user: 'Sarah Chen', amount: 12800, newValue: 'Cumulative catch-up $12,800 recorded' },
  { id: 'a005', timestamp: '2024-03-15T10:15:22Z', contractId: 'c008', contractNumber: 'SC-2024-001', event: 'Perpetual Core License PO recognized — delivery accepted', user: 'Maya Patel', amount: 491573, newValue: 'Recognized' },
  { id: 'a006', timestamp: '2024-04-30T16:55:00Z', contractId: 'c002', contractNumber: 'MH-2024-002', event: 'Analytics Onboarding training PO recognized at delivery', user: 'Sarah Chen', amount: 23000, newValue: 'Recognized' },
  { id: 'a007', timestamp: '2024-05-01T09:00:00Z', contractId: 'c007', contractNumber: 'TL-2023-002', event: 'Contract modification — API Connector scope added ($15K)', user: 'James Okafor', newValue: 'Prospective treatment — no catch-up' },
  { id: 'a008', timestamp: '2024-05-31T17:30:00Z', contractId: 'c011', contractNumber: 'NB-2023-001', event: 'Advanced Analytics Training PO recognized at delivery milestone', user: 'James Okafor', amount: 25000, newValue: 'Recognized' },
  { id: 'a009', timestamp: '2024-09-30T23:59:00Z', contractId: 'c004', contractNumber: 'CF-2024-001', event: 'Implementation & Customization PO fully recognized — project complete', user: 'Maya Patel', amount: 304762, newValue: 'Fully Recognized' },
  { id: 'a010', timestamp: '2024-09-30T23:59:00Z', contractId: 'c005', contractNumber: 'CF-2023-002', event: 'Contract completed — all POs fully recognized', user: 'Maya Patel', amount: 180000, newValue: 'Contract Completed' },
  { id: 'a011', timestamp: '2024-10-01T08:00:00Z', contractId: 'c001', contractNumber: 'MH-2024-001', event: 'Monthly revenue recognized — October 2024', user: 'System', amount: 12500, newValue: 'Oct 2024 recognition posted' },
  { id: 'a012', timestamp: '2024-10-01T08:00:00Z', contractId: 'c004', contractNumber: 'CF-2024-001', event: 'Monthly revenue recognized — October 2024', user: 'System', amount: 13333, newValue: 'Oct 2024 recognition posted' },
  { id: 'a013', timestamp: '2024-10-01T08:00:00Z', contractId: 'c010', contractNumber: 'NB-2024-001', event: 'Monthly revenue recognized — October 2024', user: 'System', amount: 33333, newValue: 'Oct 2024 recognition posted' },
]
