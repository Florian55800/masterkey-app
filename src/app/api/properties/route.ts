export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Convert a libsql ResultSet to an array of plain objects
function toRows(rs: { columns: string[]; rows: unknown[][] }): Record<string, unknown>[] {
  return rs.rows.map((row) => {
    const obj: Record<string, unknown> = {}
    rs.columns.forEach((col, i) => {
      const v = (row as unknown[])[i]
      // BigInt → number (JSON.stringify can't handle BigInt)
      obj[col] = typeof v === 'bigint' ? Number(v) : v
    })
    return obj
  })
}

export async function GET() {
  // Production: fresh libsql WebSocket connection per request.
  // WebSocket to Turso (Ireland) from Railway (europe-west4) works — confirmed 270ms.
  // Shared singleton drops silently between requests and hangs on re-use.
  if (process.env.TURSO_DATABASE_URL) {
    const { createClient } = require('@libsql/client')
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    try {
      const propsRS = await client.execute(
        `SELECT p.id, p.name, p.address, p.city, p.type, p.typeGestion, p.ownerId,
                p.commissionRate, p.cleaningFee, p.staffId,
                p.dateSigned, p.dateLost, p.status, p.photo, p.createdAt,
                o.id as _ownerId, o.name as _ownerName,
                s.id as _staffId, s.name as _staffName, s.phone as _staffPhone
         FROM Property p
         LEFT JOIN Owner o ON o.id = p.ownerId
         LEFT JOIN Staff s ON s.id = p.staffId
         ORDER BY p.createdAt DESC`
      )

      const properties = toRows(propsRS)
      const result = properties.map((p) => ({
        ...p,
        owner: { id: p._ownerId, name: p._ownerName ?? '—' },
        staff: p._staffId ? { id: p._staffId, name: p._staffName, phone: p._staffPhone } : null,
      }))
      return NextResponse.json(result)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('Properties GET error:', msg)
      return NextResponse.json({ error: msg }, { status: 500 })
    } finally {
      client.close()
    }
  }

  // Local dev: Prisma + SQLite
  try {
    const properties = await prisma.property.findMany({
      select: {
        id: true, name: true, address: true, city: true, type: true,
        typeGestion: true, ownerId: true, commissionRate: true, cleaningFee: true,
        dateSigned: true, dateLost: true, status: true, photo: true, createdAt: true,
        staffId: true,
        owner: { select: { id: true, name: true } },
        staff: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    const result = properties
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
    const { name, address, city, type, typeGestion, ownerId, commissionRate, dateSigned, photo, cleaningFee, staffId } = body

    const property = await prisma.property.create({
      data: {
        name,
        address,
        city,
        type,
        typeGestion: typeGestion || 'conciergerie',
        ownerId: Number(ownerId),
        commissionRate: Number(commissionRate),
        cleaningFee: Number(cleaningFee) || 0,
        staffId: staffId ? Number(staffId) : null,
        dateSigned: new Date(dateSigned),
        status: 'active',
        photo: photo || null,
      },
      include: { owner: true, staff: { select: { id: true, name: true, phone: true } } },
    })

    return NextResponse.json(property, { status: 201 })
  } catch (error) {
    console.error('Property POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
