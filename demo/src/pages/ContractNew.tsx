import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createContract } from '../lib/api'
import { computeAllocations } from '../lib/data'
import type { PoType, RecognitionMethod, BillingSchedule } from '../lib/types'

const PO_TYPES: PoType[] = ['SaaS License', 'Perpetual License', 'Professional Services', 'Support & Maintenance', 'Training', 'Implementation']
const RECOGNITION_METHODS: RecognitionMethod[] = ['Over Time', 'Point in Time']
const BILLING_SCHEDULES: BillingSchedule[] = ['Monthly', 'Annual', 'Upfront', 'Milestone']
const CUSTOMERS = ['Meridian Healthcare', 'Apex Manufacturing', 'Cascade Financial', 'TerraLogic Inc', 'Sterling Capital', 'NovaBridge Corp']

interface PoForm {
  id: string
  name: string
  type: PoType
  ssp: string
  startDate: string
  endDate: string
  recognitionMethod: RecognitionMethod
  deliveryMilestone: string
}

function mkPo(): PoForm {
  return { id: `tmp-${Date.now()}-${Math.random()}`, name: '', type: 'SaaS License', ssp: '', startDate: '', endDate: '', recognitionMethod: 'Over Time', deliveryMilestone: '' }
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1">{label}</label>
      {children}
      {error && <div className="text-xs text-danger-DEFAULT mt-1 flex items-center gap-1"><AlertCircle size={11} />{error}</div>}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-DEFAULT/50 transition-colors'
const selectCls = `${inputCls} cursor-pointer`

export default function ContractNew() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [customer, setCustomer] = useState('')
  const [contractNumber, setContractNumber] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [tcv, setTcv] = useState('')
  const [billing, setBilling] = useState<BillingSchedule>('Monthly')
  const [notes, setNotes] = useState('')
  const [pos, setPos] = useState<PoForm[]>([mkPo()])

  const totalSsp = pos.reduce((s, p) => s + (Number(p.ssp) || 0), 0)
  const tcvNum = Number(tcv) || 0

  function addPo() { setPos(ps => [...ps, mkPo()]) }
  function removePo(id: string) { setPos(ps => ps.filter(p => p.id !== id)) }
  function updatePo(id: string, field: keyof PoForm, value: string) {
    setPos(ps => ps.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!customer) e.customer = 'Customer is required'
    if (!contractNumber) e.contractNumber = 'Contract number is required'
    if (!startDate) e.startDate = 'Start date is required'
    if (!endDate) e.endDate = 'End date is required'
    if (!tcv || Number(tcv) <= 0) e.tcv = 'TCV must be a positive number'
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) e.endDate = 'End date must be after start date'
    pos.forEach((po, i) => {
      if (!po.name) e[`po_name_${i}`] = 'Name required'
      if (!po.ssp || Number(po.ssp) <= 0) e[`po_ssp_${i}`] = 'SSP required'
      if (!po.startDate) e[`po_start_${i}`] = 'Start date required'
      if (!po.endDate) e[`po_end_${i}`] = 'End date required'
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const rawPos = pos.map(p => ({
        id: `po-new-${p.id}`,
        contractId: 'pending',
        name: p.name,
        type: p.type,
        ssp: Number(p.ssp),
        startDate: p.startDate,
        endDate: p.endDate,
        recognitionMethod: p.recognitionMethod,
        deliveryMilestone: p.recognitionMethod === 'Point in Time' && p.deliveryMilestone ? p.deliveryMilestone : undefined,
      }))
      const allocated = computeAllocations(rawPos, Number(tcv))
      const autoContractNumber = contractNumber || `CON-${Date.now().toString().slice(-6)}`
      const contract = await createContract({
        contractNumber: autoContractNumber,
        customer,
        tcv: Number(tcv),
        startDate,
        endDate,
        status: 'Draft',
        billingSchedule: billing,
        salesperson: 'Harish Maddi',
        performanceObligations: allocated.map(p => ({ ...p, contractId: 'pending' })),
        modifications: [],
        notes,
        asc606Steps: { identifyContract: 'Complete', identifyPOs: 'Complete', determinePrice: 'Complete', allocatePrice: 'Complete', recognizeRevenue: 'In Progress' },
      })
      toast.success(`Contract ${contract.contractNumber} created`)
      navigate(`/contracts/${contract.id}`)
    } catch {
      toast.error('Failed to create contract')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen">
      <div className="px-8 pt-6 pb-0 border-b border-border">
        <button onClick={() => navigate('/contracts')} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-4 transition-colors">
          <ArrowLeft size={14} />Back to Contracts
        </button>
        <div className="pb-5">
          <h1 className="text-xl font-semibold text-text-primary">New Contract</h1>
          <p className="text-sm text-text-secondary mt-0.5">Create a new ASC 606 contract with performance obligations and SSP allocations</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-8 py-6">
        <div className="max-w-4xl space-y-8">

          {/* Contract Header */}
          <div className="bg-bg-surface rounded-xl border border-border p-5">
            <div className="text-sm font-semibold text-text-primary mb-4">Contract Information</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Customer *" error={errors.customer}>
                <select value={customer} onChange={e => setCustomer(e.target.value)} className={selectCls}>
                  <option value="">Select customer…</option>
                  {CUSTOMERS.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="__new__">New customer…</option>
                </select>
              </Field>
              <Field label="Contract Number *" error={errors.contractNumber}>
                <input value={contractNumber} onChange={e => setContractNumber(e.target.value)} placeholder="e.g. MH-2024-003" className={inputCls} />
              </Field>
              <Field label="Effective Start Date *" error={errors.startDate}>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Effective End Date *" error={errors.endDate}>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Total Contract Value (TCV) *" error={errors.tcv}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">$</span>
                  <input type="number" value={tcv} onChange={e => setTcv(e.target.value)} placeholder="0" className={`${inputCls} pl-6`} min="0" step="1000" />
                </div>
              </Field>
              <Field label="Billing Schedule">
                <select value={billing} onChange={e => setBilling(e.target.value as BillingSchedule)} className={selectCls}>
                  {BILLING_SCHEDULES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Notes (optional)">
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Contract notes, context, or special terms…" className={`${inputCls} resize-none`} />
                </Field>
              </div>
            </div>
          </div>

          {/* Performance Obligations */}
          <div className="bg-bg-surface rounded-xl border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-text-primary">Performance Obligations</div>
                <div className="text-xs text-text-muted mt-0.5">Define each distinct good or service promised under this contract</div>
              </div>
              <button type="button" onClick={addPo} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-muted text-primary-DEFAULT hover:bg-primary-DEFAULT hover:text-white border border-primary-DEFAULT/20 transition-colors">
                <Plus size={13} />Add PO
              </button>
            </div>

            <div className="divide-y divide-border/50">
              {pos.map((po, i) => (
                <div key={po.id} className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-text-secondary">Performance Obligation #{i + 1}</span>
                    {pos.length > 1 && (
                      <button type="button" onClick={() => removePo(po.id)} className="text-text-muted hover:text-danger-DEFAULT transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Field label="PO Name *" error={errors[`po_name_${i}`]}>
                      <input value={po.name} onChange={e => updatePo(po.id, 'name', e.target.value)} placeholder="e.g. SaaS Platform License" className={inputCls} />
                    </Field>
                    <Field label="Type">
                      <select value={po.type} onChange={e => updatePo(po.id, 'type', e.target.value)} className={selectCls}>
                        {PO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </Field>
                    <Field label="Standalone Selling Price *" error={errors[`po_ssp_${i}`]}>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">$</span>
                        <input type="number" value={po.ssp} onChange={e => updatePo(po.id, 'ssp', e.target.value)} placeholder="0" className={`${inputCls} pl-6`} min="0" />
                      </div>
                    </Field>
                    <Field label="Start Date *" error={errors[`po_start_${i}`]}>
                      <input type="date" value={po.startDate} onChange={e => updatePo(po.id, 'startDate', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="End Date *" error={errors[`po_end_${i}`]}>
                      <input type="date" value={po.endDate} onChange={e => updatePo(po.id, 'endDate', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Recognition Method">
                      <select value={po.recognitionMethod} onChange={e => updatePo(po.id, 'recognitionMethod', e.target.value as RecognitionMethod)} className={selectCls}>
                        {RECOGNITION_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </Field>
                    {po.recognitionMethod === 'Point in Time' && (
                      <Field label="Delivery Milestone Date">
                        <input type="date" value={po.deliveryMilestone} onChange={e => updatePo(po.id, 'deliveryMilestone', e.target.value)} className={inputCls} />
                      </Field>
                    )}
                  </div>
                  {po.ssp && Number(po.ssp) > 0 && tcvNum > 0 && (
                    <div className="mt-3 p-2.5 bg-bg-elevated rounded-lg text-xs text-text-muted flex gap-4">
                      <span>SSP: <span className="text-text-secondary font-mono">${Number(po.ssp).toLocaleString()}</span></span>
                      <span>SSP %: <span className="text-text-secondary font-mono">{totalSsp > 0 ? ((Number(po.ssp) / totalSsp) * 100).toFixed(1) : 0}%</span></span>
                      <span>Allocated: <span className="text-primary-DEFAULT font-mono">{totalSsp > 0 ? `$${((Number(po.ssp) / totalSsp) * tcvNum).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}</span></span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Allocation Summary */}
            {totalSsp > 0 && tcvNum > 0 && (
              <div className="px-5 py-3 border-t border-border bg-bg-elevated flex items-center justify-between text-xs">
                <div className="flex gap-6 text-text-muted">
                  <span>Total SSP: <span className="font-mono text-text-secondary">${totalSsp.toLocaleString()}</span></span>
                  <span>TCV: <span className="font-mono text-text-secondary">${tcvNum.toLocaleString()}</span></span>
                  <span className={`font-medium ${Math.abs(totalSsp - tcvNum) / tcvNum < 0.05 ? 'text-success-DEFAULT' : 'text-warning-DEFAULT'}`}>
                    Allocations sum to: ${totalSsp.toLocaleString()}
                    {Math.abs(totalSsp - tcvNum) / tcvNum >= 0.05 && ' ⚠ SSP differs from TCV by >5%'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-lg bg-primary-DEFAULT text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Creating…' : 'Create Contract'}
            </button>
            <button type="button" onClick={() => navigate('/contracts')} className="px-4 py-2.5 rounded-lg border border-border text-sm text-text-secondary hover:bg-bg-elevated transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
