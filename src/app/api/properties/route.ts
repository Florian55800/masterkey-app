export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // $queryRaw uses client.execute() directly (same path as findUnique which works in 270ms)
    // findMany uses executeMultiple/transaction → falls back to WebSocket → hang
    type PropRow = {
      id: number; name: string; address: string; city: string; type: string
      typeGestion: string; ownerId: number; commissionRate: number
      dateSigned: string; dateLost: string | null; status: string
      photo: string | null; createdAt: string
    }
    type OwnerRow = { id: number; name: string }

    const properties = await prisma.$queryRaw<PropRow[]>`
      SELECT id, name, address, city, type, typeGestion, ownerId, commissionRate,
             dateSigned, dateLost, status, photo, createdAt
      FROM Property ORDER BY createdAt DESC`

    const owners = await prisma.$queryRaw<OwnerRow[]>`
      SELECT id, name FROM Owner ORDER BY name ASC`

    const ownerMap = new Map(owners.map((o) => [o.id, o]))
    const result = properties.map((p) => ({
      ...p,
      owner: ownerMap.get(p.ownerId) ?? { id: p.ownerId, name: '—' },
    }))

    return NextResponse.json(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Properties GET error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, address, city, type, typeGestion, ownerId, commissionRate, dateSigned, photo } = body

    const property = await prisma.property.create({
      data: {
        name,
        address,
        city,
        type,
        typeGestion: typeGestion || 'conciergerie',
        ownerId: Number(ownerId),
        commissionRate: Number(commissionRate),
        dateSigned: new Date(dateSigned),
        status: 'active',
        photo: photo || null,
      },
      include: { owner: true },
    })

    return NextResponse.json(property, { status: 201 })
  } catch (error) {
    console.error('Property POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
