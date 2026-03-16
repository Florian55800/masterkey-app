import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const city = await prisma.city.findUnique({ where: { id: Number(params.id) } })

    if (!city) {
      return NextResponse.json({ error: 'Ville introuvable' }, { status: 404 })
    }

    const updated = await prisma.city.update({
      where: { id: Number(params.id) },
      data: { isActive: !city.isActive },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('City toggle error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
