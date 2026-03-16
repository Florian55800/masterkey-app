'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: number
  name: string
  color: string
}

export default function LoginPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((data) => setUsers(data))
      .catch(() => {})
  }, [])

  const handleUserSelect = (user: User) => {
    setSelectedUser(user)
    setPin('')
    setError('')
  }

  const handlePin = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit
      setPin(newPin)
      if (newPin.length === 4) {
        handleLogin(newPin)
      }
    }
  }

  const handleDelete = () => {
    setPin((p) => p.slice(0, -1))
    setError('')
  }

  const handleLogin = async (pinValue: string) => {
    if (!selectedUser) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, pin: pinValue }),
      })

      if (res.ok) {
        router.push('/')
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || 'PIN incorrect')
        setPin('')
        setShake(true)
        setTimeout(() => setShake(false), 500)
      }
    } catch {
      setError('Erreur de connexion')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  const pinButtons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#0f0f0f' }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(212,175,55,0.07) 0%, transparent 100%)',
        }}
      />
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.04) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{
              background: 'linear-gradient(135deg, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.08) 100%)',
              border: '1px solid rgba(212,175,55,0.3)',
              boxShadow: '0 0 24px rgba(212,175,55,0.2), inset 0 1px 0 rgba(212,175,55,0.2)',
            }}
          >
            <span className="text-2xl font-bold text-gold-gradient">MK</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">MasterKey</h1>
          <p className="text-white/35 text-sm mt-1.5 font-medium">Tableau de bord Conciergerie</p>
        </div>

        {!selectedUser ? (
          /* User Selection */
          <div
            className="rounded-2xl p-6"
            style={{
              background: 'linear-gradient(135deg, #1e1e1e 0%, #181818 100%)',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            <p className="text-white/50 text-xs font-semibold uppercase tracking-widest text-center mb-5">
              Qui êtes-vous ?
            </p>
            <div className="space-y-3">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl transition-all group text-left"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,0.06)'
                    ;(e.currentTarget as HTMLElement).style.border = '1px solid rgba(212,175,55,0.25)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'
                    ;(e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,255,255,0.06)'
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                    style={{ backgroundColor: user.color, boxShadow: `0 4px 12px ${user.color}40` }}
                  >
                    {user.name.charAt(0)}
                  </div>
                  <span className="text-white font-medium text-base flex-1">
                    {user.name}
                  </span>
                  <svg
                    className="w-4 h-4 text-white/20 group-hover:text-[#D4AF37] transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* PIN Entry */
          <div
            className="rounded-2xl p-6"
            style={{
              background: 'linear-gradient(135deg, #1e1e1e 0%, #181818 100%)',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            <button
              onClick={() => { setSelectedUser(null); setPin(''); setError('') }}
              className="flex items-center gap-1.5 text-white/30 hover:text-white/60 transition-colors mb-6 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Retour
            </button>

            <div className="flex items-center gap-3 mb-8">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                style={{ backgroundColor: selectedUser.color, boxShadow: `0 4px 16px ${selectedUser.color}40` }}
              >
                {selectedUser.name.charAt(0)}
              </div>
              <div>
                <p className="text-white font-semibold">{selectedUser.name}</p>
                <p className="text-white/35 text-sm">Entrez votre code PIN</p>
              </div>
            </div>

            {/* PIN dots */}
            <div className={`flex justify-center gap-5 mb-6 ${shake ? 'animate-bounce' : ''}`}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full transition-all duration-200"
                  style={{
                    background: i < pin.length ? '#D4AF37' : 'rgba(255,255,255,0.1)',
                    boxShadow: i < pin.length ? '0 0 10px rgba(212,175,55,0.6)' : 'none',
                    transform: i < pin.length ? 'scale(1.2)' : 'scale(1)',
                  }}
                />
              ))}
            </div>

            {error && (
              <div className="mb-5 py-2.5 px-4 rounded-xl text-center"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <p className="text-red-400 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* PIN pad */}
            <div className="grid grid-cols-3 gap-2.5">
              {pinButtons.map((btn, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (btn === '⌫') handleDelete()
                    else if (btn !== '') handlePin(btn)
                  }}
                  disabled={loading || btn === ''}
                  className="h-14 rounded-xl text-lg font-semibold transition-all active:scale-95 disabled:opacity-0"
                  style={btn === '⌫' ? {
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.4)',
                  } : btn === '' ? { visibility: 'hidden' } : {
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  }}
                  onMouseEnter={e => {
                    if (btn !== '' && btn !== '⌫') {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,0.12)'
                      ;(e.currentTarget as HTMLElement).style.border = '1px solid rgba(212,175,55,0.3)'
                      ;(e.currentTarget as HTMLElement).style.color = '#D4AF37'
                    }
                  }}
                  onMouseLeave={e => {
                    if (btn !== '' && btn !== '⌫') {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'
                      ;(e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,255,255,0.08)'
                      ;(e.currentTarget as HTMLElement).style.color = 'white'
                    }
                  }}
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-white/15 text-xs mt-6 font-medium tracking-wide">
          © {new Date().getFullYear()} MasterKey Conciergerie
        </p>
      </div>
    </div>
  )
}
