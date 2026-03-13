import { useState } from 'react'
import { FileText, LogOut, Plus, Download, Send, ChevronDown, ChevronUp, Pencil } from 'lucide-react'
import { fmt, now } from '../utils/format'
import { statusColors, typeColors, typeLabels } from '../utils/constants'
import { calcInvoice } from '../utils/calc'
import { genPDF } from '../utils/pdf'
import InvoiceForm from './InvoiceForm'

const emptyInput = () => ({
  hours: 0, originalPages: 0, copyPages: 0, expediteDays: 0,
  additionalCharges: [], caseName: '', jobNumber: '', jobDate: '',
  rb9JobNumber: '', invoiceComment: '', useAppearanceFee: false,
  useAppearanceFeeHalfDay: false, useMinTranscript: false, useInPersonFee: false,
  numCopies: 0, videoPages: 0, exhibitPages: 0,
})

export default function ReporterDash({ user, invoices, setInvoices, settings, onLogout }) {
  const [view, setView] = useState('list')
  const [sel, setSel] = useState(null)
  const [invType, setInvType] = useState('STANDARD')
  const [input, setInput] = useState(emptyInput())
  const [editingInv, setEditingInv] = useState(null)
  const [editInvType, setEditInvType] = useState('STANDARD')
  const [editInput, setEditInput] = useState(null)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [editInvoiceNumber, setEditInvoiceNumber] = useState('')
  const [pdfLink, setPdfLink] = useState('')
  const [editPdfLink, setEditPdfLink] = useState('')

  const rc = user.rateCard
  const my = invoices.filter(i => i.reporterUserId === user.id)
  const calc = calcInvoice(input, rc, settings, invType)
  const editCalc = editInput ? calcInvoice(editInput, rc, settings, editInvType) : { lineItems: [], totalCents: 0 }

  const create = () => {
    setInvoices([...invoices, {
      id: Date.now().toString(),
      invoiceNumber: invoiceNumber.trim(),
      reporterUserId: user.id,
      reporterName: user.displayName,
      status: 'DRAFT',
      invoiceType: invType,
      input,
      pdfLink: pdfLink.trim(),
      caseInfo: { caseName: input.caseName, jobNumber: input.jobNumber, jobDate: input.jobDate, rb9JobNumber: input.rb9JobNumber || '' },
      invoiceComment: input.invoiceComment || '',
      lineItems: calc.lineItems,
      totalCents: calc.totalCents,
      auditLog: [{ action: 'Created', by: user.displayName, at: now() }],
    }])
    setView('list'); setInvType('STANDARD'); setInvoiceNumber(''); setPdfLink('')
    setInput(emptyInput())
  }

  const submit = inv => setInvoices(invoices.map(i => i.id === inv.id
    ? { ...i, status: 'SUBMITTED', submittedAt: now(), auditLog: [...(i.auditLog || []), { action: 'Submitted', by: user.displayName, at: now() }] }
    : i
  ))

  const openEdit = inv => {
    const savedInput = inv.input || {
      hours: 0, originalPages: 0, copyPages: 0, expediteDays: 0, additionalCharges: [],
      caseName: inv.caseInfo?.caseName || '', jobNumber: inv.caseInfo?.jobNumber || '',
      jobDate: inv.caseInfo?.jobDate || '', rb9JobNumber: inv.caseInfo?.rb9JobNumber || '',
      invoiceComment: inv.invoiceComment || '', useAppearanceFee: false,
      useAppearanceFeeHalfDay: false, useMinTranscript: false, useInPersonFee: false, numCopies: 0, videoPages: 0, exhibitPages: 0,
    }
    setEditingInv(inv)
    setEditInvType(inv.invoiceType || 'STANDARD')
    setEditInput({
      useAppearanceFeeHalfDay: false, useMinTranscript: false, useInPersonFee: false, numCopies: 0, videoPages: 0, exhibitPages: 0,
      ...savedInput,
    })
    setEditInvoiceNumber(inv.invoiceNumber || '')
    setEditPdfLink(inv.pdfLink || '')
    setView('edit')
  }

  const saveEdit = () => {
    const updated = {
      ...editingInv,
      invoiceNumber: editInvoiceNumber.trim() || editingInv.invoiceNumber,
      pdfLink: editPdfLink.trim(),
      invoiceType: editInvType,
      input: editInput,
      caseInfo: { caseName: editInput.caseName, jobNumber: editInput.jobNumber, jobDate: editInput.jobDate, rb9JobNumber: editInput.rb9JobNumber || '' },
      invoiceComment: editInput.invoiceComment || '',
      lineItems: editCalc.lineItems,
      totalCents: editCalc.totalCents,
      status: 'DRAFT',
      returnComment: null,
      auditLog: [...(editingInv.auditLog || []), { action: 'Edited & resubmitted for review', by: user.displayName, at: now() }],
    }
    setInvoices(invoices.map(i => i.id === editingInv.id ? updated : i))
    setView('list'); setEditingInv(null); setEditInput(null); setEditInvoiceNumber(''); setEditPdfLink('')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <style>{`html, body { overflow-y: auto !important; height: auto !important; }`}</style>
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold">Reporter Dashboard</h1>
            <p className="text-sm text-gray-500">{user.displayName}</p>
          </div>
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 text-gray-600"><LogOut className="w-4 h-4" />Sign Out</button>
      </header>

      <main className="p-6 pb-16">
        {view === 'list' && <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">My Invoices</h2>
            <button onClick={() => setView('create')} className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2"><Plus className="w-4 h-4" />New</button>
          </div>
          <div className="space-y-4">
            {my.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No invoices yet</p>
            ) : my.map(inv => (
              <div key={inv.id} className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{inv.invoiceNumber}</p>
                    <p className="text-sm text-gray-500">{inv.submittedAt ? `Submitted ${inv.submittedAt}` : 'Draft'}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[inv.invoiceType]}`}>{typeLabels[inv.invoiceType]}</span>
                    {inv.approvedBy && <p className="text-xs text-green-600 mt-1">Approved by {inv.approvedBy}</p>}
                    {inv.paidBy && <p className="text-xs text-purple-600">Paid by {inv.paidBy}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[inv.status]}`}>{inv.status}</span>
                    <span className="font-semibold">{fmt(inv.totalCents)}</span>
                    <button onClick={() => genPDF(inv, user.displayName)} className="p-2 text-gray-500 hover:text-gray-700"><Download className="w-4 h-4" /></button>
                    {inv.status === 'DRAFT' && (
                      <button onClick={() => submit(inv)} className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg flex items-center gap-1"><Send className="w-3 h-3" />Submit</button>
                    )}
                    {inv.status === 'RETURNED' && (
                      <button onClick={() => openEdit(inv)} className="px-3 py-1 bg-orange-500 text-white text-sm rounded-lg flex items-center gap-1"><Pencil className="w-3 h-3" />Edit</button>
                    )}
                    <button onClick={() => setSel(sel?.id === inv.id ? null : inv)} className="p-2 text-gray-500">
                      {sel?.id === inv.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {sel?.id === inv.id && (
                  <div className="mt-4 pt-4 border-t">
                    <table className="w-full text-sm">
                      <tbody>
                        {inv.lineItems.map((l, i) => (
                          <tr key={i}>
                            <td className="py-1">{l.description}</td>
                            <td className="py-1 text-right text-gray-500">{l.qty} × {fmt(l.unitCents)}</td>
                            <td className="py-1 text-right font-medium">{fmt(l.amountCents)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {inv.returnComment && (
                      <div className="mt-3 p-3 bg-orange-50 rounded border border-orange-200 text-sm text-orange-800">
                        <b>Returned:</b> {inv.returnComment}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>}

        {view === 'create' && (
          <InvoiceForm
            title="Create Invoice"
            invoiceNumber={invoiceNumber} setInvoiceNumber={setInvoiceNumber}
            pdfLink={pdfLink} setPdfLink={setPdfLink}
            input={input} setInput={setInput}
            invType={invType} setInvType={setInvType}
            rc={rc} settings={settings} calc={calc}
            onBack={() => { setView('list'); setInvoiceNumber(''); setPdfLink('') }}
            onSubmit={create}
            submitLabel="Create Invoice"
            submitClass="bg-emerald-600 hover:bg-emerald-700"
          />
        )}

        {view === 'edit' && editInput && (
          <InvoiceForm
            title={`Edit Invoice — ${editingInv.invoiceNumber}`}
            invoiceNumber={editInvoiceNumber} setInvoiceNumber={setEditInvoiceNumber}
            pdfLink={editPdfLink} setPdfLink={setEditPdfLink}
            input={editInput} setInput={setEditInput}
            invType={editInvType} setInvType={setEditInvType}
            rc={rc} settings={settings} calc={editCalc}
            onBack={() => { setView('list'); setEditingInv(null); setEditInput(null); setEditInvoiceNumber(''); setEditPdfLink('') }}
            onSubmit={saveEdit}
            submitLabel="Save Changes & Resubmit"
            submitClass="bg-orange-500 hover:bg-orange-600"
            returnComment={editingInv.returnComment}
          />
        )}
      </main>
    </div>
  )
}
