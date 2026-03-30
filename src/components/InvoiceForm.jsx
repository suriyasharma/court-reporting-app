import { Plus, Trash2 } from 'lucide-react'
import { fmt } from '../utils/format'

export default function InvoiceForm({
  title, invoiceNumber, setInvoiceNumber, pdfLink, setPdfLink,
  boLink, setBoLink,
  input, setInput, invType, setInvType, rc, settings, calc,
  onBack, onSubmit, submitLabel, submitClass, returnComment,
}) {
  const addCharge = () => setInput({ ...input, additionalCharges: [...input.additionalCharges, { description: '', amount: 0, displayAmount: '' }] })
  const removeCharge = idx => setInput({ ...input, additionalCharges: input.additionalCharges.filter((_, i) => i !== idx) })

  const fullDayFee = rc.appearanceFeeFullDay || rc.appearanceFee || 0
  const halfDayFee = rc.appearanceFeeHalfDay || 0
  const eitherAppearanceFee = input.useAppearanceFee || input.useAppearanceFeeHalfDay

  return (
    <div className="max-w-xl mx-auto pb-16">
      <button onClick={onBack} className="text-gray-600 mb-4 block">&#8592; Back</button>
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-xl font-bold mb-6">{title}</h2>
        <div className="space-y-4">
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200 mb-4">
            <p className="text-sm font-semibold text-indigo-800">Invoicing for: Filevine</p>
            <p className="text-xs text-indigo-600 mt-1">This invoice system is exclusively for Filevine jobs only.</p>
          </div>
          {returnComment && (
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm font-semibold text-orange-800 mb-1">Returned — Admin Feedback:</p>
              <p className="text-sm text-orange-700">{returnComment}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Invoice Number <span className="text-red-500">*</span></label>
            <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="e.g. INV-0001" className="w-full px-3 py-2 border rounded-lg font-mono" />
          </div>
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <p className="text-sm font-medium text-gray-700">Event Information</p>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={input.caseName} onChange={e => setInput({ ...input, caseName: e.target.value })} placeholder="Event Name" className="px-3 py-2 border rounded-lg" />
              <input type="text" value={input.jobNumber} onChange={e => setInput({ ...input, jobNumber: e.target.value })} placeholder="Deposition Event ID" className="px-3 py-2 border rounded-lg" />
              <input type="date" value={input.jobDate} onChange={e => setInput({ ...input, jobDate: e.target.value })} className="px-3 py-2 border rounded-lg" />
              <input type="text" value={input.rb9JobNumber || ''} onChange={e => setInput({ ...input, rb9JobNumber: e.target.value })} placeholder="RB9 Job #" className="px-3 py-2 border rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Invoice Type</label>
            <div className="flex gap-2 flex-wrap">
              {[['STANDARD', 'Standard'], ['LATE_CANCEL', 'Late Cancel'], ['CNA', 'CNA']].map(([k, l]) => (
                <button key={k} onClick={() => setInvType(k)} className={`px-4 py-2 rounded-lg text-sm font-medium ${invType === k ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>{l}</button>
              ))}
            </div>
          </div>

          {invType === 'STANDARD' && <>
            {/* Appearance / in-person fees */}
            <div className="p-3 bg-gray-50 rounded-lg border space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={!!input.useInPersonFee} onChange={e => setInput({ ...input, useInPersonFee: e.target.checked })} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium">In-Person Fee</span>
                {(rc.inPersonFee || 0) > 0 && <span className="text-sm text-gray-500 ml-auto">{fmt(rc.inPersonFee)}</span>}
              </label>
              {input.useInPersonFee && !(rc.inPersonFee) && <p className="text-xs text-red-500 ml-7">No in-person fee set on your rate card.</p>}
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={!!input.useAppearanceFee} onChange={e => setInput({ ...input, useAppearanceFee: e.target.checked, useAppearanceFeeHalfDay: false, hours: 0 })} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium">Full Day Appearance Fee</span>
                {fullDayFee > 0 && <span className="text-sm text-gray-500 ml-auto">{fmt(fullDayFee)}</span>}
              </label>
              {input.useAppearanceFee && !fullDayFee && <p className="text-xs text-red-500 ml-7">No full day appearance fee set on your rate card.</p>}
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={!!input.useAppearanceFeeHalfDay} onChange={e => setInput({ ...input, useAppearanceFeeHalfDay: e.target.checked, useAppearanceFee: false, hours: 0 })} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium">Half Day Appearance Fee</span>
                {halfDayFee > 0 && <span className="text-sm text-gray-500 ml-auto">{fmt(halfDayFee)}</span>}
              </label>
              {input.useAppearanceFeeHalfDay && !halfDayFee && <p className="text-xs text-red-500 ml-7">No half day appearance fee set on your rate card.</p>}
            </div>

            {/* Hours / Pages */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Hours</label>
                <input type="number" step="0.5" value={input.hours || ''} onChange={e => setInput({ ...input, hours: parseFloat(e.target.value) || 0 })} disabled={eitherAppearanceFee} className={`w-full px-3 py-2 border rounded-lg ${eitherAppearanceFee ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`} />
                <p className="text-xs text-gray-500 mt-1">{fmt(rc.hourlyRate)}/hr</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Original Pgs</label>
                <input type="number" value={input.originalPages || ''} onChange={e => setInput({ ...input, originalPages: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg" />
                <p className="text-xs text-gray-500 mt-1">{fmt(rc.originalPageRate)}/pg</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Copy Pgs</label>
                <input type="number" value={input.copyPages || ''} onChange={e => setInput({ ...input, copyPages: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg" />
                <p className="text-xs text-gray-500 mt-1">{fmt(rc.copyPageRate)}/pg</p>
              </div>
            </div>

            {/* Video / Exhibit / Interpreter surcharges */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Video Pages</label>
                <input type="number" value={input.videoPages || ''} onChange={e => setInput({ ...input, videoPages: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg" />
                <p className="text-xs text-gray-500 mt-1">{fmt(rc.videoSurcharge || 0)}/pg surcharge</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Exhibit Pages</label>
                <input type="number" value={input.exhibitPages || ''} onChange={e => setInput({ ...input, exhibitPages: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg" />
                <p className="text-xs text-gray-500 mt-1">{fmt(rc.exhibitSurcharge || 0)}/pg surcharge</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Interpreter Pages</label>
                <input type="number" value={input.interpreterPages || ''} onChange={e => setInput({ ...input, interpreterPages: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg" />
                <p className="text-xs text-gray-500 mt-1">{fmt(rc.interpreterFee || 0)}/pg</p>
              </div>
            </div>

            {/* Minimum transcript + copies */}
            <div className="p-3 bg-gray-50 rounded-lg border space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={!!input.useMinTranscript} onChange={e => setInput({ ...input, useMinTranscript: e.target.checked, numCopies: e.target.checked ? input.numCopies : 0 })} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium">Minimum Transcript Amount</span>
                {(rc.minimumTranscriptAmount || 0) > 0 && <span className="text-sm text-gray-500 ml-auto">{fmt(rc.minimumTranscriptAmount)}</span>}
              </label>
              {input.useMinTranscript && !(rc.minimumTranscriptAmount) && <p className="text-xs text-red-500 ml-7">No minimum transcript amount set on your rate card.</p>}
              <div>
                <label className="block text-sm font-medium mb-1">No. of Copies</label>
                <input type="number" value={input.numCopies || ''} onChange={e => setInput({ ...input, numCopies: parseInt(e.target.value) || 0 })} disabled={!input.useMinTranscript} className={`w-full px-3 py-2 border rounded-lg ${!input.useMinTranscript ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`} />
                <p className="text-xs text-gray-500 mt-1">{fmt(rc.minimumTranscriptCopyAmount || 0)}/copy — only applies with Minimum Transcript Amount</p>
              </div>
            </div>

            {/* Expedite */}
            {(() => {
              const expRatesUi = rc.expediteRates?.length ? rc.expediteRates : settings.expediteRates
              const selExp = expRatesUi.find(e => e.days === input.expediteDays)
              const showExpPages = !!(selExp?.useAmount && selExp?.amount > 0 && !input.originalPages)
              return (
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">Expedite</label>
                    <select value={input.expediteDays} onChange={e => setInput({ ...input, expediteDays: parseInt(e.target.value), expeditePages: 0 })} className="w-full px-3 py-2 border rounded-lg">
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
                      <label className="block text-sm font-medium mb-1">Pages for Expedite</label>
                      <input type="number" value={input.expeditePages || ''} onChange={e => setInput({ ...input, expeditePages: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg" />
                      <p className="text-xs text-amber-600 mt-1">No original page count entered — enter pages here for the expedite fee calculation.</p>
                    </div>
                  )}
                </div>
              )
            })()}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Additional Charges</label>
                <button onClick={addCharge} className="text-sm text-indigo-600 flex items-center gap-1"><Plus className="w-3 h-3" />Add Charge</button>
              </div>
              {input.additionalCharges.length === 0
                ? <p className="text-sm text-gray-400 italic">No additional charges</p>
                : <div className="space-y-2">{input.additionalCharges.map((c, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input type="text" value={c.description} onChange={e => { const u = [...input.additionalCharges]; u[i] = { ...u[i], description: e.target.value }; setInput({ ...input, additionalCharges: u }) }} placeholder="Description (e.g., Travel, Parking)" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                    <input type="text" inputMode="decimal" value={c.displayAmount || ''} onChange={e => { const val = e.target.value; const cents = Math.round(parseFloat(val.replace(/[^0-9.]/g, '')) * 100) || 0; const u = [...input.additionalCharges]; u[i] = { ...u[i], displayAmount: val, amount: cents }; setInput({ ...input, additionalCharges: u }) }} placeholder="$0.00" className="w-28 px-3 py-2 border rounded-lg text-sm" />
                    <button onClick={() => removeCharge(i)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}</div>
              }
            </div>
          </>}

          {invType === 'LATE_CANCEL' && <>
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-red-800">Late Cancellation Fee: <span className="font-bold">{fmt(rc.lateCancelFee || settings.lateCancelFee)}</span></p>
              <p className="text-sm text-red-600 mt-1">Use when a job is cancelled without sufficient notice.</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={!!input.useAppearanceFee} onChange={e => setInput({ ...input, useAppearanceFee: e.target.checked, useAppearanceFeeHalfDay: false })} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium">Full Day Appearance Fee</span>
                {fullDayFee > 0 && <span className="text-sm text-gray-500 ml-auto">{fmt(fullDayFee)}</span>}
              </label>
              {input.useAppearanceFee && !fullDayFee && <p className="text-xs text-red-500 ml-7">No full day appearance fee set on your rate card.</p>}
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={!!input.useAppearanceFeeHalfDay} onChange={e => setInput({ ...input, useAppearanceFeeHalfDay: e.target.checked, useAppearanceFee: false })} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium">Half Day Appearance Fee</span>
                {halfDayFee > 0 && <span className="text-sm text-gray-500 ml-auto">{fmt(halfDayFee)}</span>}
              </label>
              {input.useAppearanceFeeHalfDay && !halfDayFee && <p className="text-xs text-red-500 ml-7">No half day appearance fee set on your rate card.</p>}
            </div>
            <AdditionalCharges input={input} setInput={setInput} />
          </>}

          {invType === 'CNA' && <>
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-amber-800">Certificate of Non-Appearance Fee: <span className="font-bold">{fmt(rc.cnaFee || settings.cnaFee)}</span></p>
              <p className="text-sm text-amber-600 mt-1">Use when the witness or party fails to appear.</p>
            </div>
            <AdditionalCharges input={input} setInput={setInput} />
          </>}

          <div>
            <label className="block text-sm font-medium mb-1">Invoice PDF Link <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="url" value={pdfLink} onChange={e => setPdfLink(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-lg border">
            <input type="checkbox" checked={!!boLink} onChange={e => setBoLink(e.target.checked)} className="w-4 h-4 rounded" />
            <span className="text-sm font-medium">BO Link</span>
            <span className="text-xs text-gray-400 ml-auto">Required for approval</span>
          </label>
          <div>
            <label className="block text-sm font-medium mb-1">Notes / Comments <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea value={input.invoiceComment || ''} onChange={e => setInput({ ...input, invoiceComment: e.target.value })} placeholder="Any additional notes for this invoice..." rows={3} className="w-full px-3 py-2 border rounded-lg text-sm resize-none" />
          </div>
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Preview</h3>
            {calc.lineItems.length === 0
              ? <p className="text-gray-500 text-sm">Enter values</p>
              : <table className="w-full text-sm"><tbody>
                  {calc.lineItems.map((l, i) => <tr key={i}><td className="py-1">{l.description}</td><td className="py-1 text-right">{fmt(l.amountCents)}</td></tr>)}
                  <tr className="border-t font-bold"><td className="py-2">Total</td><td className="py-2 text-right">{fmt(calc.totalCents)}</td></tr>
                </tbody></table>
            }
          </div>
          <button onClick={onSubmit} disabled={!invoiceNumber.trim() || calc.totalCents === 0} className={`w-full py-3 text-white rounded-lg font-medium disabled:opacity-50 ${submitClass}`}>
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function AdditionalCharges({ input, setInput }) {
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
