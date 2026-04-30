import { useState } from 'react'
import Login from './components/Login'
import AuthenticatedApp from './components/AuthenticatedApp'

export default function App() {
  const [user, setUser] = useState(null)

  if (!user) {
    return <Login onLogin={setUser} />
  }

  return <AuthenticatedApp user={user} onLogout={() => setUser(null)} />
}
