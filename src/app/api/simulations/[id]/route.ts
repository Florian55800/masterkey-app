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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id)
  const body = await request.json()
  const { name, revenues, expenses, salary, loanTotal, loanRemaining, loanMonthly, notes } = body

  if (process.env.TURSO_DATABASE_URL) {
    const { createClient } = require('@libsql/client')
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    try {
      const sets: string[] = []
      const args: unknown[] = []
      if (name !== undefined)          { sets.push('name = ?');          args.push(name) }
      if (revenues !== undefined)      { sets.push('revenues = ?');      args.push(revenues) }
      if (expenses !== undefined)      { sets.push('expenses = ?');      args.push(expenses) }
      if (salary !== undefined)        { sets.push('salary = ?');        args.push(Number(salary)) }
      if (loanTotal !== undefined)     { sets.push('loanTotal = ?');     args.push(Number(loanTotal)) }
      if (loanRemaining !== undefined) { sets.push('loanRemaining = ?'); args.push(Number(loanRemaining)) }
      if (loanMonthly !== undefined)   { sets.push('loanMonthly = ?');   args.push(Number(loanMonthly)) }
      if (notes !== undefined)         { sets.push('notes = ?');         args.push(notes || null) }

      if (sets.length > 0) {
        args.push(id)
        await client.execute({
          sql: `UPDATE "Simulation" SET ${sets.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
          args,
        })
      }
      const rs = await client.execute({ sql: `SELECT * FROM "Simulation" WHERE id = ?`, args: [id] })
      const rows = toRows(rs)
      if (rows.length === 0) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
      return NextResponse.json(rows[0])
    } finally {
      client.close()
    }
  }

  const sim = await prisma.simulation.update({
    where: { id },
    data: {
      name:          name !== undefined ? name : undefined,
      revenues:      revenues !== undefined ? revenues : undefined,
      expenses:      expenses !== undefined ? expenses : undefined,
      salary:        salary !== undefined ? Number(salary) : undefined,
      loanTotal:     loanTotal !== undefined ? Number(loanTotal) : undefined,
      loanRemaining: loanRemaining !== undefined ? Number(loanRemaining) : undefined,
      loanMonthly:   loanMonthly !== undefined ? Number(loanMonthly) : undefined,
      notes:         notes !== undefined ? notes || null : undefined,
    },
  })
  return NextResponse.json(sim)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id)

  if (process.env.TURSO_DATABASE_URL) {
    const { createClient } = require('@libsql/client')
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    try {
      await client.execute({ sql: `DELETE FROM "Simulation" WHERE id = ?`, args: [id] })
      return NextResponse.json({ deleted: true })
    } finally {
      client.close()
    }
  }
  await prisma.simulation.delete({ where: { id } })
  return NextResponse.json({ deleted: true })
}
