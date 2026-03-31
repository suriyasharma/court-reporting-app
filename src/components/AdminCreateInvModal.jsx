import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { fmt } from '../utils/format'
import { calcInvoice } from '../utils/calc'

function AdditionalChargesSection({ input, setInput, rc }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium">Additional Charges</label>
        <button onClick={() => setInput({ ...input, additionalCharges: [...input.additionalCharges, { description: '', amount: 0, displayAmount: '' }] })} className="text-sm text-indigo-600 flex items-center gap-1"><Plus className="w-3 h-3" />Add Custom</button>
      </div>
      {rc.profileAdditionalFees?.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {rc.profileAdditionalFees.map((f, i) => {
            const alreadyAdded = input.additionalCharges.some(c => c.description === f.description && c.amount === f.amount)
            return (
              <button key={i} onClick={() => { if (!alreadyAdded) setInput({ ...input, additionalCharges: [...input.additionalCharges, { description: f.description, amount: f.amount, displayAmount: (f.amount / 100).toFixed(2) }] }) }} disabled={alreadyAdded} className={`px-2 py-1 rounded text-xs border flex items-center gap-1 ${alreadyAdded ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-default' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'}`}>
                <Plus className="w-3 h-3" />{f.description} ({fmt(f.amount)})
              </button>
            )
          })}
        </div>
      )}
      {input.additionalCharges.length === 0
        ? <p className="text-sm text-gray-400 italic">No additional charges</p>
        : <div className="space-y-2">{input.additionalCharges.map((c, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input type="text" value={c.description} onChange={e => { const u = [...input.additionalCharges]; u[i] = { ...u[i], description: e.target.value }; setInput({ ...input, additionalCharges: u }) }} placeholder="Description" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
            <input type="text" inputMode="decimal" value={c.displayAmount || ''} onChange={e => { const val = e.target.value; const cents = Math.round(parseFloat(val.replace(/[^0-9.]/g, '')) * 100) || 0; const u = [...input.additionalCharges]; u[i] = { ...u[i], displayAmount: val, amount: cents }; setInput({ ...input, additionalCharges: u }) }} placeholder="$0.00" className="w-24 px-3 py-2 border rounded-lg text-sm" />
            <button onClick={() => setInput({ ...input, additionalCharges: input.additionalCharges.filter((_, x) => x !== i) })} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}</div>
      }
    </div>
  )
}

