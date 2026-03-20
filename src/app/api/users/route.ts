export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPin } from '@/lib/hash'

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, color: true, photo: true, role: true },
      orderBy: { id: 'asc' },
    })
    return NextResponse.json(users)
  } catch (error) {
    console.error('Users error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, color, pin, photo, role } = body
    if (!name || !pin || pin.length !== 4) {
      return NextResponse.json({ error: 'Nom et PIN (4 chiffres) requis' }, { status: 400 })
    }
    const user = await prisma.user.create({
      data: {
        name,
        color: color || '#D4AF37',
        pin: hashPin(pin),
        photo: photo || null,
        role: role || '',
      },
    })
    return NextResponse.json({ id: user.id, name: user.name, color: user.color, role: user.role })
  } catch (error) {
    console.error('User POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
