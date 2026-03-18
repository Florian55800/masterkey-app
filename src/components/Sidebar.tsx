'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  FileBarChart,
  Building2,
  Users,
  Target,
  TrendingUp,
  CreditCard,
  LogOut,
  UserSearch,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface User {
  id: number
  name: string
  color: string
  photo?: string | null
}

const navItems = [
  { href: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/rapports', label: 'Rapports', icon: FileBarChart },
  { href: '/logements', label: 'Logements', icon: Building2 },
  { href: '/proprietaires', label: 'Clients', icon: Users },
  { href: '/equipe', label: 'Équipe', icon: TrendingUp },
  { href: '/objectifs', label: 'Objectifs', icon: Target },
  { href: '/depenses', label: 'Dépenses', icon: CreditCard },
  { href: '/leads', label: 'Leads', icon: UserSearch },
  { href: '/parametres', label: 'Paramètres', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.id) setUser(data)
      })
      .catch(() => {})
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 z-40"
        style={{
          background: '#111111',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.08) 100%)',
              border: '1px solid rgba(212,175,55,0.25)',
              boxShadow: '0 0 16px rgba(212,175,55,0.15)',
            }}
          >
            <span className="text-sm font-bold text-gold-gradient">MK</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm tracking-tight">MasterKey</p>
            <p className="text-white/30 text-xs">Conciergerie</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative',
                  isActive
                    ? 'text-[#D4AF37]'
                    : 'text-white/40 hover:text-white/80'
                )}
                style={isActive ? {
                  background: 'rgba(212,175,55,0.1)',
                  border: '1px solid rgba(212,175,55,0.15)',
                } : {
                  background: 'transparent',
                  border: '1px solid transparent',
                }}
              >
                <Icon className={cn('w-4 h-4 flex-shrink-0 transition-all', isActive ? 'text-[#D4AF37]' : 'text-white/30 group-hover:text-white/60')} />
                {item.label}
                {isActive && (
                  <div
                    className="w-1 h-1 rounded-full ml-auto"
                    style={{ background: '#D4AF37', boxShadow: '0 0 6px rgba(212,175,55,0.8)' }}
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {user && (
            <div
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              {user.photo ? (
                <img src={user.photo} alt={user.name} className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                  style={{ backgroundColor: user.color, boxShadow: `0 2px 8px ${user.color}50` }}
                >
                  {user.name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate leading-none mb-0.5">{user.name}</p>
                <p className="text-white/25 text-xs">Connecté</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/30 hover:text-red-400 transition-all group"
            style={{ border: '1px solid transparent' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.06)'
              ;(e.currentTarget as HTMLElement).style.border = '1px solid rgba(239,68,68,0.12)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.border = '1px solid transparent'
            }}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
        style={{
          background: 'rgba(17,17,17,0.95)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center justify-around py-2">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all',
                  isActive ? 'text-[#D4AF37]' : 'text-white/30'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label.split(' ')[0]}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
