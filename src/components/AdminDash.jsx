import { useState } from 'react'
import {
  FileText, Download, Check, RotateCcw, DollarSign, X, LogOut,
  Plus, UserPlus, Users, Shield, Clock, Settings, Trash2, Pencil,
  AlertTriangle, Upload,
} from 'lucide-react'
import { fmt, now } from '../utils/format'
import { statusColors, typeColors, typeLabels, STATUS_COLORS } from '../utils/constants'
import { calcInvoice } from '../utils/calc'
import { genPDF } from '../utils/pdf'
import { parseCSV } from '../utils/csv'
import JobsTab from './JobsTab'
import AdminCreateInvModal from './AdminCreateInvModal'
import AdminEditInvModal from './AdminEditInvModal'

const emptyAdminInvInput = () => ({
  hours: 0, originalPages: 0, copyPages: 0, expediteDays: 0,
  additionalCharges: [], caseName: '', jobNumber: '', jobDate: '',
  rb9JobNumber: '', invoiceComment: '', useAppearanceFee: false,
  useAppearanceFeeHalfDay: false, useMinTranscript: false, useInPersonFee: false,
  numCopies: 0, videoPages: 0, exhibitPages: 0, interpreterPages: 0, expertPages: 0, expeditePages: 0,
  jobId: '', submissionDate: '', onTime: '', boLink: false,
})

