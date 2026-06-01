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
    const { loyer, electricite, wifi, autresCharges, nbSejours, nbNuits, notes } = body
    const id = Number(params.id)

    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN || '',
      })
      try {
        await client.execute({
          sql: `UPDATE SubletExpense SET
                  loyer = ?, electricite = ?, wifi = ?, autresCharges = ?,
                  nbSejours = ?, nbNuits = ?, notes = ?, updatedAt = datetime('now')
                WHERE id = ?`,
          args: [
            Number(loyer) || 0, Number(electricite) || 0,
            Number(wifi) || 0, Number(autresCharges) || 0,
            Number(nbSejours) || 0, Number(nbNuits) || 0,
            notes ?? null, id,
          ],
        })
        const rs = await client.execute({ sql: `SELECT * FROM SubletExpense WHERE id = ?`, args: [id] })
        const rows = toRows(rs)
        if (rows.length === 0) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
        return NextResponse.json(rows[0])
      } finally {
        client.close()
      }
    }

    const expense = await prisma.subletExpense.update({
      where: { id },
      data: {
        loyer: Number(loyer) || 0,
        electricite: Number(electricite) || 0,
        wifi: Number(wifi) || 0,
        autresCharges: Number(autresCharges) || 0,
        nbSejours: Number(nbSejours) || 0,
        nbNuits: Number(nbNuits) || 0,
        notes: notes ?? null,
      },
    })
    return NextResponse.json(expense)
  } catch (error) {
    console.error('Sous-location PUT error:', error)
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
        await client.execute({ sql: `DELETE FROM SubletExpense WHERE id = ?`, args: [id] })
        return NextResponse.json({ ok: true })
      } finally {
        client.close()
      }
    }

    await prisma.subletExpense.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Sous-location DELETE error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
