export type ContractStatus = 'Draft' | 'Active' | 'Modified' | 'Terminated' | 'Completed'
export type BillingSchedule = 'Upfront' | 'Monthly' | 'Milestone' | 'Annual'
export type PoType = 'SaaS License' | 'Perpetual License' | 'Professional Services' | 'Support & Maintenance' | 'Training' | 'Implementation'
export type RecognitionMethod = 'Over Time' | 'Point in Time'
export type VariableMethod = 'Most Likely' | 'Expected Value'
export type ModificationType = 'Cumulative Catch-Up' | 'Prospective'

export interface VariableConsideration {
  description: string
  estimatedAmount: number
  method: VariableMethod
  constrainedAmount: number
}

export interface PerformanceObligation {
  id: string
  contractId: string
  name: string
  type: PoType
  ssp: number          // Standalone Selling Price
  startDate: string    // ISO date
  endDate: string      // ISO date
  recognitionMethod: RecognitionMethod
  deliveryMilestone?: string
  variableConsideration?: VariableConsideration
  // Computed
  allocatedAmount: number
  sspPercentage: number
}

export interface ContractModification {
  id: string
  date: string
  description: string
  type: ModificationType
  catchUpAmount?: number
  affectedPoIds: string[]
}

export interface Contract {
  id: string
  contractNumber: string
  customer: string
  tcv: number
  startDate: string
  endDate: string
  status: ContractStatus
  billingSchedule: BillingSchedule
  salesperson: string
  recognizedToDate: number
  deferredBalance: number
  performanceObligations: PerformanceObligation[]
  modifications: ContractModification[]
  notes?: string
  asc606Steps: Asc606StepStatus
}

export interface Asc606StepStatus {
  identifyContract: 'Complete' | 'In Progress' | 'Needs Attention'
  identifyPOs: 'Complete' | 'In Progress' | 'Needs Attention'
  determinePrice: 'Complete' | 'In Progress' | 'Needs Attention'
  allocatePrice: 'Complete' | 'In Progress' | 'Needs Attention'
  recognizeRevenue: 'Complete' | 'In Progress' | 'Needs Attention'
}

export interface RecognitionPeriod {
  month: string        // 'YYYY-MM'
  poId: string
  contractId: string
  amount: number
  cumulativeAmount: number
  deferredBalance: number
  recognized: boolean
}

export interface AuditEntry {
  id: string
  timestamp: string
  contractId: string
  contractNumber: string
  event: string
  user: string
  oldValue?: string
  newValue?: string
  amount?: number
}

export interface JournalEntry {
  date: string
  description: string
  debitAccount: string
  creditAccount: string
  amount: number
  contractId: string
  poId: string
}
