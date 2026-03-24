export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function toRows(rs: { columns: string[]; rows: unknown[][] }): Record<string, unknown>[] {
  return rs.rows.map((row) => {
    const obj: Record<string, unknown> = {}
    rs.columns.forEach((col, i) => {
      const v = (row as unknown[])[i]
      obj[col] = typeof v === 'bigint' ? Number(v) : v
    })
    return obj
  })
}

export async function GET() {
  if (process.env.TURSO_DATABASE_URL) {
    const { createClient } = require('@libsql/client')
    const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
    try {
      const rs = await client.execute(
        `SELECT a.id, a.description, a.amount, a.status, a.date, a.notes, a.createdAt,
                a.ownerId, o.name as ownerName,
                a.propertyId, p.name as propertyName
         FROM "Advance" a
         LEFT JOIN "Owner" o ON o.id = a.ownerId
         LEFT JOIN "Property" p ON p.id = a.propertyId
         ORDER BY a.createdAt DESC`
      )
      const rows = toRows(rs)
      return NextResponse.json(rows.map(r => ({
        ...r,
        owner:    r.ownerId    ? { id: r.ownerId,    name: r.ownerName }    : null,
        property: r.propertyId ? { id: r.propertyId, name: r.propertyName } : null,
      })))
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 500 })
    } finally { client.close() }
  }

  try {
    const advances = await prisma.advance.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        owner:    { select: { id: true, name: true } },
        property: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json(advances)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { description, amount, ownerId, propertyId, status, date, notes } = await req.json()

    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
      try {
        const rs = await client.execute({
          sql: `INSERT INTO "Advance" (description, amount, ownerId, propertyId, status, date, notes, updatedAt)
                VALUES (?,?,?,?,?,?,?, CURRENT_TIMESTAMP) RETURNING *`,
          args: [
            description, Number(amount),
            ownerId ? Number(ownerId) : null,
            propertyId ? Number(propertyId) : null,
            status || 'en_attente',
            date || new Date().toISOString(),
            notes || null,
          ],
        })
        return NextResponse.json(toRows(rs)[0], { status: 201 })
      } finally { client.close() }
    }

    const advance = await prisma.advance.create({
      data: {
        description, amount: Number(amount),
        ownerId: ownerId ? Number(ownerId) : null,
        propertyId: propertyId ? Number(propertyId) : null,
        status: status || 'en_attente',
        date: date ? new Date(date) : new Date(),
        notes: notes || null,
      },
      include: { owner: { select: { id: true, name: true } }, property: { select: { id: true, name: true } } },
    })
    return NextResponse.json(advance, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
