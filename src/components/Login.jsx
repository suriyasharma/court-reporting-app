import { useState } from 'react'
import { FileText } from 'lucide-react'

export default function Login({ onLogin, reporters, admins }) {
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')

  const submit = () => {
    const u = code.toUpperCase()
    const admin = admins.find(a => a.code.toUpperCase() === u)
    if (admin) return onLogin({ ...admin, role: 'ADMIN' })
    const rep = reporters.find(r => r.code.toUpperCase() === u)
    if (rep) return onLogin({ ...rep, role: 'REPORTER' })
    setErr('Invalid code')
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
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Enter code..."
          className="w-full px-4 py-3 border rounded-lg text-lg tracking-widest mb-2"
        />
        {err && <p className="text-red-500 text-sm mb-2">{err}</p>}
        <button onClick={submit} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700">
          Sign In
        </button>
      </div>
    </div>
  )
}
