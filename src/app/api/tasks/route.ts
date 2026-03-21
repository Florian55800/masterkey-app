export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@libsql/client'

function getTursoClient() {
  const url = process.env.TURSO_DATABASE_URL
  if (!url) return null
  return createClient({ url: url.replace(/^libsql:\/\//, 'http://'), authToken: process.env.TURSO_AUTH_TOKEN || '' })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const month = parseInt(searchParams.get('month') ?? '0')
  const year = parseInt(searchParams.get('year') ?? '0')

  const client = getTursoClient()
  if (client) {
    try {
      const rs = await client.execute({
        sql: `SELECT * FROM "Task" WHERE month = ? AND year = ? ORDER BY createdAt ASC`,
        args: [month, year],
      })
      return NextResponse.json(rs.rows)
    } finally { client.close() }
  }
  try {
    const tasks = await prisma.task.findMany({
      where: { month, year },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(tasks)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, type, month, year } = body
  const client = getTursoClient()
  if (client) {
    try {
      const rs = await client.execute({
        sql: `INSERT INTO "Task" (title, type, month, year, createdAt) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        args: [title, type || 'autre', Number(month), Number(year)],
      })
      return NextResponse.json({ id: Number(rs.lastInsertRowid) }, { status: 201 })
    } finally { client.close() }
  }
  try {
    const task = await prisma.task.create({ data: { title, type: type || 'autre', month: Number(month), year: Number(year) } })
    return NextResponse.json(task, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
