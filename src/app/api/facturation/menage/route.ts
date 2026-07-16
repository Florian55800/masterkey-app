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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const month = parseInt(searchParams.get('month') ?? '0')
  const year  = parseInt(searchParams.get('year')  ?? '0')

  if (process.env.TURSO_DATABASE_URL) {
    const { createClient } = require('@libsql/client')
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN || '',
    })
    try {
      const propRS = await client.execute({
        sql: `SELECT p.id, p.name, p.address, p.city, p.typeGestion, p.status,
                     o.id as owner_id, o.name as owner_name
              FROM Property p
              LEFT JOIN Owner o ON o.id = p.ownerId
              WHERE p.status = 'active'
              ORDER BY p.name ASC`,
        args: [],
      })
      const props = toRows(propRS)

      const propIds = props.map((p) => p.id)
      let margins: Record<string, unknown>[] = []
      if (propIds.length > 0) {
        const placeholders = propIds.map(() => '?').join(',')
        const marginSql = month && year
          ? `SELECT * FROM CleaningMargin WHERE propertyId IN (${placeholders}) AND month = ? AND year = ?`
          : `SELECT * FROM CleaningMargin WHERE propertyId IN (${placeholders})`
        const marginArgs = month && year ? [...propIds, month, year] : propIds
        const marginRS = await client.execute({ sql: marginSql, args: marginArgs })
        margins = toRows(marginRS)
      }
      const marginByProp = new Map(margins.map((m) => [Number(m.propertyId), m]))

      const result = props.map((p) => {
        const margin = marginByProp.get(Number(p.id)) ?? null
        return {
          id: p.id, name: p.name, address: p.address, city: p.city,
          typeGestion: p.typeGestion, status: p.status,
          owner: { id: p.owner_id, name: p.owner_name },
          cleaningMargin: margin ? {
            id: Number(margin.id),
            propertyId: Number(margin.propertyId),
            month: Number(margin.month),
            year: Number(margin.year),
            receivedPlatform: Number(margin.receivedPlatform) || 0,
            receivedOwner: Number(margin.receivedOwner) || 0,
            paidCleaner: Number(margin.paidCleaner) || 0,
            notes: margin.notes ?? null,
          } : null,
        }
      })

      return NextResponse.json(result)
    } catch (error) {
      console.error('Menage GET error:', error)
      return NextResponse.json({ error: String(error) }, { status: 500 })
    } finally {
      client.close()
    }
  }

  try {
    const properties = await (prisma as any).property.findMany({
      where: { status: 'active' },
      include: {
        owner: { select: { id: true, name: true } },
        cleaningMargins: month && year ? { where: { month, year } } : { orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 1 },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(properties.map((p: any) => ({
      id: p.id, name: p.name, address: p.address, city: p.city,
      typeGestion: p.typeGestion, status: p.status,
      owner: p.owner,
      cleaningMargin: p.cleaningMargins[0] ?? null,
    })))
  } catch (error) {
    console.error('Menage GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { propertyId, month, year, receivedPlatform, receivedOwner, paidCleaner, notes } = body

    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN || '',
      })
      try {
        const rs = await client.execute({
          sql: `INSERT INTO CleaningMargin (propertyId, month, year, receivedPlatform, receivedOwner, paidCleaner, notes, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                ON CONFLICT(propertyId, month, year) DO UPDATE SET
                  receivedPlatform = excluded.receivedPlatform,
                  receivedOwner    = excluded.receivedOwner,
                  paidCleaner      = excluded.paidCleaner,
                  notes            = excluded.notes,
                  updatedAt        = datetime('now')
                RETURNING *`,
          args: [
            Number(propertyId), Number(month), Number(year),
            Number(receivedPlatform) || 0,
            Number(receivedOwner)    || 0,
            Number(paidCleaner)      || 0,
            notes ?? null,
          ],
        })
        const rows = toRows(rs)
        return NextResponse.json(rows[0])
      } finally {
        client.close()
      }
    }

    const margin = await (prisma as any).cleaningMargin.upsert({
      where: { propertyId_month_year: { propertyId: Number(propertyId), month: Number(month), year: Number(year) } },
      update: {
        receivedPlatform: Number(receivedPlatform) || 0,
        receivedOwner:    Number(receivedOwner)    || 0,
        paidCleaner:      Number(paidCleaner)      || 0,
        notes: notes ?? null,
      },
      create: {
        propertyId:       Number(propertyId),
        month:            Number(month),
        year:             Number(year),
        receivedPlatform: Number(receivedPlatform) || 0,
        receivedOwner:    Number(receivedOwner)    || 0,
        paidCleaner:      Number(paidCleaner)      || 0,
        notes: notes ?? null,
      },
    })
    return NextResponse.json(margin)
  } catch (error) {
    console.error('Menage POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
