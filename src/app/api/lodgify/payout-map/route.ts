export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
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

// GET /api/lodgify/payout-map
// Returns { [lodgifyId]: { commissionRate, name } } for properties with a lodgifyId set
export async function GET() {
  try {
    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      })
      try {
        const rs = await client.execute(
          `SELECT id, name, lodgifyId, commissionRate, cleaningFee, status FROM Property WHERE lodgifyId IS NOT NULL`
        )
        const rows = toRows(rs)
        const map: Record<number, { commissionRate: number; cleaningFee: number; name: string; status: string }> = {}
        for (const row of rows) {
          if (row.lodgifyId) {
            map[row.lodgifyId as number] = {
              commissionRate: Number(row.commissionRate) || 0,
              cleaningFee: Number(row.cleaningFee) || 0,
              name: row.name as string,
              status: row.status as string,
            }
          }
        }
        return NextResponse.json(map)
      } finally {
        client.close()
      }
    }

    // Local dev: Prisma
    const properties = await prisma.property.findMany({
      where: { lodgifyId: { not: null } },
      select: { id: true, name: true, lodgifyId: true, commissionRate: true, cleaningFee: true, status: true },
    })
    const map: Record<number, { commissionRate: number; cleaningFee: number; name: string; status: string }> = {}
    for (const p of properties) {
      if (p.lodgifyId) {
        map[p.lodgifyId] = { commissionRate: p.commissionRate, cleaningFee: p.cleaningFee, name: p.name, status: p.status }
      }
    }
    return NextResponse.json(map)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('payout-map GET error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
