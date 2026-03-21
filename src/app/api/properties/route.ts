export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { tursoQueryBatch } from '@/lib/turso'

export async function GET() {
  try {
    // Production: direct Turso HTTP API — no WebSocket, no libsql, one round-trip
    if (process.env.TURSO_DATABASE_URL) {
      const [properties, owners] = await tursoQueryBatch([
        {
          sql: `SELECT id, name, address, city, type, typeGestion, ownerId, commissionRate,
                       dateSigned, dateLost, status, photo, createdAt
                FROM Property ORDER BY createdAt DESC`,
        },
        { sql: `SELECT id, name FROM Owner ORDER BY name ASC` },
      ])

      const ownerMap = new Map(owners.map((o) => [o.id as number, o]))
      const result = properties.map((p) => ({
        ...p,
        owner: ownerMap.get(p.ownerId as number) ?? { id: p.ownerId, name: '—' },
      }))

      return NextResponse.json(result)
    }

    // Local dev: Prisma + SQLite
    const [properties, owners] = await Promise.all([
      prisma.property.findMany({
        select: {
          id: true, name: true, address: true, city: true, type: true,
          typeGestion: true, ownerId: true, commissionRate: true,
          dateSigned: true, dateLost: true, status: true, photo: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.owner.findMany({ select: { id: true, name: true } }),
    ])

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
