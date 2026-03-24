export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { status, description, amount, ownerId, propertyId, date, notes } = await req.json()
    const id = Number(params.id)

    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
      try {
        await client.execute({
          sql: `UPDATE "Advance" SET description=?, amount=?, ownerId=?, propertyId=?, status=?, date=?, notes=?, updatedAt=CURRENT_TIMESTAMP WHERE id=?`,
          args: [description, Number(amount), ownerId ? Number(ownerId) : null, propertyId ? Number(propertyId) : null, status, date, notes || null, id],
        })
        return NextResponse.json({ ok: true })
      } finally { client.close() }
    }

    const advance = await prisma.advance.update({
      where: { id },
      data: {
        description, amount: Number(amount),
        ownerId: ownerId ? Number(ownerId) : null,
        propertyId: propertyId ? Number(propertyId) : null,
        status, date: new Date(date), notes: notes || null,
      },
    })
    return NextResponse.json(advance)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)

    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
      try {
        await client.execute({ sql: `DELETE FROM "Advance" WHERE id=?`, args: [id] })
        return NextResponse.json({ ok: true })
      } finally { client.close() }
    }

    await prisma.advance.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
