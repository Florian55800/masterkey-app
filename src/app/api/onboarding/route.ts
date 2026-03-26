export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

function toRows(rs: { columns: string[]; rows: unknown[][] }): Record<string, unknown>[] {
  return rs.rows.map((row) => {
    const obj: Record<string, unknown> = {}
    rs.columns.forEach((col, i) => { obj[col] = (row as unknown[])[i] })
    return obj
  })
}

function parseSession(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    checks: row.checks ? JSON.parse(row.checks as string) : {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function GET() {
  try {
    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
      try {
        const rs = await client.execute(`SELECT * FROM OnboardingSession ORDER BY createdAt DESC`)
        return NextResponse.json(toRows(rs).map(parseSession))
      } finally { client.close() }
    }
    const sessions = await prisma.onboardingSession.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json(sessions.map(s => ({ ...s, checks: JSON.parse(s.checks) })))
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, type } = await req.json()
    const id = randomUUID()
    const now = new Date().toISOString()

    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
      try {
        await client.execute({
          sql: `INSERT INTO OnboardingSession (id, name, type, checks, createdAt, updatedAt) VALUES (?, ?, ?, '{}', ?, ?)`,
          args: [id, name, type, now, now],
        })
        return NextResponse.json({ id, name, type, checks: {}, createdAt: now, updatedAt: now }, { status: 201 })
      } finally { client.close() }
    }
    const session = await prisma.onboardingSession.create({ data: { id, name, type } })
    return NextResponse.json({ ...session, checks: {} }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
