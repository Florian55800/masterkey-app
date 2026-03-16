export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, color: true },
      orderBy: { id: 'asc' },
    })
    return NextResponse.json(users)
  } catch (error) {
    console.error('Users error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
