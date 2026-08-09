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

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const id   = Number(params.id)
    const nbNuits = body.nbNuits !== undefined ? Number(body.nbNuits) : undefined

    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN || '',
      })
      try {
        const args: unknown[] = [
          Number(body.platformAmount) || 0,
          Number(body.cleaningFees)   || 0,
          Number(body.commissionRate) || 0,
          nbNuits ?? 0,
          body.notes ?? null,
          id,
        ]
        await client.execute({
          sql: `UPDATE PropertyRevenue SET
                  platformAmount = ?, cleaningFees = ?, commissionRate = ?,
                  nbNuits = ?, notes = ?, updatedAt = CURRENT_TIMESTAMP
                WHERE id = ?`,
          args,
        })
        const rs = await client.execute({ sql: `SELECT * FROM PropertyRevenue WHERE id = ?`, args: [id] })
        const row = toRows(rs)[0] ?? {}
        return NextResponse.json({ ...row, nbSejours: 0, nbNuits: Number(row.nbNuits) || 0 })
      } finally {
        client.close()
      }
    }

    const base = {
      platformAmount: Number(body.platformAmount) || 0,
      cleaningFees:   Number(body.cleaningFees)   || 0,
      commissionRate: Number(body.commissionRate) || 0,
      notes:          body.notes ?? null,
    }

    let revenue: any
    try {
      revenue = await prisma.propertyRevenue.update({
        where: { id },
        data: { ...base, nbNuits },
      })
    } catch {
      revenue = await prisma.propertyRevenue.update({ where: { id }, data: base })
    }

    return NextResponse.json({ ...revenue, nbSejours: revenue.nbSejours ?? 0, nbNuits: revenue.nbNuits ?? 0 })
  } catch (error) {
    console.error('Facturation PUT error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)

    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN || '',
      })
      try {
        await client.execute({ sql: `DELETE FROM PropertyRevenue WHERE id = ?`, args: [id] })
        return NextResponse.json({ ok: true })
      } finally {
        client.close()
      }
    }

    await prisma.propertyRevenue.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Facturation DELETE error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
