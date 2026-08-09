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
        sql: `SELECT p.id, p.name, p.address, p.city, p.type, p.typeGestion,
                     p.commissionRate, p.status,
                     o.id as owner_id, o.name as owner_name
              FROM Property p
              LEFT JOIN Owner o ON o.id = p.ownerId
              WHERE p.typeGestion = 'sous-location'
              ORDER BY p.name ASC`,
        args: [],
      })
      const props = toRows(propRS)

      // Vérifier si nbSejours/nbNuits existent sur PropertyRevenue
      let hasNbCols = false
      try {
        await client.execute({ sql: `SELECT nbSejours FROM PropertyRevenue LIMIT 1`, args: [] })
        hasNbCols = true
      } catch { hasNbCols = false }

      const revSql = hasNbCols
        ? `SELECT id, propertyId, month, year, platform, platformAmount, cleaningFees,
                  commissionRate, notes, nbSejours, nbNuits
           FROM PropertyRevenue
           WHERE propertyId = ?${month && year ? ' AND month = ? AND year = ?' : ''}
           ORDER BY year DESC, month DESC${month && year ? '' : ' LIMIT 50'}`
        : `SELECT id, propertyId, month, year, platform, platformAmount, cleaningFees,
                  commissionRate, notes, 0 as nbSejours, 0 as nbNuits
           FROM PropertyRevenue
           WHERE propertyId = ?${month && year ? ' AND month = ? AND year = ?' : ''}
           ORDER BY year DESC, month DESC${month && year ? '' : ' LIMIT 50'}`

      const expSql = `SELECT id, propertyId, month, year, loyer, electricite, wifi,
                             autresCharges, COALESCE(assurance, 0) as assurance, nbSejours, nbNuits, notes
                      FROM SubletExpense
                      WHERE propertyId = ?${month && year ? ' AND month = ? AND year = ?' : ''}
                      ORDER BY year DESC, month DESC${month && year ? '' : ' LIMIT 12'}`

      const result = await Promise.all(props.map(async (p) => {
        const args = month && year ? [p.id, month, year] : [p.id]

        const [revsRS, expRS] = await Promise.all([
          client.execute({ sql: revSql, args }),
          client.execute({ sql: expSql, args }),
        ])

        const revenues = toRows(revsRS).map(r => ({
          id: r.id, propertyId: r.propertyId,
          month: r.month, year: r.year,
          platform: r.platform,
          platformAmount: Number(r.platformAmount) || 0,
          cleaningFees: Number(r.cleaningFees) || 0,
          commissionRate: Number(r.commissionRate) || 0,
          notes: r.notes ?? null,
          nbSejours: Number(r.nbSejours) || 0,
          nbNuits: Number(r.nbNuits) || 0,
        }))

        const subletExpenses = toRows(expRS).map(e => ({
          id: e.id, propertyId: e.propertyId,
          month: e.month, year: e.year,
          loyer: Number(e.loyer) || 0,
          electricite: Number(e.electricite) || 0,
          wifi: Number(e.wifi) || 0,
          autresCharges: Number(e.autresCharges) || 0,
          assurance: Number(e.assurance) || 0,
          nbSejours: Number(e.nbSejours) || 0,
          nbNuits: Number(e.nbNuits) || 0,
          notes: e.notes ?? null,
        }))

        return {
          id: p.id, name: p.name, address: p.address, city: p.city,
          type: p.type, typeGestion: p.typeGestion,
          commissionRate: Number(p.commissionRate) || 0,
          status: p.status,
          owner: { id: p.owner_id, name: p.owner_name },
          revenues,
          subletExpenses,
        }
      }))

      return NextResponse.json(result)
    } catch (error) {
      console.error('Sous-location GET error:', error)
      return NextResponse.json({ error: String(error) }, { status: 500 })
    } finally {
      client.close()
    }
  }

  try {
    const properties = await prisma.property.findMany({
      where: { typeGestion: 'sous-location' },
      include: {
        owner: { select: { id: true, name: true } },
        revenues: month && year
          ? { where: { month, year } }
          : { orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 50 },
        subletExpenses: month && year
          ? { where: { month, year } }
          : { orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 12 },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(properties)
  } catch (error) {
    console.error('Sous-location GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { propertyId, month, year, loyer, electricite, wifi, autresCharges, assurance, nbSejours, nbNuits, notes } = body

    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN || '',
      })
      try {
        const rs = await client.execute({
          sql: `INSERT INTO SubletExpense (propertyId, month, year, loyer, electricite, wifi, autresCharges, assurance, nbSejours, nbNuits, notes, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                ON CONFLICT(propertyId, month, year) DO UPDATE SET
                  loyer = excluded.loyer,
                  electricite = excluded.electricite,
                  wifi = excluded.wifi,
                  autresCharges = excluded.autresCharges,
                  assurance = excluded.assurance,
                  nbSejours = excluded.nbSejours,
                  nbNuits = excluded.nbNuits,
                  notes = excluded.notes,
                  updatedAt = datetime('now')
                RETURNING *`,
          args: [
            Number(propertyId), Number(month), Number(year),
            Number(loyer) || 0, Number(electricite) || 0,
            Number(wifi) || 0, Number(autresCharges) || 0,
            Number(assurance) || 0,
            Number(nbSejours) || 0, Number(nbNuits) || 0,
            notes ?? null,
          ],
        })
        const rows = toRows(rs)
        return NextResponse.json(rows[0])
      } finally {
        client.close()
      }
    }

    const expense = await prisma.subletExpense.upsert({
      where: {
        propertyId_month_year: {
          propertyId: Number(propertyId),
          month: Number(month),
          year: Number(year),
        },
      },
      update: {
        loyer: Number(loyer) || 0,
        electricite: Number(electricite) || 0,
        wifi: Number(wifi) || 0,
        autresCharges: Number(autresCharges) || 0,
        assurance: Number(assurance) || 0,
        nbSejours: Number(nbSejours) || 0,
        nbNuits: Number(nbNuits) || 0,
        notes: notes ?? null,
      },
      create: {
        propertyId: Number(propertyId),
        month: Number(month),
        year: Number(year),
        loyer: Number(loyer) || 0,
        electricite: Number(electricite) || 0,
        wifi: Number(wifi) || 0,
        autresCharges: Number(autresCharges) || 0,
        assurance: Number(assurance) || 0,
        nbSejours: Number(nbSejours) || 0,
        nbNuits: Number(nbNuits) || 0,
        notes: notes ?? null,
      },
    })
    return NextResponse.json(expense)
  } catch (error) {
    console.error('Sous-location POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
