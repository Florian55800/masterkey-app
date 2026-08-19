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

function mapExpense(e: Record<string, unknown>) {
  return {
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
    revenueTva: Number(e.revenueTva) || 0,
    loyerTva: Number(e.loyerTva) || 0,
    electriciteTva: Number(e.electriciteTva) || 0,
    wifiTva: Number(e.wifiTva) || 0,
    assuranceTva: Number(e.assuranceTva) || 0,
    autresChargesTva: Number(e.autresChargesTva) || 0,
    isRecurring: Boolean(e.isRecurring),
  }
}

let migrationDone = false
async function runMigration(client: any) {
  if (migrationDone) return
  const newCols = [
    'revenueTva REAL DEFAULT 0', 'loyerTva REAL DEFAULT 0',
    'electriciteTva REAL DEFAULT 0', 'wifiTva REAL DEFAULT 0',
    'assuranceTva REAL DEFAULT 0', 'autresChargesTva REAL DEFAULT 0',
    'isRecurring INTEGER DEFAULT 0',
  ]
  for (const col of newCols) {
    try { await client.execute({ sql: `ALTER TABLE SubletExpense ADD COLUMN ${col}`, args: [] }) } catch {}
  }
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
      await runMigration(client)

      // ── 1 query : all sous-location properties ────────────────────────────
      const propRS = await client.execute({
        sql: `SELECT p.id, p.name, p.address, p.city, p.type, p.typeGestion,
                     p.commissionRate, p.status, COALESCE(p.splitPayment, 0) as splitPayment,
                     o.id as owner_id, o.name as owner_name
              FROM Property p
              LEFT JOIN Owner o ON o.id = p.ownerId
              WHERE p.typeGestion = 'sous-location'
              ORDER BY p.name ASC`,
        args: [],
      })
      const props = toRows(propRS)
      if (props.length === 0) {
        const res = NextResponse.json([])
        res.headers.set('Cache-Control', 'private, max-age=20, stale-while-revalidate=60')
        return res
      }

      const propIds = props.map(p => p.id as number)
      const ph = propIds.map(() => '?').join(',')

      const EXP_COLS = `id, propertyId, month, year, loyer, electricite, wifi,
        autresCharges, COALESCE(assurance, 0) as assurance, nbSejours, nbNuits, notes,
        COALESCE(revenueTva, 0) as revenueTva, COALESCE(loyerTva, 0) as loyerTva,
        COALESCE(electriciteTva, 0) as electriciteTva, COALESCE(wifiTva, 0) as wifiTva,
        COALESCE(assuranceTva, 0) as assuranceTva, COALESCE(autresChargesTva, 0) as autresChargesTva,
        COALESCE(isRecurring, 0) as isRecurring`

      // ── 2 queries in parallel : all revenues + all expenses ───────────────
      const [revsRS, expRS] = await Promise.all([
        client.execute({
          sql: month && year
            ? `SELECT id, propertyId, month, year, platform, platformAmount, cleaningFees,
                      commissionRate, notes,
                      COALESCE(nbSejours, 0) as nbSejours, COALESCE(nbNuits, 0) as nbNuits
               FROM PropertyRevenue WHERE propertyId IN (${ph}) AND month = ? AND year = ?
               ORDER BY year DESC, month DESC`
            : `SELECT id, propertyId, month, year, platform, platformAmount, cleaningFees,
                      commissionRate, notes,
                      COALESCE(nbSejours, 0) as nbSejours, COALESCE(nbNuits, 0) as nbNuits
               FROM PropertyRevenue WHERE propertyId IN (${ph})
               ORDER BY year DESC, month DESC`,
          args: month && year ? [...propIds, month, year] : propIds,
        }),
        client.execute({
          sql: month && year
            ? `SELECT ${EXP_COLS} FROM SubletExpense WHERE propertyId IN (${ph}) AND month = ? AND year = ? ORDER BY year DESC, month DESC`
            : `SELECT ${EXP_COLS} FROM SubletExpense WHERE propertyId IN (${ph}) ORDER BY year DESC, month DESC`,
          args: month && year ? [...propIds, month, year] : propIds,
        }),
      ])

      // Group by propertyId
      const revsByProp = new Map<number, any[]>()
      for (const r of toRows(revsRS)) {
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

      const expByProp = new Map<number, any[]>()
      for (const e of toRows(expRS)) {
        const pid = Number(e.propertyId)
        if (!expByProp.has(pid)) expByProp.set(pid, [])
        expByProp.get(pid)!.push(mapExpense(e))
      }

      // ── 1 optional query : recurring templates for props with no expense ──
      const recurringByProp = new Map<number, any>()
      if (month && year) {
        const noExpIds = propIds.filter(id => !expByProp.has(id))
        if (noExpIds.length > 0) {
          const rph = noExpIds.map(() => '?').join(',')
          const recRS = await client.execute({
            sql: `SELECT ${EXP_COLS} FROM SubletExpense
                  WHERE propertyId IN (${rph}) AND isRecurring = 1
                  ORDER BY year DESC, month DESC`,
            args: noExpIds,
          })
          for (const r of toRows(recRS)) {
            const pid = Number(r.propertyId)
            if (!recurringByProp.has(pid)) recurringByProp.set(pid, mapExpense(r))
          }
        }
      }

      const result = props.map(p => {
        const pid = Number(p.id)
        const subletExpenses = expByProp.get(pid) ?? []
        return {
          id: p.id, name: p.name, address: p.address, city: p.city,
          type: p.type, typeGestion: p.typeGestion,
          commissionRate: Number(p.commissionRate) || 0,
          status: p.status,
          splitPayment: Boolean(p.splitPayment),
          owner: { id: p.owner_id, name: p.owner_name },
          revenues: revsByProp.get(pid) ?? [],
          subletExpenses,
          recurringTemplate: subletExpenses.length === 0 ? (recurringByProp.get(pid) ?? null) : null,
        }
      })

      const res = NextResponse.json(result)
      res.headers.set('Cache-Control', 'private, max-age=20, stale-while-revalidate=60')
      return res
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
    return NextResponse.json(properties.map(p => ({ ...p, recurringTemplate: null })))
  } catch (error) {
    console.error('Sous-location GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      propertyId, month, year, loyer, electricite, wifi, autresCharges, assurance,
      nbSejours, nbNuits, notes,
      revenueTva, loyerTva, electriciteTva, wifiTva, assuranceTva, autresChargesTva, isRecurring,
    } = body

    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN || '',
      })
      try {
        await runMigration(client)
        const rs = await client.execute({
          sql: `INSERT INTO SubletExpense (
                  propertyId, month, year, loyer, electricite, wifi, autresCharges, assurance,
                  nbSejours, nbNuits, notes, createdAt, updatedAt,
                  revenueTva, loyerTva, electriciteTva, wifiTva, assuranceTva, autresChargesTva, isRecurring
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(propertyId, month, year) DO UPDATE SET
                  loyer = excluded.loyer, electricite = excluded.electricite,
                  wifi = excluded.wifi, autresCharges = excluded.autresCharges,
                  assurance = excluded.assurance, nbSejours = excluded.nbSejours,
                  nbNuits = excluded.nbNuits, notes = excluded.notes,
                  revenueTva = excluded.revenueTva, loyerTva = excluded.loyerTva,
                  electriciteTva = excluded.electriciteTva, wifiTva = excluded.wifiTva,
                  assuranceTva = excluded.assuranceTva, autresChargesTva = excluded.autresChargesTva,
                  isRecurring = excluded.isRecurring, updatedAt = datetime('now')
                RETURNING *`,
          args: [
            Number(propertyId), Number(month), Number(year),
            Number(loyer) || 0, Number(electricite) || 0,
            Number(wifi) || 0, Number(autresCharges) || 0,
            Number(assurance) || 0,
            Number(nbSejours) || 0, Number(nbNuits) || 0,
            notes ?? null,
            Number(revenueTva) || 0, Number(loyerTva) || 0,
            Number(electriciteTva) || 0, Number(wifiTva) || 0,
            Number(assuranceTva) || 0, Number(autresChargesTva) || 0,
            isRecurring ? 1 : 0,
          ],
        })
        const rows = toRows(rs)
        return NextResponse.json(mapExpense(rows[0]))
      } finally {
        client.close()
      }
    }

    const expense = await prisma.subletExpense.upsert({
      where: { propertyId_month_year: { propertyId: Number(propertyId), month: Number(month), year: Number(year) } },
      update: {
        loyer: Number(loyer) || 0, electricite: Number(electricite) || 0,
        wifi: Number(wifi) || 0, autresCharges: Number(autresCharges) || 0,
        assurance: Number(assurance) || 0,
        nbSejours: Number(nbSejours) || 0, nbNuits: Number(nbNuits) || 0, notes: notes ?? null,
      },
      create: {
        propertyId: Number(propertyId), month: Number(month), year: Number(year),
        loyer: Number(loyer) || 0, electricite: Number(electricite) || 0,
        wifi: Number(wifi) || 0, autresCharges: Number(autresCharges) || 0,
        assurance: Number(assurance) || 0,
        nbSejours: Number(nbSejours) || 0, nbNuits: Number(nbNuits) || 0, notes: notes ?? null,
      },
    })
    return NextResponse.json({ ...expense, revenueTva: 0, loyerTva: 0, electriciteTva: 0, wifiTva: 0, assuranceTva: 0, autresChargesTva: 0, isRecurring: false })
  } catch (error) {
    console.error('Sous-location POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
