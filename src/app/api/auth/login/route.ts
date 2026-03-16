export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { userId, pin } = await request.json()

    if (!userId || !pin) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    const valid = await bcrypt.compare(pin, user.pin)

    if (!valid) {
      return NextResponse.json({ error: 'PIN incorrect' }, { status: 401 })
    }

    await createSession(user.id)

    return NextResponse.json({
      id: user.id,
      name: user.name,
      color: user.color,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
