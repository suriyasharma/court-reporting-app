import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, isConfigured } from '../lib/supabase'

// ─── Data transforms (app camelCase ↔ DB snake_case) ─────────────────────────

export const invoiceToDb = (inv) => ({
  id: inv.id,
  invoice_number: inv.invoiceNumber,
  reporter_user_id: inv.reporterUserId || null,
  reporter_name: inv.reporterName || null,
  status: inv.status,
  invoice_type: inv.invoiceType || 'STANDARD',
  input: inv.input || {},
  pdf_link: inv.pdfLink || null,
  job_id: inv.jobId || null,
  submission_date: inv.submissionDate || null,
  on_time: inv.onTime || null,
  case_info: inv.caseInfo || {},
  invoice_comment: inv.invoiceComment || null,
  line_items: inv.lineItems || [],
  total_cents: inv.totalCents || 0,
  return_comment: inv.returnComment || null,
  approved_at: inv.approvedAt || null,
  approved_by: inv.approvedBy || null,
  paid_at: inv.paidAt || null,
  paid_by: inv.paidBy || null,
  stripe_payout_id: inv.stripePayoutId || null,
  disputed_at: inv.disputedAt || null,
  disputed_by: inv.disputedBy || null,
  dispute_resolved_at: inv.disputeResolvedAt || null,
  dispute_resolved_by: inv.disputeResolvedBy || null,
  dispute_close_at: inv.disputeCloseAt || null,
  closed_at: inv.closedAt || null,
  closed_by: inv.closedBy || null,
  submitted_at: inv.submittedAt || null,
  audit_log: inv.auditLog || [],
})

export const invoiceFromDb = (row) => ({
  id: row.id,
  invoiceNumber: row.invoice_number,
  reporterUserId: row.reporter_user_id,
  reporterName: row.reporter_name,
  status: row.status,
  invoiceType: row.invoice_type,
  input: row.input || {},
  pdfLink: row.pdf_link,
  jobId: row.job_id,
  submissionDate: row.submission_date,
  onTime: row.on_time,
  caseInfo: row.case_info || {},
  invoiceComment: row.invoice_comment,
  lineItems: row.line_items || [],
  totalCents: row.total_cents || 0,
  returnComment: row.return_comment,
  approvedAt: row.approved_at,
  approvedBy: row.approved_by,
  paidAt: row.paid_at,
  paidBy: row.paid_by,
  stripePayoutId: row.stripe_payout_id,
  disputedAt: row.disputed_at,
  disputedBy: row.disputed_by,
  disputeResolvedAt: row.dispute_resolved_at,
  disputeResolvedBy: row.dispute_resolved_by,
  disputeCloseAt: row.dispute_close_at,
  closedAt: row.closed_at,
  closedBy: row.closed_by,
  submittedAt: row.submitted_at,
  auditLog: row.audit_log || [],
})

export const reporterToDb = (r) => ({
  id: r.id,
  display_name: r.displayName,
  code: r.code,
  rate_card: { ...(r.rateCard || {}), isFirm: !!r.isFirm },
  created_by: r.createdBy || null,
  created_on: r.createdAt || null,
  edited_by: r.editedBy || null,
  edited_on: r.editedAt || null,
})

export const reporterFromDb = (row) => ({
  id: row.id,
  displayName: row.display_name,
  code: row.code,
  rateCard: row.rate_card || {},
  isFirm: !!(row.rate_card?.isFirm),
  createdBy: row.created_by,
  createdAt: row.created_on,
  editedBy: row.edited_by,
  editedAt: row.edited_on,
})

export const adminToDb = (a) => ({
  id: a.id,
  display_name: a.displayName,
  code: a.code,
})

export const adminFromDb = (row) => ({
  id: row.id,
  displayName: row.display_name,
  code: row.code,
})

export const auditToDb = (entry) => ({
  id: entry.id,
  action: entry.action,
  target: entry.target || null,
  by_user: entry.by,
  at_date: entry.at,
})

export const auditFromDb = (row) => ({
  id: row.id,
  action: row.action,
  target: row.target,
  by: row.by_user,
  at: row.at_date,
})

// Jobs: store the whole object as JSONB to handle all 17+ fields transparently
export const jobToDb = (job) => ({
  deposition_id: job.deposition_id,
  job_data: job,
})

