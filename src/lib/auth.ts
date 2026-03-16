import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const secretKey = process.env.JWT_SECRET || 'masterkey-dashboard-secret-2024-very-long-secret-key'
const key = new TextEncoder().encode(secretKey)

export async function createSession(userId: number) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key)

  cookies().set('mk_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  return token
}

export async function getSession(request?: NextRequest) {
  try {
    let token: string | undefined

    if (request) {
      token = request.cookies.get('mk_session')?.value
    } else {
      token = cookies().get('mk_session')?.value
    }

    if (!token) return null

    const { payload } = await jwtVerify(token, key)
    return payload as { userId: number }
  } catch {
    return null
  }
}

export async function deleteSession() {
  cookies().delete('mk_session')
}
