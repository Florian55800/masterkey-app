export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { tursoQueryBatch } from '@/lib/turso'

export async function GET() {
  try {
    // Production: direct Turso HTTP API — no WebSocket, no libsql, one round-trip
    if (process.env.TURSO_DATABASE_URL) {
      const [owners, properties, satisfactions] = await tursoQueryBatch([
        {
          sql: `SELECT id, name, phone, email, notes, photo, lastContact,
                       relanceDate, relanceNote, source, createdAt, updatedAt
                FROM Owner ORDER BY name ASC`,
        },
        {
          sql: `SELECT id, name, address, city, type, typeGestion, ownerId,
                       commissionRate, dateSigned, dateLost, status, photo, createdAt
                FROM Property ORDER BY createdAt DESC`,
        },
        {
          sql: `SELECT id, ownerId, score, quarter, year, createdAt
                FROM SatisfactionScore ORDER BY createdAt DESC`,
        },
      ])

      const propsMap = new Map<number, typeof properties>()
      for (const p of properties) {
        const oid = p.ownerId as number
        if (!propsMap.has(oid)) propsMap.set(oid, [])
        propsMap.get(oid)!.push(p)
      }

      const satMap = new Map<number, typeof satisfactions>()
      for (const s of satisfactions) {
        const oid = s.ownerId as number
        if (!satMap.has(oid)) satMap.set(oid, [])
        satMap.get(oid)!.push(s)
      }

      const result = owners.map((o) => ({
        ...o,
        properties: propsMap.get(o.id as number) ?? [],
        satisfactions: satMap.get(o.id as number) ?? [],
      }))

      return NextResponse.json(result)
    }

    // Local dev: Prisma + SQLite
    const owners = await prisma.owner.findMany({
      include: {
        properties: true,
        satisfactions: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(owners)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Owners GET error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      phone,
      email,
      notes,
      lastContact,
      relanceDate,
      relanceNote,
      source,
      photo,
    } = body

    const owner = await prisma.owner.create({
      data: {
        name,
        phone: phone || null,
        email: email || null,
        notes: notes || null,
        lastContact: lastContact ? new Date(lastContact) : null,
        relanceDate: relanceDate ? new Date(relanceDate) : null,
        relanceNote: relanceNote || null,
        source: source || null,
        photo: photo || null,
      },
      include: { properties: true, satisfactions: true },
    })

    return NextResponse.json(owner, { status: 201 })
  } catch (error) {
    console.error('Owner POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
