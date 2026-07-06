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
    const { receivedPlatform, receivedOwner, paidCleaner, notes } = body
    const now = new Date().toISOString()

    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN || '',
      })
      try {
        await client.execute({
          sql: `UPDATE CleaningMargin SET receivedPlatform = ?, receivedOwner = ?, paidCleaner = ?, notes = ?, updatedAt = ? WHERE id = ?`,
          args: [
            Number(receivedPlatform) || 0,
            Number(receivedOwner)    || 0,
            Number(paidCleaner)      || 0,
            notes ?? null, now, Number(params.id),
          ],
        })
        return NextResponse.json({ success: true })
      } finally {
        client.close()
      }
    }

    await (prisma as any).cleaningMargin.update({
      where: { id: Number(params.id) },
      data: {
        receivedPlatform: Number(receivedPlatform) || 0,
        receivedOwner:    Number(receivedOwner)    || 0,
        paidCleaner:      Number(paidCleaner)      || 0,
        notes: notes ?? null,
      },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Menage PUT error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN || '',
      })
      try {
        await client.execute({ sql: `DELETE FROM CleaningMargin WHERE id = ?`, args: [Number(params.id)] })
        return NextResponse.json({ success: true })
      } finally {
        client.close()
      }
    }

    await (prisma as any).cleaningMargin.delete({ where: { id: Number(params.id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Menage DELETE error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
