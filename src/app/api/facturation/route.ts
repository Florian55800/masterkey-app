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

// Run once per process lifetime — ALTER TABLE is idempotent but still costs a round-trip
let migrationDone = false
async function ensureMigration(client: any) {
  if (migrationDone) return
  try { await client.execute({ sql: `ALTER TABLE "Property" ADD COLUMN splitPayment INTEGER DEFAULT 0`, args: [] }) } catch {}
  migrationDone = true
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
      await ensureMigration(client)

      // ── 1 query : all conciergerie properties ─────────────────────────────
      const propRS = await client.execute({
        sql: `SELECT p.id, p.name, p.address, p.city, p.type, p.typeGestion,
                     p.commissionRate, p.status, COALESCE(p.splitPayment, 0) as splitPayment,
                     o.id as owner_id, o.name as owner_name
              FROM Property p
              LEFT JOIN Owner o ON o.id = p.ownerId
              WHERE p.typeGestion = 'conciergerie'
              ORDER BY p.name ASC`,
        args: [],
      })
      const props = toRows(propRS)
      if (props.length === 0) {
        const res = NextResponse.json([])
        res.headers.set('Cache-Control', 'private, max-age=20, stale-while-revalidate=60')
        return res
      }

      // ── 1 query : all revenues for all properties ─────────────────────────
      const propIds = props.map(p => p.id as number)
      const ph = propIds.map(() => '?').join(',')
      const revRS = await client.execute({
        sql: month && year
          ? `SELECT id, propertyId, month, year, platform, platformAmount, cleaningFees,
                    commissionRate, notes,
                    COALESCE(nbSejours, 0) as nbSejours, COALESCE(nbNuits, 0) as nbNuits
             FROM PropertyRevenue
             WHERE propertyId IN (${ph}) AND month = ? AND year = ?
             ORDER BY year DESC, month DESC`
          : `SELECT id, propertyId, month, year, platform, platformAmount, cleaningFees,
                    commissionRate, notes,
                    COALESCE(nbSejours, 0) as nbSejours, COALESCE(nbNuits, 0) as nbNuits
             FROM PropertyRevenue
             WHERE propertyId IN (${ph})
             ORDER BY year DESC, month DESC`,
        args: month && year ? [...propIds, month, year] : propIds,
      })

      // Group by propertyId
      const revsByProp = new Map<number, any[]>()
      for (const r of toRows(revRS)) {
        const pid = Number(r.propertyId)
        if (!revsByProp.has(pid)) revsByProp.set(pid, [])
        revsByProp.get(pid)!.push({
          id: r.id, propertyId: r.propertyId,
          month: r.month, year: r.year, platform: r.platform,
          platformAmount: Number(r.platformAmount) || 0,
          cleaningFees:   Number(r.cleaningFees)   || 0,
          commissionRate: Number(r.commissionRate) || 0,
          notes: r.notes ?? null,
          nbSejours: Number(r.nbSejours) || 0,
          nbNuits:   Number(r.nbNuits)   || 0,
        })
      }

      const result = props.map(p => ({
        id: p.id, name: p.name, address: p.address, city: p.city,
        type: p.type, typeGestion: p.typeGestion,
        commissionRate: Number(p.commissionRate) || 0,
        status: p.status,
        splitPayment: Boolean(p.splitPayment),
        owner: { id: p.owner_id, name: p.owner_name },
        revenues: revsByProp.get(Number(p.id)) ?? [],
      }))

      const res = NextResponse.json(result)
      res.headers.set('Cache-Control', 'private, max-age=20, stale-while-revalidate=60')
      return res
    } catch (error) {
      console.error('Facturation GET error:', error)
      return NextResponse.json({ error: String(error) }, { status: 500 })
    } finally {
      client.close()
    }
  }

  try {
    const properties = await prisma.property.findMany({
      where: { typeGestion: 'conciergerie' },
      include: {
        owner: { select: { id: true, name: true } },
        revenues: month && year
          ? { where: { month, year } }
          : { orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 50 },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(properties)
  } catch (error) {
    console.error('Facturation GET error (dev):', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { propertyId, month, year, platform, platformAmount, cleaningFees, commissionRate, notes } = body
    const nbNuits = Number(body.nbNuits) || 0

    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN || '',
      })
      try {
        const rs = await client.execute({
          sql: `INSERT INTO PropertyRevenue (propertyId, month, year, platform, platformAmount, cleaningFees, commissionRate, nbNuits, notes, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(propertyId, month, year, platform) DO UPDATE SET
                  platformAmount = excluded.platformAmount,
                  cleaningFees   = excluded.cleaningFees,
                  commissionRate = excluded.commissionRate,
                  nbNuits        = excluded.nbNuits,
                  notes          = excluded.notes,
                  updatedAt      = CURRENT_TIMESTAMP
                RETURNING *`,
          args: [
            Number(propertyId), Number(month), Number(year), String(platform),
            Number(platformAmount) || 0, Number(cleaningFees) || 0,
            Number(commissionRate) || 0, nbNuits, notes ?? null,
          ],
        })
        const row = toRows(rs)[0] ?? {}
        return NextResponse.json({ ...row, nbSejours: 0, nbNuits: Number(row.nbNuits) || 0 })
      } finally {
        client.close()
      }
    }

    const key = {
      propertyId_month_year_platform: {
        propertyId: Number(propertyId), month: Number(month),
        year: Number(year), platform: String(platform),
      },
    }
    const base = {
      platformAmount: Number(platformAmount) || 0,
      cleaningFees:   Number(cleaningFees)   || 0,
      commissionRate: Number(commissionRate) || 0,
      notes:          notes ?? null,
    }

    let revenue: any
    try {
      revenue = await prisma.propertyRevenue.upsert({
        where: key,
        update: { ...base, nbNuits },
        create: { propertyId: Number(propertyId), month: Number(month), year: Number(year), platform: String(platform), ...base, nbNuits },
      })
    } catch {
      revenue = await (prisma as any).propertyRevenue.upsert({
        where: key,
        update: base,
        create: { propertyId: Number(propertyId), month: Number(month), year: Number(year), platform: String(platform), ...base },
      })
    }

    return NextResponse.json({ ...revenue, nbSejours: revenue.nbSejours ?? 0, nbNuits: revenue.nbNuits ?? 0 })
  } catch (error) {
    console.error('Facturation POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
