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

export async function GET() {
  if (process.env.TURSO_DATABASE_URL) {
    const { createClient } = require('@libsql/client')
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    try {
      const rs = await client.execute(`SELECT * FROM "Simulation" ORDER BY createdAt DESC`)
      return NextResponse.json(toRows(rs))
    } finally {
      client.close()
    }
  }
  const sims = await prisma.simulation.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(sims)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name = 'Ma simulation', revenues = '[]', expenses = '[]', salary = 0,
          loanTotal = 10000, loanRemaining = 10000, loanMonthly = 0, notes = null } = body

  if (process.env.TURSO_DATABASE_URL) {
    const { createClient } = require('@libsql/client')
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    try {
      const rs = await client.execute({
        sql: `INSERT INTO "Simulation" (name, revenues, expenses, salary, loanTotal, loanRemaining, loanMonthly, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
        args: [name, revenues, expenses, salary, loanTotal, loanRemaining, loanMonthly, notes],
      })
      return NextResponse.json(toRows(rs)[0])
    } finally {
      client.close()
    }
  }
  const sim = await prisma.simulation.create({
    data: { name, revenues, expenses, salary, loanTotal, loanRemaining, loanMonthly, notes },
  })
  return NextResponse.json(sim)
}
