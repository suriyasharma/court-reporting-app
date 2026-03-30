import { X, Plus, Trash2 } from 'lucide-react'
import { fmt } from '../utils/format'
import { calcInvoice } from '../utils/calc'

function AdditionalChargesSection({ input, setInput }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium">Additional Charges</label>
        <button onClick={() => setInput({ ...input, additionalCharges: [...input.additionalCharges, { description: '', amount: 0, displayAmount: '' }] })} className="text-sm text-indigo-600 flex items-center gap-1"><Plus className="w-3 h-3" />Add</button>
      </div>
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

export default function AdminEditInvModal({
  inv, reporters, settings,
  adminEditInvNumber, setAdminEditInvNumber,
  adminEditInvType, setAdminEditInvType,
  adminEditInvInput, setAdminEditInvInput,
  onSubmit, onClose,
}) {
  const rep = reporters.find(r => r.id === inv.reporterUserId)
  const rc = rep ? rep.rateCard : { hourlyRate: 0, originalPageRate: 0, copyPageRate: 0, lateCancelFee: 0, cnaFee: 0 }
  const calc = calcInvoice(adminEditInvInput, rc, settings, adminEditInvType)
  const canSubmit = adminEditInvNumber.trim() && calc.totalCents > 0

  const fullDayFee = rc.appearanceFeeFullDay || rc.appearanceFee || 0
  const halfDayFee = rc.appearanceFeeHalfDay || 0
  const eitherAppearanceFee = adminEditInvInput.useAppearanceFee || adminEditInvInput.useAppearanceFeeHalfDay

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-lg" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="p-6 border-b bg-gray-50 flex justify-between items-center rounded-t-xl sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-bold">Edit Invoice</h3>
            <p className="text-sm text-gray-500">On behalf of {rep?.displayName || inv.reporterName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {inv.returnComment && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded">
              <p className="text-xs font-semibold text-orange-700 mb-1">Return Reason</p>
              <p className="text-sm text-orange-600">{inv.returnComment}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Invoice Number <span className="text-red-500">*</span></label>
            <input type="text" value={adminEditInvNumber} onChange={e => setAdminEditInvNumber(e.target.value)} className="w-full px-3 py-2 border rounded-lg font-mono" />
          </div>
          <div className="p-3 bg-gray-50 rounded-lg space-y-3">
            <p className="text-sm font-medium text-gray-700">Event Information</p>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={adminEditInvInput.caseName} onChange={e => setAdminEditInvInput({ ...adminEditInvInput, caseName: e.target.value })} placeholder="Event Name" className="px-3 py-2 border rounded-lg text-sm" />
              <input type="text" value={adminEditInvInput.jobNumber} onChange={e => setAdminEditInvInput({ ...adminEditInvInput, jobNumber: e.target.value })} placeholder="Deposition Event ID" className="px-3 py-2 border rounded-lg text-sm" />
              <input type="date" value={adminEditInvInput.jobDate} onChange={e => setAdminEditInvInput({ ...adminEditInvInput, jobDate: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
              <input type="text" value={adminEditInvInput.rb9JobNumber || ''} onChange={e => setAdminEditInvInput({ ...adminEditInvInput, rb9JobNumber: e.target.value })} placeholder="RB9 Job #" className="px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Invoice Type</label>
            <div className="flex gap-2 flex-wrap">
              {[['STANDARD', 'Standard'], ['LATE_CANCEL', 'Late Cancel'], ['CNA', 'CNA']].map(([k, l]) => (
                <button key={k} onClick={() => setAdminEditInvType(k)} className={`px-4 py-2 rounded-lg text-sm font-medium ${adminEditInvType === k ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>{l}</button>
              ))}
            </div>
          </div>

          {adminEditInvType === 'STANDARD' && <>
            {/* Appearance / in-person fees */}
            <div className="p-3 bg-gray-50 rounded-lg border space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={!!adminEditInvInput.useInPersonFee} onChange={e => setAdminEditInvInput({ ...adminEditInvInput, useInPersonFee: e.target.checked })} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium">In-Person Fee</span>
                {(rc.inPersonFee || 0) > 0 && <span className="text-sm text-gray-500 ml-auto">{fmt(rc.inPersonFee)}</span>}
              </label>
              {adminEditInvInput.useInPersonFee && !(rc.inPersonFee) && <p className="text-xs text-red-500 ml-7">No in-person fee set on this reporter's rate card.</p>}
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={!!adminEditInvInput.useAppearanceFee} onChange={e => setAdminEditInvInput({ ...adminEditInvInput, useAppearanceFee: e.target.checked, useAppearanceFeeHalfDay: false, hours: 0 })} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium">Full Day Appearance Fee</span>
                {fullDayFee > 0 && <span className="text-sm text-gray-500 ml-auto">{fmt(fullDayFee)}</span>}
              </label>
              {adminEditInvInput.useAppearanceFee && !fullDayFee && <p className="text-xs text-red-500 ml-7">No full day appearance fee set on this reporter's rate card.</p>}
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={!!adminEditInvInput.useAppearanceFeeHalfDay} onChange={e => setAdminEditInvInput({ ...adminEditInvInput, useAppearanceFeeHalfDay: e.target.checked, useAppearanceFee: false, hours: 0 })} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium">Half Day Appearance Fee</span>
                {halfDayFee > 0 && <span className="text-sm text-gray-500 ml-auto">{fmt(halfDayFee)}</span>}
              </label>
              {adminEditInvInput.useAppearanceFeeHalfDay && !halfDayFee && <p className="text-xs text-red-500 ml-7">No half day appearance fee set on this reporter's rate card.</p>}
            </div>

            {/* Hours / Pages */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Hours</label>
                <input type="number" value={adminEditInvInput.hours || ''} onChange={e => setAdminEditInvInput({ ...adminEditInvInput, hours: parseInt(e.target.value) || 0 })} disabled={eitherAppearanceFee} className={`w-full px-3 py-2 border rounded-lg text-sm ${eitherAppearanceFee ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`} />
                <p className="text-xs text-gray-400 mt-1">{fmt(rc.hourlyRate)}/hr</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Original Pgs</label>
                <input type="number" value={adminEditInvInput.originalPages || ''} onChange={e => setAdminEditInvInput({ ...adminEditInvInput, originalPages: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                <p className="text-xs text-gray-400 mt-1">{fmt(rc.originalPageRate)}/pg</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Copy Pgs</label>
                <input type="number" value={adminEditInvInput.copyPages || ''} onChange={e => setAdminEditInvInput({ ...adminEditInvInput, copyPages: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                <p className="text-xs text-gray-400 mt-1">{fmt(rc.copyPageRate)}/pg</p>
              </div>
            </div>

            {/* Video / Exhibit / Interpreter surcharges */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Video Pages</label>
                <input type="number" value={adminEditInvInput.videoPages || ''} onChange={e => setAdminEditInvInput({ ...adminEditInvInput, videoPages: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                <p className="text-xs text-gray-400 mt-1">{fmt(rc.videoSurcharge || 0)}/pg surcharge</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Exhibit Pages</label>
                <input type="number" value={adminEditInvInput.exhibitPages || ''} onChange={e => setAdminEditInvInput({ ...adminEditInvInput, exhibitPages: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                <p className="text-xs text-gray-400 mt-1">{fmt(rc.exhibitSurcharge || 0)}/pg surcharge</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Interpreter Pages</label>
                <input type="number" value={adminEditInvInput.interpreterPages || ''} onChange={e => setAdminEditInvInput({ ...adminEditInvInput, interpreterPages: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                <p className="text-xs text-gray-400 mt-1">{fmt(rc.interpreterFee || 0)}/pg</p>
              </div>
            </div>

            {/* Minimum transcript + copies */}
            <div className="p-3 bg-gray-50 rounded-lg border space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={!!adminEditInvInput.useMinTranscript} onChange={e => setAdminEditInvInput({ ...adminEditInvInput, useMinTranscript: e.target.checked, numCopies: e.target.checked ? adminEditInvInput.numCopies : 0 })} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium">Minimum Transcript Amount</span>
                {(rc.minimumTranscriptAmount || 0) > 0 && <span className="text-sm text-gray-500 ml-auto">{fmt(rc.minimumTranscriptAmount)}</span>}
              </label>
              {adminEditInvInput.useMinTranscript && !(rc.minimumTranscriptAmount) && <p className="text-xs text-red-500 ml-7">No minimum transcript amount set on this reporter's rate card.</p>}
              <div>
                <label className="block text-xs font-medium mb-1">No. of Copies</label>
                <input type="number" value={adminEditInvInput.numCopies || ''} onChange={e => setAdminEditInvInput({ ...adminEditInvInput, numCopies: parseInt(e.target.value) || 0 })} disabled={!adminEditInvInput.useMinTranscript} className={`w-full px-3 py-2 border rounded-lg text-sm ${!adminEditInvInput.useMinTranscript ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`} />
                <p className="text-xs text-gray-400 mt-1">{fmt(rc.minimumTranscriptCopyAmount || 0)}/copy — only applies with Minimum Transcript Amount</p>
              </div>
            </div>

            {/* Expedite */}
            {(() => {
              const expRatesUi = rc.expediteRates?.length ? rc.expediteRates : settings.expediteRates
              const selExp = expRatesUi.find(e => e.days === adminEditInvInput.expediteDays)
              const showExpPages = !!(selExp?.useAmount && selExp?.amount > 0 && !adminEditInvInput.originalPages)
              return (
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">Expedite</label>
                    <select value={adminEditInvInput.expediteDays} onChange={e => setAdminEditInvInput({ ...adminEditInvInput, expediteDays: parseInt(e.target.value), expeditePages: 0 })} className="w-full px-3 py-2 border rounded-lg text-sm">
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
                      <input type="number" value={adminEditInvInput.expeditePages || ''} onChange={e => setAdminEditInvInput({ ...adminEditInvInput, expeditePages: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                      <p className="text-xs text-amber-600 mt-1">No original page count entered — enter pages here for the expedite fee calculation.</p>
                    </div>
                  )}
                </div>
              )
            })()}
            <AdditionalChargesSection input={adminEditInvInput} setInput={setAdminEditInvInput} />
          </>}

          {adminEditInvType === 'LATE_CANCEL' && <>
            <div className="p-4 bg-red-50 rounded-lg border border-red-200 text-sm">
              <p className="text-red-800">Late Cancellation Fee: <span className="font-bold">{fmt(rc.lateCancelFee || settings.lateCancelFee)}</span></p>
            </div>
            <AdditionalChargesSection input={adminEditInvInput} setInput={setAdminEditInvInput} />
          </>}

          {adminEditInvType === 'CNA' && <>
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-sm">
              <p className="text-amber-800">Certificate of Non-Appearance Fee: <span className="font-bold">{fmt(rc.cnaFee || settings.cnaFee)}</span></p>
            </div>
            <AdditionalChargesSection input={adminEditInvInput} setInput={setAdminEditInvInput} />
          </>}

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
            <textarea value={adminEditInvInput.invoiceComment || ''} onChange={e => setAdminEditInvInput({ ...adminEditInvInput, invoiceComment: e.target.value })} placeholder="Any additional notes for this invoice..." rows={3} className="w-full px-3 py-2 border rounded-lg text-sm resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Invoice PDF Link <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="url" value={adminEditInvInput.pdfLink || ''} onChange={e => setAdminEditInvInput({ ...adminEditInvInput, pdfLink: e.target.value })} placeholder="https://..." className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-gray-600">Cancel</button>
          <button onClick={onSubmit} disabled={!canSubmit} className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">Save &amp; Resubmit</button>
        </div>
      </div>
    </div>
  )
}