export default function AdminDash({
  user, invoices, setInvoices,
  reporters, setReporters,
  admins, setAdmins,
  auditLog, setAuditLog,
  settings, setSettings,
  jobs, setJobs,
  onLogout,
}) {
  const [tab, setTab] = useState('pending')
  const [sel, setSel] = useState(null)
  const [payModal, setPayModal] = useState(null)
  const [payConfirm, setPayConfirm] = useState('')
  const [retModal, setRetModal] = useState(null)
  const [retComment, setRetComment] = useState('')
  const [addRep, setAddRep] = useState(false)
  const [addAdm, setAddAdm] = useState(false)
  const [editRep, setEditRep] = useState(null)
  const [newRep, setNewRep] = useState({ displayName: '', code: '', isFirm: false, hourlyRate: '', originalPageRate: '', copyPageRate: '', lateCancelFee: '', cnaFee: '', appearanceFeeFullDay: '', appearanceFeeHalfDay: '', minimumTranscriptAmount: '', minimumTranscriptCopyAmount: '', videoSurcharge: '', exhibitSurcharge: '', interpreterFee: '', expertMedTechFee: '', inPersonFee: '', profileAdditionalFees: [], expediteRates: settings.expediteRates.map(e => ({ ...e, displayAmount: '' })) })
  const [newAdm, setNewAdm] = useState({ displayName: '', code: '' })
  const [adminCreateInv, setAdminCreateInv] = useState(false)
  const [adminInvRepId, setAdminInvRepId] = useState('')
  const [adminInvType, setAdminInvType] = useState('STANDARD')
  const [adminInvNumber, setAdminInvNumber] = useState('')
  const [adminInvInput, setAdminInvInput] = useState(emptyAdminInvInput())
  const [adminEditInv, setAdminEditInv] = useState(null)
  const [adminEditInvType, setAdminEditInvType] = useState('STANDARD')
  const [adminEditInvNumber, setAdminEditInvNumber] = useState('')
  const [adminEditInvInput, setAdminEditInvInput] = useState(null)
  const [filterReporter, setFilterReporter] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterDeposition, setFilterDeposition] = useState('')
  const [filterRb9, setFilterRb9] = useState('')
  const [filterInvNum, setFilterInvNum] = useState('')
  const [filterFirm, setFilterFirm] = useState('all')
  const [sortInvNum, setSortInvNum] = useState(null)
  const [filterRepSearch, setFilterRepSearch] = useState('')
  const [auditFilterReporter, setAuditFilterReporter] = useState('')
  const [auditFilterDate, setAuditFilterDate] = useState('')
  const [auditFilterDeposition, setAuditFilterDeposition] = useState('')
  const [exportStartDate, setExportStartDate] = useState('')
  const [exportEndDate, setExportEndDate] = useState('')
  const [deleteInvConfirm, setDeleteInvConfirm] = useState(null)

  const addDays = (dateStr, days) => { const d = new Date(dateStr); d.setDate(d.getDate() + days); return d.toISOString().split('T')[0] }

  const autoCloseEligible = inv => {
    if (inv.status === 'CLOSED') return false
    if (inv.status === 'DISPUTED') return false
    if (inv.status === 'PAID') {
      if (!inv.disputeResolvedAt && !inv.disputedAt) return now() >= addDays(inv.paidAt, 15)
    }
    return false
  }
  const runAutoClose = (invList) => invList.map(i => autoCloseEligible(i)
    ? { ...i, status: 'CLOSED', closedAt: now(), closedBy: 'System (auto)', auditLog: [...(i.auditLog || []), { action: 'Auto-closed (15 days after paid)', by: 'System', at: now() }] }
    : i
  )

  const pendingAutoClose = invoices.some(autoCloseEligible)
  if (pendingAutoClose) { setTimeout(() => setInvoices(prev => runAutoClose(prev)), 0) }

  const pending = invoices.filter(i => ['SUBMITTED', 'RETURNED'].includes(i.status))
  const readyToPay = invoices.filter(i => i.status === 'APPROVED' && !i.paidAt)
  const paid = invoices.filter(i => ['PAID', 'DISPUTED'].includes(i.status))
  const closed = invoices.filter(i => i.status === 'CLOSED')

  const applyInvFilters = list => list.filter(i => {
    if (filterReporter && !i.reporterName?.toLowerCase().includes(filterReporter.toLowerCase())) return false
    if (filterDeposition && !i.caseInfo?.caseName?.toLowerCase().includes(filterDeposition.toLowerCase())) return false
    if (filterDate && i.caseInfo?.jobDate !== filterDate) return false
    if (filterRb9 && !i.caseInfo?.rb9JobNumber?.toLowerCase().includes(filterRb9.toLowerCase())) return false
    if (filterInvNum && !i.invoiceNumber?.toLowerCase().includes(filterInvNum.toLowerCase())) return false
    if (filterFirm !== 'all') {
      const rep = reporters.find(r => r.displayName === i.reporterName)
      const isFirm = !!rep?.isFirm
      if (filterFirm === 'firm' && !isFirm) return false
      if (filterFirm === 'individual' && isFirm) return false
    }
    return true
  })
  const displayed = (() => {
    const filtered = applyInvFilters(
      tab === 'pending' ? pending : tab === 'ready_to_pay' ? readyToPay : tab === 'paid' ? paid : tab === 'closed' ? closed : []
    )
    if (!sortInvNum) return filtered
    return [...filtered].sort((a, b) => {
      const cmp = (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '', undefined, { numeric: true })
      return sortInvNum === 'asc' ? cmp : -cmp
    })
  })()

  const log = (action, target) => {
    const entry = { id: Date.now().toString(), action, target, by: user.displayName, at: now() }
    setAuditLog(prev => [...prev, entry])
  }

  const approve = inv => {
    const updated = { ...inv, status: 'APPROVED', approvedAt: now(), approvedBy: user.displayName, auditLog: [...(inv.auditLog || []), { action: 'Approved', by: user.displayName, at: now() }] }
    setInvoices(invoices.map(i => i.id === inv.id ? updated : i))
    log('Invoice Approved', inv.invoiceNumber)
  }
  const unapprove = inv => {
    const updated = { ...inv, status: 'SUBMITTED', approvedAt: null, approvedBy: null, auditLog: [...(inv.auditLog || []), { action: 'Approval reversed', by: user.displayName, at: now() }] }
    setInvoices(invoices.map(i => i.id === inv.id ? updated : i))
    log('Invoice Unapproved', inv.invoiceNumber)
    setSel(s => s?.id === inv.id ? updated : s)
  }
  const returnInv = () => {
    setInvoices(invoices.map(i => i.id === retModal.id ? { ...i, status: 'RETURNED', returnComment: retComment, auditLog: [...(i.auditLog || []), { action: 'Returned', by: user.displayName, at: now() }] } : i))
    log('Invoice Returned', retModal.invoiceNumber)
    setRetModal(null); setRetComment('')
  }
  const pay = () => {
    if (payConfirm !== payModal.invoiceNumber) return
    const pid = 'po_' + Math.random().toString(36).substr(2, 8)
    const paidTs = now()
    setInvoices(invoices.map(i => i.id === payModal.id ? { ...i, status: 'PAID', paidAt: paidTs, paidBy: user.displayName, stripePayoutId: pid, auditLog: [...(i.auditLog || []), { action: 'Paid', by: user.displayName, at: paidTs }] } : i))
    if (payModal.jobId) {
      setJobs(prev => prev.map(j => j.deposition_id === payModal.jobId ? { ...j, invoicePaidAt: paidTs } : j))
    }
    log('Invoice Paid', payModal.invoiceNumber)
    setPayModal(null); setPayConfirm('')
  }
  const closeInv = inv => {
    setInvoices(invoices.map(i => i.id === inv.id ? { ...i, status: 'CLOSED', closedAt: now(), closedBy: user.displayName, auditLog: [...(i.auditLog || []), { action: 'Closed', by: user.displayName, at: now() }] } : i))
    log('Invoice Closed', inv.invoiceNumber)
  }
  const deleteInvoice = inv => {
    setInvoices(invoices.filter(i => i.id !== inv.id))
    if (sel?.id === inv.id) setSel(null)
    log('Invoice Deleted', inv.invoiceNumber)
    setDeleteInvConfirm(null)
  }
  const disputeInv = inv => {
    const updated = { ...inv, status: 'DISPUTED', disputedAt: now(), disputedBy: user.displayName, auditLog: [...(inv.auditLog || []), { action: 'Marked Disputed', by: user.displayName, at: now() }] }
    setInvoices(invoices.map(i => i.id === inv.id ? updated : i))
    log('Invoice Disputed', inv.invoiceNumber)
    setSel(s => s?.id === inv.id ? updated : s)
  }
  const resolveDispute = inv => {
    const resolvedAt = now()
    const closeAt = addDays(resolvedAt, 15)
    const updated = { ...inv, status: 'PAID', disputeResolvedAt: resolvedAt, disputeResolvedBy: user.displayName, disputeCloseAt: closeAt, auditLog: [...(inv.auditLog || []), { action: 'Dispute Resolved', by: user.displayName, at: resolvedAt }] }
    setInvoices(invoices.map(i => i.id === inv.id ? updated : i))
    log('Dispute Resolved', inv.invoiceNumber)
    setSel(s => s?.id === inv.id ? updated : s)
  }

  const createOnBehalf = () => {
    const rep = reporters.find(r => r.id === adminInvRepId)
    if (!rep) return
    const rc = rep.rateCard
    const calc = calcInvoice(adminInvInput, rc, settings, adminInvType)
    const invNum = adminInvNumber.trim()
    const newInv = {
      id: Date.now().toString(),
      invoiceNumber: invNum,
      reporterUserId: rep.id,
      reporterName: rep.displayName,
      status: 'SUBMITTED',
      invoiceType: adminInvType,
      input: adminInvInput,
      pdfLink: (adminInvInput.pdfLink || '').trim(),
      boLink: !!adminInvInput.boLink,
      jobId: adminInvInput.jobId || '',
      submissionDate: adminInvInput.submissionDate || '',
      onTime: adminInvInput.onTime || '',
      caseInfo: { caseName: adminInvInput.caseName, jobNumber: adminInvInput.jobNumber, jobDate: adminInvInput.jobDate, rb9JobNumber: adminInvInput.rb9JobNumber || '' },
      invoiceComment: adminInvInput.invoiceComment || '',
      lineItems: calc.lineItems,
      totalCents: calc.totalCents,
      submittedAt: now(),
      auditLog: [{ action: `Created by admin on behalf of ${rep.displayName}`, by: user.displayName, at: now() }],
    }
    setInvoices([...invoices, newInv])
    if (adminInvInput.jobId) {
      setJobs(prev => prev.map(j => j.deposition_id === adminInvInput.jobId ? { ...j, reporter_name: rep.displayName, invoiceCreatedAt: now(), submissionDate: adminInvInput.submissionDate || '', onTime: adminInvInput.onTime || '' } : j))
    }
    log('Invoice Created (Admin)', invNum)
    setAdminCreateInv(false)
    setAdminInvRepId(''); setAdminInvType('STANDARD'); setAdminInvNumber('')
    setAdminInvInput(emptyAdminInvInput())
    setTab('pending'); setSel(null)
  }

  const openAdminEdit = inv => {
    const savedInput = inv.input || {
      hours: 0, originalPages: 0, copyPages: 0, expediteDays: 0, additionalCharges: [],
      caseName: inv.caseInfo?.caseName || '', jobNumber: inv.caseInfo?.jobNumber || '',
      jobDate: inv.caseInfo?.jobDate || '', rb9JobNumber: inv.caseInfo?.rb9JobNumber || '',
      invoiceComment: inv.invoiceComment || '', useAppearanceFee: false,
      useAppearanceFeeHalfDay: false, useMinTranscript: false, useInPersonFee: false, numCopies: 0, videoPages: 0, exhibitPages: 0, interpreterPages: 0, expeditePages: 0, boLink: false,
    }
    setAdminEditInv(inv)
    setAdminEditInvType(inv.invoiceType || 'STANDARD')
    setAdminEditInvNumber(inv.invoiceNumber || '')
    setAdminEditInvInput({
      useAppearanceFeeHalfDay: false, useMinTranscript: false, useInPersonFee: false, numCopies: 0, videoPages: 0, exhibitPages: 0, interpreterPages: 0, expeditePages: 0, boLink: false,
      ...savedInput, pdfLink: inv.pdfLink || ''
    })
  }

  const saveAdminEdit = () => {
    const rep = reporters.find(r => r.id === adminEditInv.reporterUserId)
    const rc = rep ? rep.rateCard : {}
    const calc = calcInvoice(adminEditInvInput, rc, settings, adminEditInvType)
    const updated = {
      ...adminEditInv,
      invoiceNumber: adminEditInvNumber.trim() || adminEditInv.invoiceNumber,
      pdfLink: (adminEditInvInput.pdfLink || '').trim() || adminEditInv.pdfLink || '',
      boLink: adminEditInvInput.boLink !== undefined ? !!adminEditInvInput.boLink : !!adminEditInv.boLink,
      invoiceType: adminEditInvType,
      input: adminEditInvInput,
      caseInfo: { caseName: adminEditInvInput.caseName, jobNumber: adminEditInvInput.jobNumber, jobDate: adminEditInvInput.jobDate, rb9JobNumber: adminEditInvInput.rb9JobNumber || '' },
      invoiceComment: adminEditInvInput.invoiceComment || '',
      lineItems: calc.lineItems,
      totalCents: calc.totalCents,
      status: 'SUBMITTED',
      returnComment: null,
      auditLog: [...(adminEditInv.auditLog || []), { action: 'Edited by admin', by: user.displayName, at: now() }],
    }
    setInvoices(invoices.map(i => i.id === adminEditInv.id ? updated : i))
    log('Invoice Edited (Admin)', adminEditInv.invoiceNumber)
    setSel(updated)
    setAdminEditInv(null); setAdminEditInvInput(null); setAdminEditInvNumber(''); setAdminEditInvType('STANDARD')
  }

  // ── Reporter management ────────────────────────────────────────────────────
  const REPORTER_TEMPLATE_CSV = 'name,hourly_rate,original_page_rate,copy_page_rate,late_cancel_fee,cna_fee,appearance_fee_full_day,appearance_fee_half_day,minimum_transcript_amount,minimum_transcript_copy_amount,video_surcharge,exhibit_surcharge,interpreter_fee,in_person_fee,expedite_1d_percent,expedite_2d_percent,expedite_3d_percent,expedite_4d_percent,expedite_5d_percent,expedite_6d_percent,expedite_7d_percent,expedite_8d_percent,expedite_1d_amount,expedite_2d_amount,expedite_3d_amount,expedite_4d_amount,expedite_5d_amount,expedite_6d_amount,expedite_7d_amount,expedite_8d_amount\nJane Reporter,75.00,6.50,1.25,150.00,125.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,100,80,60,45,35,25,15,10,0,0,0,0,0,0,0,0\nJohn Reporter,80.00,7.00,1.50,150.00,125.00,50.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0,0,0,0,0,0,0,0,1.50,1.20,0.90,0.65,0.50,0.35,0.20,0.10'
  const downloadReporterTemplate = () => {
    const blob = new Blob([REPORTER_TEMPLATE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'reporter-template.csv'
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  const handleReporterCSV = e => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const lines = ev.target.result.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
      const rows = lines.slice(1).map(line => {
        const vals = []; let cur = ''; let inQ = false
        for (let i = 0; i < line.length; i++) {
          if (line[i] === '"') { inQ = !inQ }
          else if (line[i] === ',' && !inQ) { vals.push(cur.trim()); cur = '' }
          else { cur += line[i] }
        }
        vals.push(cur.trim())
        const obj = {}
        headers.forEach((h, idx) => { obj[h] = (vals[idx] || '').replace(/^"|"$/g, '') })
        return obj
      }).filter(r => r.name)
      let added = 0; let updated = 0
      const map = {}
      reporters.forEach(r => { map[r.code.toUpperCase()] = { ...r } })
      rows.forEach((r, rowIdx) => {
        const code = r.name.trim().replace(/\s+/g, '').toUpperCase()
        if (!code) return
        const rateCard = {
          hourlyRate: Math.round(parseFloat(r.hourly_rate || 0) * 100),
          originalPageRate: Math.round(parseFloat(r.original_page_rate || 0) * 100),
          copyPageRate: Math.round(parseFloat(r.copy_page_rate || 0) * 100),
          lateCancelFee: Math.round(parseFloat(r.late_cancel_fee || 0) * 100) || settings.lateCancelFee,
          cnaFee: Math.round(parseFloat(r.cna_fee || 0) * 100) || settings.cnaFee,
          appearanceFeeFullDay: Math.round(parseFloat(r.appearance_fee_full_day || r.appearance_fee || 0) * 100),
          appearanceFeeHalfDay: Math.round(parseFloat(r.appearance_fee_half_day || 0) * 100),
          minimumTranscriptAmount: Math.round(parseFloat(r.minimum_transcript_amount || 0) * 100),
          minimumTranscriptCopyAmount: Math.round(parseFloat(r.minimum_transcript_copy_amount || 0) * 100),
          videoSurcharge: Math.round(parseFloat(r.video_surcharge || 0) * 100),
          exhibitSurcharge: Math.round(parseFloat(r.exhibit_surcharge || 0) * 100),
          interpreterFee: Math.round(parseFloat(r.interpreter_fee || 0) * 100),
          inPersonFee: Math.round(parseFloat(r.in_person_fee || 0) * 100),
          expediteRates: settings.expediteRates.map(exp => {
            const amtStr = r[`expedite_${exp.days}d_amount`]
            const pctStr = r[`expedite_${exp.days}d_percent`]
            const useAmount = amtStr !== undefined && amtStr !== '' && parseFloat(amtStr) > 0
            if (useAmount) {
              return { ...exp, useAmount: true, amount: Math.round(parseFloat(amtStr) * 100), percent: exp.percent }
            }
            return {
              ...exp,
              useAmount: false,
              amount: exp.amount || 0,
              percent: pctStr !== undefined && pctStr !== '' ? parseInt(pctStr) : exp.percent,
            }
          }),
        }
        if (map[code]) {
          map[code] = { ...map[code], displayName: r.name, code, rateCard, editedBy: user.displayName, editedAt: now() }
          updated++
        } else {
          map[code] = { id: `${Date.now()}-${rowIdx}-${Math.random().toString(36).slice(2)}`, displayName: r.name, code, rateCard, createdBy: user.displayName, createdAt: now() }
          added++
        }
      })
      setReporters(Object.values(map))
      log('Reporters CSV Uploaded', `${rows.length} rows — ${added} added, ${updated} updated (${file.name})`)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const saveNewRep = () => {
    setReporters([...reporters, {
      id: Date.now().toString(),
      displayName: newRep.displayName,
      code: newRep.code.toUpperCase(),
      isFirm: !!newRep.isFirm,
      rateCard: {
        hourlyRate: Math.round(parseFloat(newRep.hourlyRate) * 100),
        originalPageRate: Math.round(parseFloat(newRep.originalPageRate) * 100),
        copyPageRate: Math.round(parseFloat(newRep.copyPageRate) * 100),
        lateCancelFee: Math.round(parseFloat(newRep.lateCancelFee || 0) * 100) || settings.lateCancelFee,
        cnaFee: Math.round(parseFloat(newRep.cnaFee || 0) * 100) || settings.cnaFee,
        appearanceFeeFullDay: Math.round(parseFloat(newRep.appearanceFeeFullDay || 0) * 100),
        appearanceFeeHalfDay: Math.round(parseFloat(newRep.appearanceFeeHalfDay || 0) * 100),
        minimumTranscriptAmount: Math.round(parseFloat(newRep.minimumTranscriptAmount || 0) * 100),
        minimumTranscriptCopyAmount: Math.round(parseFloat(newRep.minimumTranscriptCopyAmount || 0) * 100),
        videoSurcharge: Math.round(parseFloat(newRep.videoSurcharge || 0) * 100),
        exhibitSurcharge: Math.round(parseFloat(newRep.exhibitSurcharge || 0) * 100),
        interpreterFee: Math.round(parseFloat(newRep.interpreterFee || 0) * 100),
        expertMedTechFee: Math.round(parseFloat(newRep.expertMedTechFee || 0) * 100),
        inPersonFee: Math.round(parseFloat(newRep.inPersonFee || 0) * 100),
        profileAdditionalFees: newRep.profileAdditionalFees || [],
        expediteRates: newRep.expediteRates,
      },
      createdBy: user.displayName,
      createdAt: now(),
    }])
    log('Reporter Added', newRep.displayName)
    setNewRep({ displayName: '', code: '', isFirm: false, hourlyRate: '', originalPageRate: '', copyPageRate: '', lateCancelFee: '', cnaFee: '', appearanceFeeFullDay: '', appearanceFeeHalfDay: '', minimumTranscriptAmount: '', minimumTranscriptCopyAmount: '', videoSurcharge: '', exhibitSurcharge: '', interpreterFee: '', expertMedTechFee: '', inPersonFee: '', profileAdditionalFees: [], expediteRates: settings.expediteRates.map(e => ({ ...e, displayAmount: '' })) })
    setAddRep(false)
  }

  const openEdit = r => setEditRep({
    id: r.id, displayName: r.displayName, code: r.code, isFirm: !!r.isFirm,
    hourlyRate: (r.rateCard.hourlyRate / 100).toFixed(2),
    originalPageRate: (r.rateCard.originalPageRate / 100).toFixed(2),
    copyPageRate: (r.rateCard.copyPageRate / 100).toFixed(2),
    lateCancelFee: ((r.rateCard.lateCancelFee || settings.lateCancelFee) / 100).toFixed(2),
    cnaFee: ((r.rateCard.cnaFee || settings.cnaFee) / 100).toFixed(2),
    appearanceFeeFullDay: ((r.rateCard.appearanceFeeFullDay || r.rateCard.appearanceFee || 0) / 100).toFixed(2),
    appearanceFeeHalfDay: ((r.rateCard.appearanceFeeHalfDay || 0) / 100).toFixed(2),
    minimumTranscriptAmount: ((r.rateCard.minimumTranscriptAmount || 0) / 100).toFixed(2),
    minimumTranscriptCopyAmount: ((r.rateCard.minimumTranscriptCopyAmount || 0) / 100).toFixed(2),
    videoSurcharge: ((r.rateCard.videoSurcharge || 0) / 100).toFixed(2),
    exhibitSurcharge: ((r.rateCard.exhibitSurcharge || 0) / 100).toFixed(2),
    interpreterFee: ((r.rateCard.interpreterFee || 0) / 100).toFixed(2),
    expertMedTechFee: ((r.rateCard.expertMedTechFee || 0) / 100).toFixed(2),
    inPersonFee: ((r.rateCard.inPersonFee || 0) / 100).toFixed(2),
    profileAdditionalFees: r.rateCard.profileAdditionalFees || [],
    expediteRates: (r.rateCard.expediteRates || settings.expediteRates.map(e => ({ ...e }))).map(e => ({ ...e, displayAmount: e.useAmount && e.amount ? (e.amount / 100).toFixed(2) : '' })),
  })

  const saveEdit = () => {
    setReporters(reporters.map(r => r.id === editRep.id ? {
      ...r,
      displayName: editRep.displayName,
      code: editRep.code.toUpperCase(),
      isFirm: !!editRep.isFirm,
      rateCard: {
        hourlyRate: Math.round(parseFloat(editRep.hourlyRate) * 100),
        originalPageRate: Math.round(parseFloat(editRep.originalPageRate) * 100),
        copyPageRate: Math.round(parseFloat(editRep.copyPageRate) * 100),
        lateCancelFee: Math.round(parseFloat(editRep.lateCancelFee) * 100),
        cnaFee: Math.round(parseFloat(editRep.cnaFee) * 100),
        appearanceFeeFullDay: Math.round(parseFloat(editRep.appearanceFeeFullDay || 0) * 100),
        appearanceFeeHalfDay: Math.round(parseFloat(editRep.appearanceFeeHalfDay || 0) * 100),
        minimumTranscriptAmount: Math.round(parseFloat(editRep.minimumTranscriptAmount || 0) * 100),
        minimumTranscriptCopyAmount: Math.round(parseFloat(editRep.minimumTranscriptCopyAmount || 0) * 100),
        videoSurcharge: Math.round(parseFloat(editRep.videoSurcharge || 0) * 100),
        exhibitSurcharge: Math.round(parseFloat(editRep.exhibitSurcharge || 0) * 100),
        interpreterFee: Math.round(parseFloat(editRep.interpreterFee || 0) * 100),
        expertMedTechFee: Math.round(parseFloat(editRep.expertMedTechFee || 0) * 100),
        inPersonFee: Math.round(parseFloat(editRep.inPersonFee || 0) * 100),
        profileAdditionalFees: editRep.profileAdditionalFees || [],
        expediteRates: editRep.expediteRates,
      },
      editedBy: user.displayName,
      editedAt: now(),
    } : r))
    log('Reporter Edited', editRep.displayName)
    setEditRep(null)
  }

  const delRep = r => {
    if (confirm(`Delete ${r.displayName}?`)) {
      setReporters(reporters.filter(x => x.id !== r.id))
      log('Reporter Deleted', r.displayName)
    }
  }

  const saveNewAdm = () => {
    setAdmins([...admins, { id: Date.now().toString(), displayName: newAdm.displayName, code: newAdm.code.toUpperCase() }])
    log('Admin Added', newAdm.displayName)
    setNewAdm({ displayName: '', code: '' }); setAddAdm(false)
  }

  const delAdm = a => {
    if (admins.length <= 1) return alert('Cannot delete last admin')
    if (a.id === user.id) return alert('Cannot delete yourself')
    if (confirm(`Delete ${a.displayName}?`)) {
      setAdmins(admins.filter(x => x.id !== a.id))
      log('Admin Deleted', a.displayName)
    }
  }

  const updateExpRate = (days, percent) => setSettings({
    ...settings,
    expediteRates: settings.expediteRates.map(e => e.days === days ? { ...e, percent: parseInt(percent) || 0 } : e),
  })

  const clearFilters = () => {
    setFilterReporter(''); setFilterDate(''); setFilterDeposition('')
    setFilterRb9(''); setFilterInvNum(''); setFilterRepSearch('')
    setAuditFilterReporter(''); setAuditFilterDate(''); setAuditFilterDeposition('')
  }

  const tabs = [
    ['pending', 'Pending Approval', pending.length],
    ['ready_to_pay', 'Ready to Pay', readyToPay.length],
    ['paid', 'Paid', paid.length],
    ['closed', 'Closed', null],
    ['jobs', 'Jobs', jobs.length],
    ['reporters', 'Reporters', reporters.length],
    ['admins', 'Admins', admins.length],
    ['settings', 'Settings', null],
    ['audit', 'Audit', null],
    ['export', 'Export', null],
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold">Admin Dashboard</h1>
            <p className="text-sm text-gray-500">{user.displayName}</p>
          </div>
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <LogOut className="w-4 h-4" />Sign Out
        </button>
      </header>

      <main className="p-6">
        {/* Tab nav */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map(([k, l, c]) => (
            <button key={k} onClick={() => { setTab(k); setSel(null); clearFilters() }} className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${tab === k ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>
              {k === 'ready_to_pay' && <DollarSign className="w-4 h-4" />}
              {k === 'jobs' && <FileText className="w-4 h-4" />}
              {k === 'reporters' && <Users className="w-4 h-4" />}
              {k === 'admins' && <Shield className="w-4 h-4" />}
              {k === 'settings' && <Settings className="w-4 h-4" />}
              {k === 'audit' && <Clock className="w-4 h-4" />}
              {k === 'export' && <Download className="w-4 h-4" />}
              {l}{c !== null && ` (${c})`}
            </button>
          ))}
        </div>

        {/* Settings tab */}
        {tab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-4 border-b bg-gray-50 font-semibold">Special Fees</div>
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm w-48">Late Cancellation Fee</span>
                  <span className="text-gray-500">$</span>
                  <input type="number" step="0.01" value={(settings.lateCancelFee / 100).toFixed(2)} onChange={e => setSettings({ ...settings, lateCancelFee: Math.round(parseFloat(e.target.value) * 100) || 0 })} className="w-28 px-3 py-2 border rounded-lg" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm w-48">CNA (Non-Appearance) Fee</span>
                  <span className="text-gray-500">$</span>
                  <input type="number" step="0.01" value={(settings.cnaFee / 100).toFixed(2)} onChange={e => setSettings({ ...settings, cnaFee: Math.round(parseFloat(e.target.value) * 100) || 0 })} className="w-28 px-3 py-2 border rounded-lg" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-4 border-b bg-gray-50 font-semibold">Expedite Rates (% of base total)</div>
              <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                {settings.expediteRates.map(e => (
                  <div key={e.days} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium w-16">{e.label}</span>
                    <input type="number" value={e.percent} onChange={ev => updateExpRate(e.days, ev.target.value)} className="w-16 px-2 py-1 border rounded text-sm text-center" />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Audit tab */}
        {tab === 'audit' && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl shadow-sm border p-3 flex flex-wrap gap-3 items-center">
              <input type="text" placeholder="Filter by reporter..." value={auditFilterReporter} onChange={e => setAuditFilterReporter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm w-48" />
              <input type="date" value={auditFilterDate} onChange={e => setAuditFilterDate(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
              <input type="text" placeholder="Deposition name..." value={auditFilterDeposition} onChange={e => setAuditFilterDeposition(e.target.value)} className="px-3 py-2 border rounded-lg text-sm w-48" />
              {(auditFilterReporter || auditFilterDate || auditFilterDeposition) && (
                <button onClick={() => { setAuditFilterReporter(''); setAuditFilterDate(''); setAuditFilterDeposition('') }} className="text-xs text-indigo-600 hover:underline">Clear</button>
              )}
            </div>
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-4 border-b bg-gray-50 font-semibold">System Audit Log</div>
              <div className="divide-y max-h-96 overflow-y-auto">
                {[...auditLog].reverse().filter(l => {
                  if (auditFilterReporter && !l.by?.toLowerCase().includes(auditFilterReporter.toLowerCase()) && !l.target?.toLowerCase().includes(auditFilterReporter.toLowerCase())) return false
                  if (auditFilterDate && !l.at?.startsWith(auditFilterDate)) return false
                  if (auditFilterDeposition && !l.target?.toLowerCase().includes(auditFilterDeposition.toLowerCase())) return false
                  return true
                }).map(l => (
                  <div key={l.id} className="p-4 flex justify-between">
                    <div><p className="font-medium">{l.action}</p><p className="text-sm text-gray-500">{l.target}</p></div>
                    <div className="text-right"><p className="text-sm text-indigo-600">{l.by}</p><p className="text-xs text-gray-400">{l.at}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Jobs tab */}
        {tab === 'jobs' && <JobsTab jobs={jobs} setJobs={setJobs} reporters={reporters} onLog={log} />}

        {/* Export tab */}
        {tab === 'export' && (() => {
          const filteredJobs = jobs.filter(j => {
            const d = (j.deposition_datetime || '').substring(0, 10)
            if (exportStartDate && d < exportStartDate) return false
            if (exportEndDate && d > exportEndDate) return false
            return true
          })
          const jobInvoices = j => invoices.filter(i => i.jobId === j.deposition_id)
          const escCSV = v => {
            if (v === null || v === undefined) return ''
            const s = String(v)
            return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
          }
          const JOB_COLS = ['deposition_id','deposition_name','deposition_status','deposition_datetime','event_state','organization_name','format','need_reporter','need_steno','need_video','recording_status','certified_transcript_requested_at','transcript_due_date','turnaround_type','reporter_name','invoiceCreatedAt','submissionDate','onTime','invoicePaidAt']
          const INV_COLS = ['invoiceNumber','invoiceType','status','totalCents','submittedAt','approvedAt','approvedBy','paidAt','paidBy','submissionDate','onTime','pdfLink']
          const ALL_HEADERS = [...JOB_COLS, 'reporter_is_firm', ...INV_COLS.map(c => `invoice_${c}`)]
          const buildCSV = () => {
            const rows = [ALL_HEADERS.join(',')]
            filteredJobs.forEach(j => {
              const rep = reporters.find(r => r.displayName === j.reporter_name)
              const isFirm = escCSV(rep?.isFirm ? 'yes' : rep ? 'no' : '')
              const linked = jobInvoices(j)
              if (linked.length === 0) {
                rows.push([...JOB_COLS.map(c => escCSV(j[c])), isFirm, ...INV_COLS.map(() => '')].join(','))
              } else {
                linked.forEach(inv => {
                  const invVals = INV_COLS.map(c => {
                    if (c === 'totalCents') return escCSV(inv.totalCents != null ? (inv.totalCents / 100).toFixed(2) : '')
                    return escCSV(inv[c])
                  })
                  rows.push([...JOB_COLS.map(c => escCSV(j[c])), isFirm, ...invVals].join(','))
                })
              }
            })
            return rows.join('\n')
          }
          const doExport = () => {
            const csv = buildCSV()
            const blob = new Blob([csv], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url; a.download = `jobs-export-${now()}.csv`
            document.body.appendChild(a); a.click()
            document.body.removeChild(a); URL.revokeObjectURL(url)
            log('Data Exported', `${filteredJobs.length} jobs${exportStartDate || exportEndDate ? ` (${exportStartDate || '...'} to ${exportEndDate || '...'})` : ''}`)
          }
          const previewRows = filteredJobs.slice(0, 5)
          return (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-lg font-bold mb-1">Export Jobs + Invoice Data</h2>
                <p className="text-sm text-gray-500 mb-5">Exports all job fields plus any linked invoice fields as a single CSV. One row per invoice; jobs with no invoices appear as a single row with empty invoice columns.</p>
                <div className="flex flex-wrap gap-4 items-end mb-5">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Event Date</label>
                    <input type="date" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Event Date</label>
                    <input type="date" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  {(exportStartDate || exportEndDate) && <button onClick={() => { setExportStartDate(''); setExportEndDate('') }} className="text-xs text-indigo-600 hover:underline self-end pb-2">Clear dates</button>}
                  <div className="self-end">
                    <span className="text-sm text-gray-500 mr-3">{filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} · {filteredJobs.reduce((n, j) => n + (jobInvoices(j).length || 1), 0)} rows</span>
                    <button onClick={doExport} disabled={filteredJobs.length === 0} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 inline-flex"><Download className="w-4 h-4" />Download CSV</button>
                  </div>
                </div>
              </div>
              {filteredJobs.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border">
                  <div className="p-4 border-b bg-gray-50"><span className="font-semibold text-sm">Preview <span className="text-gray-400 font-normal">(first {Math.min(5, filteredJobs.length)} jobs)</span></span></div>
                  <div className="overflow-x-auto" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {['Deposition Name','Status','Event Date','Organization','Reporter','Invoice #','Inv. Status','Total','Submission Date','On Time'].map(h => (
                            <th key={h} className="px-3 py-2 text-left border-b font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {previewRows.map(j => {
                          const linked = jobInvoices(j)
                          const rows = linked.length > 0 ? linked : [null]
                          return rows.map((inv, idx) => (
                            <tr key={`${j.deposition_id}-${idx}`} className="hover:bg-gray-50">
                              {idx === 0 && <td className="px-3 py-2 font-medium" rowSpan={rows.length}>{j.deposition_name}</td>}
                              {idx === 0 && <td className="px-3 py-2" rowSpan={rows.length}><span className={`px-1.5 py-0.5 rounded text-xs ${STATUS_COLORS[j.deposition_status] || 'bg-gray-100'}`}>{j.deposition_status}</span></td>}
                              {idx === 0 && <td className="px-3 py-2 whitespace-nowrap" rowSpan={rows.length}>{j.deposition_datetime ? j.deposition_datetime.substring(0, 10) : '—'}</td>}
                              {idx === 0 && <td className="px-3 py-2" rowSpan={rows.length}>{j.organization_name}</td>}
                              {idx === 0 && <td className="px-3 py-2" rowSpan={rows.length}>{j.reporter_name || <span className="text-gray-300">—</span>}</td>}
                              <td className="px-3 py-2 font-mono">{inv ? inv.invoiceNumber : <span className="text-gray-300">—</span>}</td>
                              <td className="px-3 py-2">{inv ? <span className={`px-1.5 py-0.5 rounded text-xs ${statusColors[inv.status] || ''}`}>{inv.status}</span> : <span className="text-gray-300">—</span>}</td>
                              <td className="px-3 py-2 text-right">{inv ? fmt(inv.totalCents) : <span className="text-gray-300">—</span>}</td>
                              <td className="px-3 py-2 whitespace-nowrap">{inv?.submissionDate || <span className="text-gray-300">—</span>}</td>
                              <td className="px-3 py-2">{inv?.onTime ? <span className={`px-1.5 py-0.5 rounded text-xs ${inv.onTime === 'yes' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{inv.onTime === 'yes' ? 'Yes' : 'No'}</span> : <span className="text-gray-300">—</span>}</td>
                            </tr>
                          ))
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {filteredJobs.length === 0 && (
                <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-400">
                  <Download className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No jobs match the selected date range</p>
                  <p className="text-sm mt-1">Adjust the start and end dates, or clear them to export all jobs</p>
                </div>
              )}
            </div>
          )
        })()}

        {/* Admins tab */}
        {tab === 'admins' && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <span className="font-semibold">Manage Admins</span>
              <button onClick={() => setAddAdm(true)} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-1"><UserPlus className="w-4 h-4" />Add Admin</button>
            </div>
            <div className="divide-y">
              {admins.map(a => (
                <div key={a.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{a.displayName}{a.id === user.id && <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">You</span>}</p>
                    <p className="text-sm text-gray-500">Code: <span className="font-mono">{a.code}</span></p>
                  </div>
                  <button onClick={() => delAdm(a)} disabled={a.id === user.id} className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg disabled:opacity-50">Delete</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reporters tab */}
        {tab === 'reporters' && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-4 border-b bg-gray-50 flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-3">
                <span className="font-semibold">Manage Reporters</span>
                <input type="text" placeholder="Search reporters..." value={filterRepSearch} onChange={e => setFilterRepSearch(e.target.value)} className="px-3 py-2 border rounded-lg text-sm w-52" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={downloadReporterTemplate} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-1"><Download className="w-4 h-4" />CSV Template</button>
                <label className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-200 flex items-center gap-1">
                  <Upload className="w-4 h-4" />Upload CSV
                  <input type="file" accept=".csv" onChange={handleReporterCSV} className="hidden" />
                </label>
                <button onClick={() => setAddRep(true)} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-1"><UserPlus className="w-4 h-4" />Add Reporter</button>
              </div>
            </div>
            <div className="divide-y">
              {reporters.filter(r => !filterRepSearch || r.displayName.toLowerCase().includes(filterRepSearch.toLowerCase())).map(r => (
                <div key={r.id} className="p-4">
                  <div className="flex justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{r.displayName}</p>
                        {r.isFirm && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Firm</span>}
                      </div>
                      <p className="text-sm text-gray-500">Code: <span className="font-mono">{r.code}</span></p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(r)} className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-lg">Edit</button>
                      <button onClick={() => delRep(r)} className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg">Delete</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm p-3 bg-gray-50 rounded-lg">
                    <div><span className="text-gray-500">Hourly:</span> {fmt(r.rateCard.hourlyRate)}</div>
                    <div><span className="text-gray-500">Original:</span> {fmt(r.rateCard.originalPageRate)}</div>
                    <div><span className="text-gray-500">Copy:</span> {fmt(r.rateCard.copyPageRate)}</div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Added by {r.createdBy} on {r.createdAt}{r.editedBy && ` • Edited by ${r.editedBy}`}</p>
                </div>
              ))}
              {reporters.filter(r => !filterRepSearch || r.displayName.toLowerCase().includes(filterRepSearch.toLowerCase())).length === 0 && (
                <p className="p-4 text-gray-400 text-sm text-center">No reporters match</p>
              )}
            </div>
          </div>
        )}

        {/* Invoice tabs (pending / ready_to_pay / paid / closed) */}
        {['pending', 'ready_to_pay', 'paid', 'closed'].includes(tab) && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl shadow-sm border p-3 flex flex-wrap gap-3 items-center">
              <input type="text" placeholder="Reporter name..." value={filterReporter} onChange={e => { setFilterReporter(e.target.value); setSel(null) }} className="px-3 py-2 border rounded-lg text-sm w-44" />
              <input type="date" value={filterDate} onChange={e => { setFilterDate(e.target.value); setSel(null) }} className="px-3 py-2 border rounded-lg text-sm" title="Filter by job date" />
              <input type="text" placeholder="Deposition name..." value={filterDeposition} onChange={e => { setFilterDeposition(e.target.value); setSel(null) }} className="px-3 py-2 border rounded-lg text-sm w-44" />
              <input type="text" placeholder="RB9 Job #..." value={filterRb9} onChange={e => { setFilterRb9(e.target.value); setSel(null) }} className="px-3 py-2 border rounded-lg text-sm w-36" />
              <input type="text" placeholder="Invoice #..." value={filterInvNum} onChange={e => { setFilterInvNum(e.target.value); setSel(null) }} className="px-3 py-2 border rounded-lg text-sm w-36" />
              <div className="flex gap-1">
                {[['all','All'],['firm','Firm'],['individual','Individual']].map(([v,l]) => (
                  <button key={v} onClick={() => { setFilterFirm(v); setSel(null) }} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${filterFirm === v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>{l}</button>
                ))}
              </div>
              {(filterReporter || filterDate || filterDeposition || filterRb9 || filterInvNum || filterFirm !== 'all') && (
                <button onClick={() => { setFilterReporter(''); setFilterDate(''); setFilterDeposition(''); setFilterRb9(''); setFilterInvNum(''); setFilterFirm('all') }} className="text-xs text-indigo-600 hover:underline">Clear</button>
              )}
              {(filterReporter || filterDate || filterDeposition || filterRb9 || filterInvNum || filterFirm !== 'all') && (
                <span className="text-xs text-gray-500 ml-auto">{displayed.length} result{displayed.length !== 1 ? 's' : ''}</span>
              )}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Invoice list */}
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Invoices</span>
                    <button onClick={() => setSortInvNum(s => s === null ? 'asc' : s === 'asc' ? 'desc' : null)} className={`text-xs px-2 py-1 rounded border ${sortInvNum ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`} title="Sort by invoice number">
                      Inv # {sortInvNum === 'asc' ? '↑' : sortInvNum === 'desc' ? '↓' : '↕'}
                    </button>
                  </div>
                  {tab === 'pending' && (
                    <button
                      onClick={() => reporters.length > 0 ? setAdminCreateInv(true) : alert('Add at least one reporter before creating an invoice.')}
                      title={reporters.length === 0 ? 'Add a reporter first' : ''}
                      className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-1 hover:bg-indigo-700"
                    >
                      <Plus className="w-4 h-4" />Create Invoice
                    </button>
                  )}
                </div>
                <div className="divide-y max-h-96 overflow-y-auto">
                  {displayed.length === 0
                    ? <p className="p-4 text-gray-500 text-center">No invoices</p>
                    : displayed.map(inv => (
                      <div key={inv.id} onClick={() => setSel(inv)} className={`p-4 cursor-pointer hover:bg-gray-50 ${sel?.id === inv.id ? 'bg-indigo-50' : ''}`}>
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium">{inv.invoiceNumber}</p>
                            <p className="text-sm text-gray-500">{inv.reporterName}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[inv.invoiceType] || typeColors.STANDARD}`}>{typeLabels[inv.invoiceType] || 'Standard'}</span>
                            {tab === 'ready_to_pay' && inv.approvedAt && (
                              <p className="text-xs text-green-600 mt-1">✓ Approved {inv.approvedAt}</p>
                            )}
                            {tab === 'paid' && inv.paidAt && (
                              <p className="text-xs text-purple-600 mt-1">Paid {inv.paidAt}</p>
                            )}
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[inv.status]}`}>{inv.status}</span>
                            <p className="text-sm font-medium">{fmt(inv.totalCents)}</p>
                            <button onClick={e => { e.stopPropagation(); setDeleteInvConfirm(inv) }} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete invoice"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Invoice detail */}
              {sel && (
                <div className="bg-white rounded-xl shadow-sm border">
                  <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <div>
                      <span className="font-semibold">{sel.invoiceNumber}</span>
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${typeColors[sel.invoiceType] || typeColors.STANDARD}`}>{typeLabels[sel.invoiceType] || 'Standard'}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[sel.status]}`}>{sel.status}</span>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-500 mb-1">Reporter: <span className="font-medium text-gray-900">{sel.reporterName}</span></p>
                    {sel.returnComment && (
                      <div className="my-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-xs font-semibold text-orange-700 mb-1">Return Reason</p>
                        <p className="text-sm text-orange-600">{sel.returnComment}</p>
                      </div>
                    )}
                    {sel.approvedBy && <p className="text-xs text-green-600 mb-1">Approved by {sel.approvedBy} on {sel.approvedAt}</p>}
                    {sel.paidBy && <p className="text-xs text-purple-600 mb-1">Paid by {sel.paidBy} on {sel.paidAt}</p>}

                    {/* BO Link */}
                    <div className="my-3 p-3 bg-gray-50 rounded-lg border">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={!!sel.boLink} onChange={e => { const updated = { ...sel, boLink: e.target.checked }; setInvoices(invoices.map(i => i.id === sel.id ? updated : i)); setSel(updated) }} className="w-4 h-4 rounded" />
                        <span className="text-xs font-semibold text-gray-600">BO Link</span>
                        {!sel.boLink && (sel.status === 'SUBMITTED' || sel.status === 'RETURNED') && <span className="text-red-500 text-xs ml-auto">* Required to approve</span>}
                        {sel.boLink && <span className="text-green-600 text-xs ml-auto">✓ Confirmed</span>}
                      </label>
                    </div>

                    {/* PDF Link */}
                    <div className="my-3 p-3 bg-gray-50 rounded-lg border">
                      <p className="text-xs font-semibold text-gray-600 mb-2">
                        Invoice PDF Link {!sel.pdfLink && (sel.status === 'SUBMITTED' || sel.status === 'RETURNED') && <span className="text-red-500 ml-1">* Required to approve</span>}
                      </p>
                      {sel.pdfLink ? (
                        <div className="flex items-center gap-2">
                          <a href={sel.pdfLink} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 underline truncate flex-1">{sel.pdfLink}</a>
                          <button onClick={() => { const url = prompt('Update PDF link:', sel.pdfLink); if (url !== null) { const updated = { ...sel, pdfLink: url.trim() }; setInvoices(invoices.map(i => i.id === sel.id ? updated : i)); setSel(updated) } }} className="text-xs text-gray-500 hover:text-gray-700 whitespace-nowrap">Edit</button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input type="url" placeholder="https://..." className="flex-1 px-2 py-1 border rounded text-sm" onKeyDown={e => { if (e.key === 'Enter' && e.target.value.trim()) { const updated = { ...sel, pdfLink: e.target.value.trim() }; setInvoices(invoices.map(i => i.id === sel.id ? updated : i)); setSel(updated); e.target.value = '' } }} />
                          <button onClick={e => { const inp = e.target.closest('div').querySelector('input'); if (inp?.value.trim()) { const updated = { ...sel, pdfLink: inp.value.trim() }; setInvoices(invoices.map(i => i.id === sel.id ? updated : i)); setSel(updated); inp.value = '' } }} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">Save</button>
                        </div>
                      )}
                    </div>

                    {sel.caseInfo && (
                      <div className="my-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Event Information</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-gray-500">Event Name:</span> {sel.caseInfo.caseName || '-'}</div>
                          <div><span className="text-gray-500">Deposition ID:</span> {sel.caseInfo.jobNumber || '-'}</div>
                          <div><span className="text-gray-500">Date:</span> {sel.caseInfo.jobDate || '-'}</div>
                          <div><span className="text-gray-500">RB9 Job #:</span> {sel.caseInfo.rb9JobNumber || '-'}</div>
                        </div>
                      </div>
                    )}
                    <div className="my-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-xs font-semibold text-blue-700 mb-1">Notes / Comments</p>
                      <textarea
                        value={sel.invoiceComment || ''}
                        onChange={e => { const updated = { ...sel, invoiceComment: e.target.value }; setInvoices(invoices.map(i => i.id === sel.id ? updated : i)); setSel(updated) }}
                        placeholder="Add notes..."
                        rows={3}
                        className="w-full px-2 py-1.5 border rounded text-sm bg-white resize-none"
                      />
                    </div>

                    <table className="w-full text-sm my-4 border rounded">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Description</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                          <th className="px-3 py-2 text-right">Rate</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sel.lineItems.map((l, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-2">{l.description}</td>
                            <td className="px-3 py-2 text-right">{l.qty}</td>
                            <td className="px-3 py-2 text-right">{fmt(l.unitCents)}</td>
                            <td className="px-3 py-2 text-right">{fmt(l.amountCents)}</td>
                          </tr>
                        ))}
                        <tr className="border-t bg-gray-50 font-semibold">
                          <td colSpan="3" className="px-3 py-2">Total</td>
                          <td className="px-3 py-2 text-right">{fmt(sel.totalCents)}</td>
                        </tr>
                      </tbody>
                    </table>

                    {sel.disputedAt && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded mb-3">
                        <p className="text-xs font-semibold text-red-700 mb-1">Dispute History</p>
                        <p className="text-xs text-red-600">Opened {sel.disputedAt} by {sel.disputedBy}</p>
                        {sel.disputeResolvedAt && <p className="text-xs text-green-600 mt-1">Resolved {sel.disputeResolvedAt} by {sel.disputeResolvedBy} · Auto-closes {sel.disputeCloseAt}</p>}
                      </div>
                    )}
                    {sel.paidAt && !sel.disputedAt && !sel.disputeResolvedAt && (
                      <p className="text-xs text-gray-400 mb-3">Auto-closes {addDays(sel.paidAt, 15)}</p>
                    )}

                    {sel.auditLog?.length > 0 && (
                      <div className="p-3 bg-gray-50 rounded mb-4">
                        <p className="text-xs font-semibold mb-1">Audit Trail</p>
                        {sel.auditLog.map((a, i) => <p key={i} className="text-xs text-gray-500">{a.at} - {a.action} by {a.by}</p>)}
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => genPDF(sel, sel.reporterName)} className="px-3 py-2 bg-gray-600 text-white rounded-lg flex items-center gap-1"><Download className="w-4 h-4" />PDF</button>
                      {sel.status === 'SUBMITTED' && <>
                        <button onClick={() => approve(sel)} disabled={!sel.pdfLink || !sel.boLink} title={!sel.pdfLink ? 'PDF link required to approve' : !sel.boLink ? 'BO link required to approve' : ''} className="px-3 py-2 bg-green-600 text-white rounded-lg flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"><Check className="w-4 h-4" />Approve</button>
                        <button onClick={() => setRetModal(sel)} className="px-3 py-2 bg-orange-500 text-white rounded-lg flex items-center gap-1"><RotateCcw className="w-4 h-4" />Return</button>
                      </>}
                      {sel.status === 'RETURNED' && <>
                        <button onClick={() => approve(sel)} disabled={!sel.pdfLink || !sel.boLink} title={!sel.pdfLink ? 'PDF link required to approve' : !sel.boLink ? 'BO link required to approve' : ''} className="px-3 py-2 bg-green-600 text-white rounded-lg flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"><Check className="w-4 h-4" />Approve</button>
                        <button onClick={() => openAdminEdit(sel)} className="px-3 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-1"><Pencil className="w-4 h-4" />Edit</button>
                      </>}
                      {sel.status === 'APPROVED' && <>
                        <button onClick={() => unapprove(sel)} className="px-3 py-2 bg-orange-500 text-white rounded-lg flex items-center gap-1"><RotateCcw className="w-4 h-4" />Unapprove</button>
                        <button onClick={() => setPayModal(sel)} className="px-3 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-1"><DollarSign className="w-4 h-4" />Pay</button>
                      </>}
                      {sel.status === 'PAID' && !sel.disputedAt && (
                        <button onClick={() => disputeInv(sel)} className="px-3 py-2 bg-red-600 text-white rounded-lg flex items-center gap-1"><AlertTriangle className="w-4 h-4" />Dispute</button>
                      )}
                      {sel.status === 'DISPUTED' && (
                        <button onClick={() => resolveDispute(sel)} className="px-3 py-2 bg-green-600 text-white rounded-lg flex items-center gap-1"><Check className="w-4 h-4" />Resolve Dispute</button>
                      )}
                      {sel.status === 'PAID' && (
                        <button onClick={() => closeInv(sel)} className="px-3 py-2 bg-gray-600 text-white rounded-lg flex items-center gap-1"><X className="w-4 h-4" />Close</button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Pay modal */}
      {payModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Confirm Payment</h3>
            <p className="mb-4">Type <span className="font-mono font-bold">{payModal.invoiceNumber}</span> to pay {fmt(payModal.totalCents)}</p>
            <input type="text" value={payConfirm} onChange={e => setPayConfirm(e.target.value)} className="w-full px-3 py-2 border rounded-lg mb-4" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setPayModal(null); setPayConfirm('') }} className="px-4 py-2 text-gray-600">Cancel</button>
              <button onClick={pay} disabled={payConfirm !== payModal.invoiceNumber} className="px-4 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50">Pay</button>
            </div>
          </div>
        </div>
      )}

      {/* Return modal */}
      {retModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Return Invoice</h3>
            <textarea value={retComment} onChange={e => setRetComment(e.target.value)} placeholder="Reason..." className="w-full px-3 py-2 border rounded-lg mb-4 h-24" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setRetModal(null); setRetComment('') }} className="px-4 py-2 text-gray-600">Cancel</button>
              <button onClick={returnInv} className="px-4 py-2 bg-orange-500 text-white rounded-lg">Return</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete invoice confirm */}
      {deleteInvConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold mb-2">Delete Invoice?</h3>
            <p className="text-sm text-gray-600 mb-1">Are you sure you want to permanently delete invoice <span className="font-semibold">{deleteInvConfirm.invoiceNumber}</span>?</p>
            <p className="text-xs text-gray-400 mb-5">Reporter: {deleteInvConfirm.reporterName} · {fmt(deleteInvConfirm.totalCents)} · {deleteInvConfirm.status}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteInvConfirm(null)} className="px-4 py-2 text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={() => deleteInvoice(deleteInvConfirm)} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Reporter modal */}
      {addRep && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg overflow-y-auto" style={{ maxHeight: '90vh' }}>
            <h3 className="text-lg font-bold mb-4">Add Reporter</h3>
            <div className="space-y-4">
              <input type="text" value={newRep.displayName} onChange={e => setNewRep({ ...newRep, displayName: e.target.value, code: e.target.value.replace(/\s+/g, '') })} placeholder="Name" className="w-full px-3 py-2 border rounded-lg" />
              <div className="w-full px-3 py-2 border rounded-lg bg-gray-50 font-mono text-sm flex items-center gap-2">
                <span className="text-gray-400 text-xs shrink-0">Login code:</span>
                <span className={newRep.code ? 'text-gray-700' : 'text-gray-300 italic'}>{newRep.code || 'auto-generated from name'}</span>
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-lg border">
                <input type="checkbox" checked={!!newRep.isFirm} onChange={e => setNewRep({ ...newRep, isFirm: e.target.checked })} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium">Firm</span>
                <span className="text-xs text-gray-400 ml-auto">Check if this is a firm, not an individual reporter</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div><p className="text-xs text-gray-500 mb-1">Hourly Rate ($)</p><input type="number" step="0.01" value={newRep.hourlyRate} onChange={e => setNewRep({ ...newRep, hourlyRate: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><p className="text-xs text-gray-500 mb-1">Original Page ($)</p><input type="number" step="0.01" value={newRep.originalPageRate} onChange={e => setNewRep({ ...newRep, originalPageRate: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><p className="text-xs text-gray-500 mb-1">Copy Page ($)</p><input type="number" step="0.01" value={newRep.copyPageRate} onChange={e => setNewRep({ ...newRep, copyPageRate: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 border rounded-lg" /></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><p className="text-xs text-gray-500 mb-1">Late Cancel Fee ($)</p><input type="number" step="0.01" value={newRep.lateCancelFee} onChange={e => setNewRep({ ...newRep, lateCancelFee: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><p className="text-xs text-gray-500 mb-1">CNA Fee ($)</p><input type="number" step="0.01" value={newRep.cnaFee} onChange={e => setNewRep({ ...newRep, cnaFee: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><p className="text-xs text-gray-500 mb-1">Full Day Appearance ($)</p><input type="number" step="0.01" value={newRep.appearanceFeeFullDay} onChange={e => setNewRep({ ...newRep, appearanceFeeFullDay: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 border rounded-lg" /></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><p className="text-xs text-gray-500 mb-1">Half Day Appearance ($)</p><input type="number" step="0.01" value={newRep.appearanceFeeHalfDay} onChange={e => setNewRep({ ...newRep, appearanceFeeHalfDay: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><p className="text-xs text-gray-500 mb-1">Min Transcript Amt ($)</p><input type="number" step="0.01" value={newRep.minimumTranscriptAmount} onChange={e => setNewRep({ ...newRep, minimumTranscriptAmount: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><p className="text-xs text-gray-500 mb-1">Min Copy Amt ($)</p><input type="number" step="0.01" value={newRep.minimumTranscriptCopyAmount} onChange={e => setNewRep({ ...newRep, minimumTranscriptCopyAmount: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 border rounded-lg" /></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><p className="text-xs text-gray-500 mb-1">Video Surcharge ($)</p><input type="number" step="0.01" value={newRep.videoSurcharge} onChange={e => setNewRep({ ...newRep, videoSurcharge: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><p className="text-xs text-gray-500 mb-1">Exhibit Surcharge ($)</p><input type="number" step="0.01" value={newRep.exhibitSurcharge} onChange={e => setNewRep({ ...newRep, exhibitSurcharge: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><p className="text-xs text-gray-500 mb-1">Interpreter Fee ($/pg)</p><input type="number" step="0.01" value={newRep.interpreterFee} onChange={e => setNewRep({ ...newRep, interpreterFee: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><p className="text-xs text-gray-500 mb-1">Expert/Med/Tech ($/pg)</p><input type="number" step="0.01" value={newRep.expertMedTechFee} onChange={e => setNewRep({ ...newRep, expertMedTechFee: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><p className="text-xs text-gray-500 mb-1">In-Person Fee ($)</p><input type="number" step="0.01" value={newRep.inPersonFee} onChange={e => setNewRep({ ...newRep, inPersonFee: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 border rounded-lg" /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Profile Additional Fees</p>
                  <button onClick={() => setNewRep({ ...newRep, profileAdditionalFees: [...(newRep.profileAdditionalFees || []), { description: '', displayAmount: '', amount: 0 }] })} className="text-sm text-indigo-600 flex items-center gap-1"><Plus className="w-3 h-3" />Add Fee</button>
                </div>
                {(newRep.profileAdditionalFees || []).length === 0 ? <p className="text-sm text-gray-400 italic">No profile fees defined</p> : (
                  <div className="space-y-2">{(newRep.profileAdditionalFees || []).map((f, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input type="text" value={f.description} onChange={e => { const u = [...newRep.profileAdditionalFees]; u[i] = { ...u[i], description: e.target.value }; setNewRep({ ...newRep, profileAdditionalFees: u }) }} placeholder="Fee name (e.g. Video)" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                      <input type="text" inputMode="decimal" value={f.displayAmount || ''} onChange={e => { const val = e.target.value; const cents = Math.round(parseFloat(val.replace(/[^0-9.]/g, '')) * 100) || 0; const u = [...newRep.profileAdditionalFees]; u[i] = { ...u[i], displayAmount: val, amount: cents }; setNewRep({ ...newRep, profileAdditionalFees: u }) }} placeholder="$0.00" className="w-24 px-3 py-2 border rounded-lg text-sm" />
                      <button onClick={() => setNewRep({ ...newRep, profileAdditionalFees: newRep.profileAdditionalFees.filter((_, x) => x !== i) })} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}</div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Expedite Rates</p>
                <div className="space-y-2">{newRep.expediteRates.map((e, i) => (
                  <div key={e.days} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium w-12">{e.days}d</span>
                    <select value={e.useAmount ? 'amount' : 'percent'} onChange={ev => { const rates = [...newRep.expediteRates]; rates[i] = { ...rates[i], useAmount: ev.target.value === 'amount', displayAmount: '' }; setNewRep({ ...newRep, expediteRates: rates }) }} className="px-2 py-1 border rounded text-sm"><option value="percent">%</option><option value="amount">$</option></select>
                    {e.useAmount
                      ? <input type="text" inputMode="decimal" value={e.displayAmount ?? ''} onChange={ev => { const val = ev.target.value; const rates = [...newRep.expediteRates]; rates[i] = { ...rates[i], displayAmount: val, amount: Math.round(parseFloat(val.replace(/[^0-9.]/g, '')) * 100) || 0 }; setNewRep({ ...newRep, expediteRates: rates }) }} placeholder="0.00" className="w-20 px-2 py-1 border rounded text-sm" />
                      : <input type="number" value={e.percent} onChange={ev => { const rates = [...newRep.expediteRates]; rates[i].percent = parseInt(ev.target.value) || 0; setNewRep({ ...newRep, expediteRates: rates }) }} className="w-16 px-2 py-1 border rounded text-sm" />
                    }
                  </div>
                ))}</div>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setAddRep(false)} className="px-4 py-2 text-gray-600">Cancel</button>
              <button onClick={saveNewRep} disabled={!newRep.displayName || !newRep.code || !newRep.hourlyRate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Reporter modal */}
      {editRep && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg overflow-y-auto" style={{ maxHeight: '90vh' }}>
            <h3 className="text-lg font-bold mb-4">Edit Reporter</h3>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Name</label><input type="text" value={editRep.displayName} onChange={e => setEditRep({ ...editRep, displayName: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium mb-1">Login Code</label><input type="text" value={editRep.code} onChange={e => setEditRep({ ...editRep, code: e.target.value })} className="w-full px-3 py-2 border rounded-lg font-mono" /></div>
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-lg border">
                <input type="checkbox" checked={!!editRep.isFirm} onChange={e => setEditRep({ ...editRep, isFirm: e.target.checked })} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium">Firm</span>
                <span className="text-xs text-gray-400 ml-auto">Check if this is a firm, not an individual reporter</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="block text-sm font-medium mb-1">Hourly Rate ($)</label><input type="number" step="0.01" value={editRep.hourlyRate} onChange={e => setEditRep({ ...editRep, hourlyRate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Original Page ($)</label><input type="number" step="0.01" value={editRep.originalPageRate} onChange={e => setEditRep({ ...editRep, originalPageRate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Copy Page ($)</label><input type="number" step="0.01" value={editRep.copyPageRate} onChange={e => setEditRep({ ...editRep, copyPageRate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="block text-sm font-medium mb-1">Late Cancel Fee ($)</label><input type="number" step="0.01" value={editRep.lateCancelFee} onChange={e => setEditRep({ ...editRep, lateCancelFee: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">CNA Fee ($)</label><input type="number" step="0.01" value={editRep.cnaFee} onChange={e => setEditRep({ ...editRep, cnaFee: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Full Day Appearance ($)</label><input type="number" step="0.01" value={editRep.appearanceFeeFullDay} onChange={e => setEditRep({ ...editRep, appearanceFeeFullDay: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="block text-sm font-medium mb-1">Half Day Appearance ($)</label><input type="number" step="0.01" value={editRep.appearanceFeeHalfDay} onChange={e => setEditRep({ ...editRep, appearanceFeeHalfDay: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Min Transcript Amt ($)</label><input type="number" step="0.01" value={editRep.minimumTranscriptAmount} onChange={e => setEditRep({ ...editRep, minimumTranscriptAmount: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Min Copy Amt ($)</label><input type="number" step="0.01" value={editRep.minimumTranscriptCopyAmount} onChange={e => setEditRep({ ...editRep, minimumTranscriptCopyAmount: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="block text-sm font-medium mb-1">Video Surcharge ($)</label><input type="number" step="0.01" value={editRep.videoSurcharge} onChange={e => setEditRep({ ...editRep, videoSurcharge: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Exhibit Surcharge ($)</label><input type="number" step="0.01" value={editRep.exhibitSurcharge} onChange={e => setEditRep({ ...editRep, exhibitSurcharge: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Interpreter Fee ($/pg)</label><input type="number" step="0.01" value={editRep.interpreterFee} onChange={e => setEditRep({ ...editRep, interpreterFee: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Expert/Med/Tech ($/pg)</label><input type="number" step="0.01" value={editRep.expertMedTechFee} onChange={e => setEditRep({ ...editRep, expertMedTechFee: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">In-Person Fee ($)</label><input type="number" step="0.01" value={editRep.inPersonFee} onChange={e => setEditRep({ ...editRep, inPersonFee: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Expedite Rates</p>
                <div className="space-y-2">{editRep.expediteRates.map((e, i) => (
                  <div key={e.days} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium w-12">{e.days}d</span>
                    <select value={e.useAmount ? 'amount' : 'percent'} onChange={ev => { const rates = [...editRep.expediteRates]; rates[i] = { ...rates[i], useAmount: ev.target.value === 'amount', displayAmount: '' }; setEditRep({ ...editRep, expediteRates: rates }) }} className="px-2 py-1 border rounded text-sm"><option value="percent">%</option><option value="amount">$</option></select>
                    {e.useAmount
                      ? <input type="text" inputMode="decimal" value={e.displayAmount ?? ''} onChange={ev => { const val = ev.target.value; const rates = [...editRep.expediteRates]; rates[i] = { ...rates[i], displayAmount: val, amount: Math.round(parseFloat(val.replace(/[^0-9.]/g, '')) * 100) || 0 }; setEditRep({ ...editRep, expediteRates: rates }) }} placeholder="0.00" className="w-20 px-2 py-1 border rounded text-sm" />
                      : <input type="number" value={e.percent} onChange={ev => { const rates = [...editRep.expediteRates]; rates[i].percent = parseInt(ev.target.value) || 0; setEditRep({ ...editRep, expediteRates: rates }) }} className="w-16 px-2 py-1 border rounded text-sm" />
                    }
                  </div>
                ))}</div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Profile Additional Fees</p>
                  <button onClick={() => setEditRep({ ...editRep, profileAdditionalFees: [...(editRep.profileAdditionalFees || []), { description: '', displayAmount: '', amount: 0 }] })} className="text-sm text-indigo-600 flex items-center gap-1"><Plus className="w-3 h-3" />Add Fee</button>
                </div>
                {(editRep.profileAdditionalFees || []).length === 0 ? <p className="text-sm text-gray-400 italic">No profile fees defined</p> : (
                  <div className="space-y-2">{(editRep.profileAdditionalFees || []).map((f, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input type="text" value={f.description} onChange={e => { const u = [...editRep.profileAdditionalFees]; u[i] = { ...u[i], description: e.target.value }; setEditRep({ ...editRep, profileAdditionalFees: u }) }} placeholder="Fee name (e.g. Video)" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                      <input type="text" inputMode="decimal" value={f.displayAmount || ''} onChange={e => { const val = e.target.value; const cents = Math.round(parseFloat(val.replace(/[^0-9.]/g, '')) * 100) || 0; const u = [...editRep.profileAdditionalFees]; u[i] = { ...u[i], displayAmount: val, amount: cents }; setEditRep({ ...editRep, profileAdditionalFees: u }) }} placeholder="$0.00" className="w-24 px-3 py-2 border rounded-lg text-sm" />
                      <button onClick={() => setEditRep({ ...editRep, profileAdditionalFees: editRep.profileAdditionalFees.filter((_, x) => x !== i) })} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}</div>
                )}
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setEditRep(null)} className="px-4 py-2 text-gray-600">Cancel</button>
              <button onClick={saveEdit} disabled={!editRep.displayName || !editRep.code} className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Admin modal */}
      {addAdm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Add Admin</h3>
            <div className="space-y-3">
              <input type="text" value={newAdm.displayName} onChange={e => setNewAdm({ ...newAdm, displayName: e.target.value })} placeholder="Name" className="w-full px-3 py-2 border rounded-lg" />
              <input type="text" value={newAdm.code} onChange={e => setNewAdm({ ...newAdm, code: e.target.value })} placeholder="Login Code" className="w-full px-3 py-2 border rounded-lg font-mono" />
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setAddAdm(false)} className="px-4 py-2 text-gray-600">Cancel</button>
              <button onClick={saveNewAdm} disabled={!newAdm.displayName || !newAdm.code} className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Admin create invoice modal */}
      {adminCreateInv && (
        <AdminCreateInvModal
          reporters={reporters} jobs={jobs} settings={settings}
          adminInvRepId={adminInvRepId} setAdminInvRepId={setAdminInvRepId}
          adminInvNumber={adminInvNumber} setAdminInvNumber={setAdminInvNumber}
          adminInvType={adminInvType} setAdminInvType={setAdminInvType}
          adminInvInput={adminInvInput} setAdminInvInput={setAdminInvInput}
          onSubmit={createOnBehalf}
          onClose={() => { setAdminCreateInv(false); setAdminInvNumber(''); setAdminInvRepId(''); setAdminInvType('STANDARD'); setAdminInvInput(emptyAdminInvInput()) }}
        />
      )}

      {/* Admin edit invoice modal */}
      {adminEditInv && adminEditInvInput && (
        <AdminEditInvModal
          inv={adminEditInv} reporters={reporters} settings={settings}
          adminEditInvNumber={adminEditInvNumber} setAdminEditInvNumber={setAdminEditInvNumber}
          adminEditInvType={adminEditInvType} setAdminEditInvType={setAdminEditInvType}
          adminEditInvInput={adminEditInvInput} setAdminEditInvInput={setAdminEditInvInput}
          onSubmit={saveAdminEdit}
          onClose={() => { setAdminEditInv(null); setAdminEditInvInput(null); setAdminEditInvNumber(''); setAdminEditInvType('STANDARD') }}
        />
      )}
    </div>
  )
}