export const jobFromDb = (row) => row.job_data

// ─── Generic collection hook ──────────────────────────────────────────────────
// Mirrors usePersisted(key, default) but reads from Supabase and writes on change.
// Falls back to localStorage when Supabase is not configured.

export function useSupabaseCollection(table, defaultValue, options = {}) {
  const { pkField = 'id', toDb = null, fromDb = null, localKey = null } = options

  const [state, setState] = useState(() => {
    if (localKey) {
      try {
        const stored = localStorage.getItem(localKey)
        return stored !== null ? JSON.parse(stored) : defaultValue
      } catch { return defaultValue }
    }
    return defaultValue
  })

  const [loaded, setLoaded] = useState(false)
  // stateRef avoids stale closures in the update callback
  const stateRef = useRef(state)

  useEffect(() => {
    if (!isConfigured()) {
      setLoaded(true)
      return
    }
    const fetchAll = async () => {
      const PAGE = 1000
      let all = []
      let from = 0
      while (true) {
        const { data, error } = await supabase.from(table).select('*').range(from, from + PAGE - 1)
        if (error) {
          console.error(`[useDataStore] Error loading "${table}":`, error.message)
          break
        }
        if (data && data.length > 0) all = all.concat(data)
        if (!data || data.length < PAGE) break
        from += PAGE
      }
      if (all.length > 0) {
        const transformed = fromDb ? all.map(fromDb) : all
        setState(transformed)
        stateRef.current = transformed
      }
      setLoaded(true)
    }
    fetchAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const update = useCallback((newStateOrFn) => {
    const newState =
      typeof newStateOrFn === 'function'
        ? newStateOrFn(stateRef.current)
        : newStateOrFn

    const oldState = stateRef.current
    stateRef.current = newState
    setState(newState)

    // Always persist to localStorage as a backup / offline fallback
    if (localKey) {
      try { localStorage.setItem(localKey, JSON.stringify(newState)) } catch {}
    }

    if (!isConfigured()) return

    // Diff old vs new: upsert changed/added, delete removed
    const oldMap = new Map(oldState.map((item) => [item[pkField], item]))
    const newMap = new Map(newState.map((item) => [item[pkField], item]))

    const upserts = newState
      .filter((item) => {
        const old = oldMap.get(item[pkField])
        return !old || JSON.stringify(old) !== JSON.stringify(item)
      })
      .map((item) => (toDb ? toDb(item) : item))

    const deletions = oldState
      .filter((item) => !newMap.has(item[pkField]))
      .map((item) => item[pkField])

    if (upserts.length > 0) {
      const BATCH = 500
      for (let i = 0; i < upserts.length; i += BATCH) {
        supabase
          .from(table)
          .upsert(upserts.slice(i, i + BATCH))
          .then(({ error }) => {
            if (error) console.error(`[useDataStore] Upsert error on "${table}":`, error.message)
          })
      }
    }

    for (const pk of deletions) {
      supabase
        .from(table)
        .delete()
        .eq(pkField, pk)
        .then(({ error }) => {
          if (error) console.error(`[useDataStore] Delete error on "${table}":`, error.message)
        })
    }
  }, [table, pkField, toDb, localKey]) // all stable references

  return [state, update, loaded]
}

// ─── Settings hook (single-row table) ────────────────────────────────────────
export function useSupabaseSettings(defaultValue, localKey) {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(localKey)
      return stored !== null ? JSON.parse(stored) : defaultValue
    } catch { return defaultValue }
  })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!isConfigured()) {
      setLoaded(true)
      return
    }
    supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('[useDataStore] Error loading settings:', error.message)
        } else if (data?.data) {
          setSettings(data.data)
        }
        setLoaded(true)
      })
  }, [])

  const update = useCallback((newSettings) => {
    setSettings(newSettings)
    try { localStorage.setItem(localKey, JSON.stringify(newSettings)) } catch {}
    if (!isConfigured()) return
    supabase
      .from('settings')
      .upsert({ id: 1, data: newSettings })
      .then(({ error }) => {
        if (error) console.error('[useDataStore] Settings upsert error:', error.message)
      })
  }, [localKey])

  return [settings, update, loaded]
}
