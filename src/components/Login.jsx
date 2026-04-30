import { useState } from 'react'
import { FileText } from 'lucide-react'
import { supabase, isConfigured } from '../lib/supabase'
import { adminFromDb, reporterFromDb } from '../hooks/useDataStore'

const FALLBACK_ADMINS = [
  { id: 'a1', displayName: 'Sarah Admin', code: 'ADMIN123' },
  { id: 'a2', displayName: 'Mike Manager', code: 'ADMIN456' },
]

export default function Login({ onLogin }) {
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    const u = code.trim().toUpperCase()
    if (!u) return
    setLoading(true)
    setErr('')

    if (isConfigured()) {
      try {
        // Query only the single matching row — no bulk data fetch before login
        const [{ data: adminRow }, { data: repRow }] = await Promise.all([
          supabase.from('admins').select('*').eq('code', u).maybeSingle(),
          supabase.from('reporters').select('*').eq('code', u).maybeSingle(),
        ])
        if (adminRow) return onLogin({ ...adminFromDb(adminRow), role: 'ADMIN' })
        if (repRow)   return onLogin({ ...reporterFromDb(repRow), role: 'REPORTER' })
        setErr('Invalid code')
      } catch {
        setErr('Connection error — please try again')
      } finally {
        setLoading(false)
      }
    } else {
      // localStorage-only fallback (no Supabase configured)
      setLoading(false)
      const admins = (() => { try { return JSON.parse(localStorage.getItem('cr_admins') || '[]') } catch { return FALLBACK_ADMINS } })()
      const reps   = (() => { try { return JSON.parse(localStorage.getItem('cr_reporters') || '[]') } catch { return [] } })()
      const admin = admins.find(a => a.code?.toUpperCase() === u)
      if (admin) return onLogin({ ...admin, role: 'ADMIN' })
      const rep = reps.find(r => r.code?.toUpperCase() === u)
      if (rep) return onLogin({ ...rep, role: 'REPORTER' })
      setErr('Invalid code')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Court Reporting</h1>
          <p className="text-gray-500">Invoice System</p>
        </div>
        <input
          type="text"
          value={code}
          onChange={e => { setCode(e.target.value); setErr('') }}
          onKeyDown={e => e.key === 'Enter' && !loading && submit()}
          placeholder="Enter code..."
          className="w-full px-4 py-3 border rounded-lg text-lg tracking-widest mb-2"
          disabled={loading}
        />
        {err && <p className="text-red-500 text-sm mb-2">{err}</p>}
        <button
          onClick={submit}
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? 'Checking…' : 'Sign In'}
        </button>
      </div>
    </div>
  )
}
