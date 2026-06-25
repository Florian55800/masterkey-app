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
  const { category, description, amount, isRecurring, payDate, paymentDay } = body

  if (process.env.TURSO_DATABASE_URL) {
    const { createClient } = require('@libsql/client')
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    try {
      const sets: string[] = []
      const args: unknown[] = []
      if (category !== undefined)    { sets.push('category = ?');    args.push(category) }
      if (description !== undefined) { sets.push('description = ?'); args.push(description || null) }
      if (amount !== undefined)      { sets.push('amount = ?');      args.push(Number(amount)) }
      if (isRecurring !== undefined) { sets.push('isRecurring = ?'); args.push(isRecurring ? 1 : 0) }
      if (payDate !== undefined)     { sets.push('payDate = ?');     args.push(payDate || null) }
      if (paymentDay !== undefined)  { sets.push('paymentDay = ?');  args.push(paymentDay ? Number(paymentDay) : null) }
      if (sets.length > 0) {
        args.push(id)
        await client.execute({ sql: `UPDATE "Expense" SET ${sets.join(', ')} WHERE id = ?`, args })
      }
      const rs = await client.execute({ sql: `SELECT * FROM "Expense" WHERE id = ?`, args: [id] })
      const rows = toRows(rs)
      if (rows.length === 0) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
      return NextResponse.json(rows[0])
    } finally {
      client.close()
    }
  }

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      category:    category !== undefined ? category : undefined,
      description: description !== undefined ? description || null : undefined,
      amount:      amount !== undefined ? Number(amount) : undefined,
      isRecurring: isRecurring !== undefined ? Boolean(isRecurring) : undefined,
      payDate:     payDate !== undefined ? (payDate ? new Date(payDate) : null) : undefined,
      paymentDay:  paymentDay !== undefined ? (paymentDay ? Number(paymentDay) : null) : undefined,
    },
  })
  return NextResponse.json(expense)
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
      await client.execute({ sql: `DELETE FROM "Expense" WHERE id = ?`, args: [id] })
      return NextResponse.json({ success: true })
    } finally {
      client.close()
    }
  }
  await prisma.expense.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
