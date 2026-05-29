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
      const rs = await client.execute(`SELECT * FROM "Prestataire" ORDER BY name ASC`)
      return NextResponse.json(toRows(rs))
    } finally {
      client.close()
    }
  }
  const data = await prisma.prestataire.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, phone, email, city, categories = '[]', services, source, notes, isWhatsapp = false } = body

  if (process.env.TURSO_DATABASE_URL) {
    const { createClient } = require('@libsql/client')
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    try {
      const rs = await client.execute({
        sql: `INSERT INTO "Prestataire" (name, phone, email, city, categories, services, source, notes, isWhatsapp)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
        args: [name, phone || null, email || null, city || null, categories, services || null, source || null, notes || null, isWhatsapp ? 1 : 0],
      })
      return NextResponse.json(toRows(rs)[0])
    } finally {
      client.close()
    }
  }
  const data = await prisma.prestataire.create({
    data: { name, phone: phone || null, email: email || null, city: city || null, categories, services: services || null, source: source || null, notes: notes || null, isWhatsapp },
  })
  return NextResponse.json(data)
}
