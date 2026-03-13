import { useState } from 'react'
import {
  useSupabaseCollection,
  useSupabaseSettings,
  invoiceToDb, invoiceFromDb,
  reporterToDb, reporterFromDb,
  adminToDb, adminFromDb,
  auditToDb, auditFromDb,
  jobToDb, jobFromDb,
} from './hooks/useDataStore'
import Login from './components/Login'
import AdminDash from './components/AdminDash'
import ReporterDash from './components/ReporterDash'

const initSettings = {
  expediteRates: [
    { days: 1, label: '1 Day',  percent: 100, amount: 0, useAmount: false },
    { days: 2, label: '2 Days', percent: 80,  amount: 0, useAmount: false },
    { days: 3, label: '3 Days', percent: 60,  amount: 0, useAmount: false },
    { days: 4, label: '4 Days', percent: 45,  amount: 0, useAmount: false },
    { days: 5, label: '5 Days', percent: 35,  amount: 0, useAmount: false },
    { days: 6, label: '6 Days', percent: 25,  amount: 0, useAmount: false },
    { days: 7, label: '7 Days', percent: 15,  amount: 0, useAmount: false },
    { days: 8, label: '8 Days', percent: 10,  amount: 0, useAmount: false },
  ],
  lateCancelFee: 15000,
  cnaFee: 12500,
}

// Fallback admins for localStorage-only mode (no Supabase configured)
const initAdmins = [
  { id: 'a1', displayName: 'Sarah Admin', code: 'ADMIN123' },
  { id: 'a2', displayName: 'Mike Manager', code: 'ADMIN456' },
]

export default function App() {
  const [user, setUser] = useState(null)

  const [invoices, setInvoices, invLoaded]   = useSupabaseCollection('invoices',  [], {
    toDb: invoiceToDb, fromDb: invoiceFromDb, localKey: 'cr_invoices',
  })
  const [reporters, setReporters, repLoaded] = useSupabaseCollection('reporters', [], {
    toDb: reporterToDb, fromDb: reporterFromDb, localKey: 'cr_reporters',
  })
  const [admins, setAdmins, admLoaded]       = useSupabaseCollection('admins', initAdmins, {
    toDb: adminToDb, fromDb: adminFromDb, localKey: 'cr_admins',
  })
  const [jobs, setJobs, jobsLoaded]          = useSupabaseCollection('jobs', [], {
    pkField: 'deposition_id', toDb: jobToDb, fromDb: jobFromDb, localKey: 'cr_jobs',
  })
  const [auditLog, setAuditLog, auditLoaded] = useSupabaseCollection('audit_log', [], {
    toDb: auditToDb, fromDb: auditFromDb, localKey: 'cr_audit',
  })
  const [settings, setSettings, settingsLoaded] = useSupabaseSettings(initSettings, 'cr_settings')

  const allLoaded = invLoaded && repLoaded && admLoaded && jobsLoaded && auditLoaded && settingsLoaded

  if (!allLoaded) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#059669',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
          }} />
          <p style={{ color: '#6b7280', fontSize: 14 }}>Loading…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!user) {
    return (
      <Login
        reporters={reporters}
        admins={admins}
        onLogin={setUser}
      />
    )
  }

  if (user.role === 'ADMIN') {
    return (
      <AdminDash
        user={user}
        invoices={invoices}   setInvoices={setInvoices}
        reporters={reporters} setReporters={setReporters}
        admins={admins}       setAdmins={setAdmins}
        jobs={jobs}           setJobs={setJobs}
        auditLog={auditLog}   setAuditLog={setAuditLog}
        settings={settings}   setSettings={setSettings}
        onLogout={() => setUser(null)}
      />
    )
  }

  return (
    <ReporterDash
      user={user}
      invoices={invoices}
      setInvoices={setInvoices}
      jobs={jobs}
      setJobs={setJobs}
      settings={settings}
      onLogout={() => setUser(null)}
    />
  )
}