export default function AdminCreateInvModal({
  reporters, jobs, settings,
  adminInvRepId, setAdminInvRepId,
  adminInvNumber, setAdminInvNumber,
  adminInvType, setAdminInvType,
  adminInvInput, setAdminInvInput,
  onSubmit, onClose,
}) {
  const [repSearch, setRepSearch] = useState('')
  const [repOpen, setRepOpen] = useState(false)
  const [jobSearch, setJobSearch] = useState('')
  const [jobOpen, setJobOpen] = useState(false)

  const selRep = reporters.find(r => r.id === adminInvRepId)
  const selJob = jobs.find(j => j.deposition_id === adminInvInput.jobId)
  const rc = selRep ? selRep.rateCard : { hourlyRate: 0, originalPageRate: 0, copyPageRate: 0, lateCancelFee: 0, cnaFee: 0 }
  const calc = selRep ? calcInvoice(adminInvInput, rc, settings, adminInvType) : { lineItems: [], totalCents: 0 }
  const canSubmit = adminInvRepId && adminInvNumber.trim() && adminInvInput.jobId && calc.totalCents > 0

  const filteredReporters = reporters.filter(r => r.displayName.toLowerCase().includes(repSearch.toLowerCase()))
  const filteredJobs = jobs.filter(j => j.deposition_name && j.deposition_name.toLowerCase().includes(jobSearch.toLowerCase()))

  const selectReporter = r => { setAdminInvRepId(r.id); setRepSearch(r.displayName); setRepOpen(false) }
  const selectJob = j => {
    const dateStr = j.deposition_datetime ? j.deposition_datetime.split('T')[0] : ''
    const newInput = { ...adminInvInput, jobId: j.deposition_id, caseName: j.deposition_name || '', jobNumber: j.deposition_id || '', jobDate: dateStr }
    if (newInput.submissionDate && j.transcript_due_date) {
      newInput.onTime = newInput.submissionDate <= j.transcript_due_date.split('T')[0] ? 'yes' : 'no'
    }
    setAdminInvInput(newInput)
    setJobSearch(j.deposition_name)
    setJobOpen(false)
  }
  const handleSubmissionDate = date => {
    const dueDate = selJob && selJob.transcript_due_date ? selJob.transcript_due_date.split('T')[0] : ''
    const autoOnTime = date && dueDate ? (date <= dueDate ? 'yes' : 'no') : adminInvInput.onTime
    setAdminInvInput({ ...adminInvInput, submissionDate: date, onTime: autoOnTime })
  }

  const fullDayFee = rc.appearanceFeeFullDay || rc.appearanceFee || 0
  const halfDayFee = rc.appearanceFeeHalfDay || 0
  const eitherAppearanceFee = adminInvInput.useAppearanceFee || adminInvInput.useAppearanceFeeHalfDay

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-lg" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="p-6 border-b bg-gray-50 flex justify-between items-center rounded-t-xl sticky top-0 z-10">
          <h3 className="text-lg font-bold">Create Invoice on Behalf of Reporter</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Reporter picker */}
          <div>
            <label className="block text-sm font-medium mb-1">Reporter <span className="text-red-500">*</span></label>
            <div className="relative">
              <input type="text" value={repSearch} onChange={e => { setRepSearch(e.target.value); setRepOpen(true); if (!e.target.value) setAdminInvRepId('') }} onFocus={() => setRepOpen(true)} onBlur={() => setTimeout(() => setRepOpen(false), 150)} placeholder="Search reporters..." className="w-full px-3 py-2 border rounded-lg" />
              {repOpen && filteredReporters.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredReporters.map(r => <div key={r.id} onMouseDown={() => selectReporter(r)} className={`px-3 py-2 cursor-pointer hover:bg-indigo-50 text-sm ${adminInvRepId === r.id ? 'bg-indigo-50 font-medium text-indigo-700' : ''}`}>{r.displayName}</div>)}
                </div>
              )}
              {repOpen && filteredReporters.length === 0 && repSearch && <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg px-3 py-2 text-sm text-gray-400">No reporters match</div>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Invoice Number <span className="text-red-500">*</span></label>
            <input type="text" value={adminInvNumber} onChange={e => setAdminInvNumber(e.target.value)} placeholder="e.g. INV-0001" className="w-full px-3 py-2 border rounded-lg font-mono" />
          </div>

          {/* Job picker */}
          <div>
            <label className="block text-sm font-medium mb-1">Job <span className="text-red-500">*</span></label>
            <div className="relative">
              <input type="text" value={jobSearch} onChange={e => { setJobSearch(e.target.value); setJobOpen(true); if (!e.target.value) setAdminInvInput({ ...adminInvInput, jobId: '', caseName: '', jobNumber: '', jobDate: '' }) }} onFocus={() => setJobOpen(true)} onBlur={() => setTimeout(() => setJobOpen(false), 150)} placeholder="Search by job name..." className="w-full px-3 py-2 border rounded-lg" />
              {jobOpen && filteredJobs.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {filteredJobs.map(j => (
                    <div key={j.deposition_id} onMouseDown={() => selectJob(j)} className={`px-3 py-2 cursor-pointer hover:bg-indigo-50 text-sm ${adminInvInput.jobId === j.deposition_id ? 'bg-indigo-50 font-medium text-indigo-700' : ''}`}>
                      <p className="font-medium">{j.deposition_name}</p>
                      <p className="text-xs text-gray-400">{j.deposition_id} · {j.organization_name} · {j.deposition_status}</p>
                    </div>
                  ))}
                </div>
              )}
              {jobOpen && filteredJobs.length === 0 && jobSearch && <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg px-3 py-2 text-sm text-gray-400">No jobs match</div>}
            </div>
            {selJob && (
              <div className="mt-2 p-2 bg-indigo-50 rounded-lg border border-indigo-100 text-xs text-indigo-700 flex flex-wrap gap-x-4 gap-y-1">
                <span><span className="font-medium">Status:</span> {selJob.deposition_status}</span>
                <span><span className="font-medium">Org:</span> {selJob.organization_name}</span>
                {selJob.transcript_due_date && <span><span className="font-medium">Due:</span> {selJob.transcript_due_date.split('T')[0]}</span>}
              </div>
            )}
          </div>

          {selRep && <>
            <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200 text-sm">
              <p className="font-semibold text-indigo-800 mb-1">Rate Card — {selRep.displayName}</p>
              <div className="grid grid-cols-3 gap-2 text-indigo-700">
                <span>Hourly: {fmt(rc.hourlyRate)}</span>
                <span>Original: {fmt(rc.originalPageRate)}/pg</span>
                <span>Copy: {fmt(rc.copyPageRate)}/pg</span>
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg space-y-3">
              <p className="text-sm font-medium text-gray-700">Event Information</p>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={adminInvInput.caseName} onChange={e => setAdminInvInput({ ...adminInvInput, caseName: e.target.value })} placeholder="Event Name" className="px-3 py-2 border rounded-lg text-sm" />
                <input type="text" value={adminInvInput.jobNumber} onChange={e => setAdminInvInput({ ...adminInvInput, jobNumber: e.target.value })} placeholder="Deposition Event ID" className="px-3 py-2 border rounded-lg text-sm" />
                <input type="date" value={adminInvInput.jobDate} onChange={e => setAdminInvInput({ ...adminInvInput, jobDate: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
                <input type="text" value={adminInvInput.rb9JobNumber || ''} onChange={e => setAdminInvInput({ ...adminInvInput, rb9JobNumber: e.target.value })} placeholder="RB9 Job #" className="px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Transcript Submission Date</label>
                <input type="date" value={adminInvInput.submissionDate || ''} onChange={e => handleSubmissionDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">On Time</label>
                <div className="flex gap-2">
                  {['yes', 'no'].map(v => (
                    <button key={v} onClick={() => setAdminInvInput({ ...adminInvInput, onTime: v })} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${adminInvInput.onTime === v ? (v === 'yes' ? 'bg-green-600 text-white border-green-600' : 'bg-red-500 text-white border-red-500') : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                      {v === 'yes' ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
                {adminInvInput.submissionDate && selJob && selJob.transcript_due_date && (
                  <p className="text-xs text-gray-400 mt-1">Due: {selJob.transcript_due_date.split('T')[0]} · Auto-set, override if needed</p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Invoice Type</label>
              <div className="flex gap-2 flex-wrap">
                {[['STANDARD', 'Standard'], ['LATE_CANCEL', 'Late Cancel'], ['CNA', 'CNA']].map(([k, l]) => (
                  <button key={k} onClick={() => setAdminInvType(k)} className={`px-4 py-2 rounded-lg text-sm font-medium ${adminInvType === k ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>{l}</button>
                ))}
              </div>
            </div>

            {adminInvType === 'STANDARD' && <>
              {/* Appearance / in-person fees */}
              <div className="p-3 bg-gray-50 rounded-lg border space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={!!adminInvInput.useInPersonFee} onChange={e => setAdminInvInput({ ...adminInvInput, useInPersonFee: e.target.checked })} className="w-4 h-4 rounded" />
                  <span className="text-sm font-medium">In-Person Fee</span>
                  {(rc.inPersonFee || 0) > 0 && <span className="text-sm text-gray-500 ml-auto">{fmt(rc.inPersonFee)}</span>}
                </label>
                {adminInvInput.useInPersonFee && !(rc.inPersonFee) && <p className="text-xs text-red-500 ml-7">No in-person fee set on this reporter's rate card.</p>}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={!!adminInvInput.useAppearanceFee} onChange={e => setAdminInvInput({ ...adminInvInput, useAppearanceFee: e.target.checked, useAppearanceFeeHalfDay: false, hours: 0 })} className="w-4 h-4 rounded" />
                  <span className="text-sm font-medium">Full Day Appearance Fee</span>
                  {fullDayFee > 0 && <span className="text-sm text-gray-500 ml-auto">{fmt(fullDayFee)}</span>}
                </label>
                {adminInvInput.useAppearanceFee && !fullDayFee && <p className="text-xs text-red-500 ml-7">No full day appearance fee set on this reporter's rate card.</p>}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={!!adminInvInput.useAppearanceFeeHalfDay} onChange={e => setAdminInvInput({ ...adminInvInput, useAppearanceFeeHalfDay: e.target.checked, useAppearanceFee: false, hours: 0 })} className="w-4 h-4 rounded" />
                  <span className="text-sm font-medium">Half Day Appearance Fee</span>
                  {halfDayFee > 0 && <span className="text-sm text-gray-500 ml-auto">{fmt(halfDayFee)}</span>}
                </label>
                {adminInvInput.useAppearanceFeeHalfDay && !halfDayFee && <p className="text-xs text-red-500 ml-7">No half day appearance fee set on this reporter's rate card.</p>}
              </div>

              {/* Hours / Pages */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Hours</label>
                  <input type="number" step="0.5" value={adminInvInput.hours || ''} onChange={e => setAdminInvInput({ ...adminInvInput, hours: parseFloat(e.target.value) || 0 })} disabled={eitherAppearanceFee} className={`w-full px-3 py-2 border rounded-lg text-sm ${eitherAppearanceFee ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`} />
                  <p className="text-xs text-gray-400 mt-1">{fmt(rc.hourlyRate)}/hr</p>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Original Pgs</label>
                  <input type="number" value={adminInvInput.originalPages || ''} onChange={e => setAdminInvInput({ ...adminInvInput, originalPages: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  <p className="text-xs text-gray-400 mt-1">{fmt(rc.originalPageRate)}/pg</p>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Copy Pgs</label>
                  <input type="number" value={adminInvInput.copyPages || ''} onChange={e => setAdminInvInput({ ...adminInvInput, copyPages: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  <p className="text-xs text-gray-400 mt-1">{fmt(rc.copyPageRate)}/pg</p>
                </div>
              </div>

              {/* Video / Exhibit / Interpreter / Expert surcharges */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Video Pages</label>
                  <input type="number" value={adminInvInput.videoPages || ''} onChange={e => setAdminInvInput({ ...adminInvInput, videoPages: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  <p className="text-xs text-gray-400 mt-1">{fmt(rc.videoSurcharge || 0)}/pg surcharge</p>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Exhibit Pages</label>
                  <input type="number" value={adminInvInput.exhibitPages || ''} onChange={e => setAdminInvInput({ ...adminInvInput, exhibitPages: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  <p className="text-xs text-gray-400 mt-1">{fmt(rc.exhibitSurcharge || 0)}/pg surcharge</p>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Interpreter Pages</label>
                  <input type="number" value={adminInvInput.interpreterPages || ''} onChange={e => setAdminInvInput({ ...adminInvInput, interpreterPages: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  <p className="text-xs text-gray-400 mt-1">{fmt(rc.interpreterFee || 0)}/pg</p>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Expert/Med/Tech Pages</label>
                  <input type="number" value={adminInvInput.expertPages || ''} onChange={e => setAdminInvInput({ ...adminInvInput, expertPages: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  <p className="text-xs text-gray-400 mt-1">{fmt(rc.expertMedTechFee || 0)}/pg</p>
                </div>
              </div>

              {/* Minimum transcript + copies */}
              <div className="p-3 bg-gray-50 rounded-lg border space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={!!adminInvInput.useMinTranscript} onChange={e => setAdminInvInput({ ...adminInvInput, useMinTranscript: e.target.checked, numCopies: e.target.checked ? adminInvInput.numCopies : 0 })} className="w-4 h-4 rounded" />
                  <span className="text-sm font-medium">Minimum Transcript Amount</span>
                  {(rc.minimumTranscriptAmount || 0) > 0 && <span className="text-sm text-gray-500 ml-auto">{fmt(rc.minimumTranscriptAmount)}</span>}
                </label>
                {adminInvInput.useMinTranscript && !(rc.minimumTranscriptAmount) && <p className="text-xs text-red-500 ml-7">No minimum transcript amount set on this reporter's rate card.</p>}
                <div>
                  <label className="block text-xs font-medium mb-1">No. of Copies</label>
                  <input type="number" value={adminInvInput.numCopies || ''} onChange={e => setAdminInvInput({ ...adminInvInput, numCopies: parseInt(e.target.value) || 0 })} disabled={!adminInvInput.useMinTranscript} className={`w-full px-3 py-2 border rounded-lg text-sm ${!adminInvInput.useMinTranscript ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`} />
                  <p className="text-xs text-gray-400 mt-1">{fmt(rc.minimumTranscriptCopyAmount || 0)}/copy — only applies with Minimum Transcript Amount</p>
                </div>
              </div>

              {/* Expedite */}
              {(() => {
                const expRatesUi = rc.expediteRates?.length ? rc.expediteRates : settings.expediteRates
                const selExp = expRatesUi.find(e => e.days === adminInvInput.expediteDays)
                const showExpPages = !!(selExp?.useAmount && selExp?.amount > 0 && !adminInvInput.originalPages)
                return (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium mb-1">Expedite</label>
                      <select value={adminInvInput.expediteDays} onChange={e => setAdminInvInput({ ...adminInvInput, expediteDays: parseInt(e.target.value), expeditePages: 0 })} className="w-full px-3 py-2 border rounded-lg text-sm">
                        <option value={0}>Standard (No Expedite)</option>
                        {expRatesUi.map(e => (
                          <option key={e.days} value={e.days}>
                            {e.label} {e.useAmount && e.amount > 0 ? `(+${fmt(e.amount)}/pg)` : `(+${e.percent}%)`}
                          </option>
                        ))}
                      </select>
                    </div>
                    {showExpPages && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Pages for Expedite</label>
                        <input type="number" value={adminInvInput.expeditePages || ''} onChange={e => setAdminInvInput({ ...adminInvInput, expeditePages: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                        <p className="text-xs text-amber-600 mt-1">No original page count entered — enter pages here for the expedite fee calculation.</p>
                      </div>
                    )}
                  </div>
                )
              })()}
              <AdditionalChargesSection input={adminInvInput} setInput={setAdminInvInput} rc={rc} />
            </>}

            {adminInvType === 'LATE_CANCEL' && <>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200 text-sm">
                <p className="text-red-800">Late Cancellation Fee: <span className="font-bold">{fmt(rc.lateCancelFee || settings.lateCancelFee)}</span></p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={!!adminInvInput.useAppearanceFee} onChange={e => setAdminInvInput({ ...adminInvInput, useAppearanceFee: e.target.checked, useAppearanceFeeHalfDay: false })} className="w-4 h-4 rounded" />
                  <span className="text-sm font-medium">Full Day Appearance Fee</span>
                  {fullDayFee > 0 && <span className="text-sm text-gray-500 ml-auto">{fmt(fullDayFee)}</span>}
                </label>
                {adminInvInput.useAppearanceFee && !fullDayFee && <p className="text-xs text-red-500 ml-7">No full day appearance fee set on this reporter's rate card.</p>}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={!!adminInvInput.useAppearanceFeeHalfDay} onChange={e => setAdminInvInput({ ...adminInvInput, useAppearanceFeeHalfDay: e.target.checked, useAppearanceFee: false })} className="w-4 h-4 rounded" />
                  <span className="text-sm font-medium">Half Day Appearance Fee</span>
                  {halfDayFee > 0 && <span className="text-sm text-gray-500 ml-auto">{fmt(halfDayFee)}</span>}
                </label>
                {adminInvInput.useAppearanceFeeHalfDay && !halfDayFee && <p className="text-xs text-red-500 ml-7">No half day appearance fee set on this reporter's rate card.</p>}
              </div>
              <AdditionalChargesSection input={adminInvInput} setInput={setAdminInvInput} rc={rc} />
            </>}

            {adminInvType === 'CNA' && <>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-sm">
                <p className="text-amber-800">Certificate of Non-Appearance Fee: <span className="font-bold">{fmt(rc.cnaFee || settings.cnaFee)}</span></p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={!!adminInvInput.useAppearanceFee} onChange={e => setAdminInvInput({ ...adminInvInput, useAppearanceFee: e.target.checked, useAppearanceFeeHalfDay: false })} className="w-4 h-4 rounded" />
                  <span className="text-sm font-medium">Full Day Appearance Fee</span>
                  {fullDayFee > 0 && <span className="text-sm text-gray-500 ml-auto">{fmt(fullDayFee)}</span>}
                </label>
                {adminInvInput.useAppearanceFee && !fullDayFee && <p className="text-xs text-red-500 ml-7">No full day appearance fee set on this reporter's rate card.</p>}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={!!adminInvInput.useAppearanceFeeHalfDay} onChange={e => setAdminInvInput({ ...adminInvInput, useAppearanceFeeHalfDay: e.target.checked, useAppearanceFee: false })} className="w-4 h-4 rounded" />
                  <span className="text-sm font-medium">Half Day Appearance Fee</span>
                  {halfDayFee > 0 && <span className="text-sm text-gray-500 ml-auto">{fmt(halfDayFee)}</span>}
                </label>
                {adminInvInput.useAppearanceFeeHalfDay && !halfDayFee && <p className="text-xs text-red-500 ml-7">No half day appearance fee set on this reporter's rate card.</p>}
              </div>
              <AdditionalChargesSection input={adminInvInput} setInput={setAdminInvInput} rc={rc} />
            </>}

            <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-lg border">
              <input type="checkbox" checked={!!adminInvInput.boLink} onChange={e => setAdminInvInput({ ...adminInvInput, boLink: e.target.checked })} className="w-4 h-4 rounded" />
              <span className="text-sm font-medium">BO Link</span>
              <span className="text-xs text-gray-400 ml-auto">Required for approval</span>
            </label>

            <div className="border-t pt-4">
              <p className="text-sm font-semibold mb-2">Preview</p>
              {calc.lineItems.length === 0
                ? <p className="text-sm text-gray-400">Enter values above</p>
                : <table className="w-full text-sm"><tbody>
                    {calc.lineItems.map((l, i) => <tr key={i}><td className="py-1">{l.description}</td><td className="py-1 text-right">{fmt(l.amountCents)}</td></tr>)}
                    <tr className="border-t font-bold"><td className="py-2">Total</td><td className="py-2 text-right">{fmt(calc.totalCents)}</td></tr>
                  </tbody></table>
              }
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes / Comments <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea value={adminInvInput.invoiceComment || ''} onChange={e => setAdminInvInput({ ...adminInvInput, invoiceComment: e.target.value })} placeholder="Any additional notes for this invoice..." rows={3} className="w-full px-3 py-2 border rounded-lg text-sm resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Invoice PDF Link <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="url" value={adminInvInput.pdfLink || ''} onChange={e => setAdminInvInput({ ...adminInvInput, pdfLink: e.target.value })} placeholder="https://..." className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </>}
        </div>
        <div className="px-6 pb-6 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-gray-600">Cancel</button>
          <button onClick={onSubmit} disabled={!canSubmit} className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">Submit Invoice</button>
        </div>
      </div>
    </div>
  )
}
