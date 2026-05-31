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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const reportId = searchParams.get('reportId')

  if (process.env.TURSO_DATABASE_URL) {
    const { createClient } = require('@libsql/client')
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    try {
      const rs = await client.execute(
        reportId
          ? {
              sql: `SELECT e.*, r.month, r.year, r.caBrut
                    FROM "Expense" e JOIN "MonthlyReport" r ON r.id = e.reportId
                    WHERE e.reportId = ? ORDER BY e.createdAt DESC`,
              args: [Number(reportId)],
            }
          : `SELECT e.*, r.month, r.year, r.caBrut
             FROM "Expense" e JOIN "MonthlyReport" r ON r.id = e.reportId
             ORDER BY r.year DESC, r.month DESC, e.createdAt DESC`
      )
      return NextResponse.json(toRows(rs))
    } finally {
      client.close()
    }
  }

  const expenses = await prisma.expense.findMany({
    where: reportId ? { reportId: Number(reportId) } : undefined,
    include: { report: { select: { month: true, year: true, caBrut: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(expenses.map(e => ({ ...e, month: e.report.month, year: e.report.year, caBrut: e.report.caBrut })))
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { reportId, category, description, amount, isRecurring, payDate, paymentDay } = body

  if (process.env.TURSO_DATABASE_URL) {
    const { createClient } = require('@libsql/client')
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    try {
      const rs = await client.execute({
        sql: `INSERT INTO "Expense" (reportId, category, description, amount, isRecurring, payDate, paymentDay)
              VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
        args: [
          Number(reportId),
          category,
          description || null,
          Number(amount),
          isRecurring ? 1 : 0,
          payDate || null,
          paymentDay ? Number(paymentDay) : null,
        ],
      })
      return NextResponse.json(toRows(rs)[0], { status: 201 })
    } finally {
      client.close()
    }
  }

  const expense = await prisma.expense.create({
    data: {
      reportId: Number(reportId),
      category,
      description: description || null,
      amount: Number(amount),
      isRecurring: Boolean(isRecurring),
      payDate: payDate ? new Date(payDate) : null,
      paymentDay: paymentDay ? Number(paymentDay) : null,
    },
  })
  return NextResponse.json(expense, { status: 201 })
}
