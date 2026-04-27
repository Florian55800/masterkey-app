import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/users', '/fiche/', '/api/cleaning-sheets/', '/bienvenue/', '/api/welcome-guides/', '/api/facturation/seed-mars-2026']

const ADMIN_ONLY_PAGES = ['/', '/facturation', '/depenses', '/rapports', '/parametres']
const ADMIN_ONLY_API   = ['/api/facturation', '/api/reports']

function blockedForCogestionnaire(pathname: string) {
  if (ADMIN_ONLY_PAGES.some(p => pathname === p || (p !== '/' && pathname.startsWith(p)))) return true
  if (ADMIN_ONLY_API.some(p => pathname.startsWith(p))) return true
  return false
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/')) {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    if (session.accessLevel === 'co-gestionnaire' && blockedForCogestionnaire(pathname)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    return NextResponse.next()
  }

  const session = await getSession(request)

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (session.accessLevel === 'co-gestionnaire' && blockedForCogestionnaire(pathname)) {
    return NextResponse.redirect(new URL('/planning', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
