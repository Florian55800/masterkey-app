export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@libsql/client'

function getTursoClient() {
  const url = process.env.TURSO_DATABASE_URL
  if (!url) return null
  return createClient({ url: url.replace(/^libsql:\/\//, 'http://'), authToken: process.env.TURSO_AUTH_TOKEN || '' })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const client = getTursoClient()
  if (client) {
    try {
      await client.execute({ sql: `DELETE FROM "Task" WHERE id = ?`, args: [id] })
      return NextResponse.json({ ok: true })
    } finally { client.close() }
  }
  try {
    await prisma.task.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
