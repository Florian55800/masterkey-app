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
  const { name, phone, email, city, categories, services, source, notes, isWhatsapp } = body

  if (process.env.TURSO_DATABASE_URL) {
    const { createClient } = require('@libsql/client')
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    try {
      const sets: string[] = []
      const args: unknown[] = []
      if (name !== undefined)       { sets.push('name = ?');       args.push(name) }
      if (phone !== undefined)      { sets.push('phone = ?');      args.push(phone || null) }
      if (email !== undefined)      { sets.push('email = ?');      args.push(email || null) }
      if (city !== undefined)       { sets.push('city = ?');       args.push(city || null) }
      if (categories !== undefined) { sets.push('categories = ?'); args.push(categories) }
      if (services !== undefined)   { sets.push('services = ?');   args.push(services || null) }
      if (source !== undefined)     { sets.push('source = ?');     args.push(source || null) }
      if (notes !== undefined)      { sets.push('notes = ?');      args.push(notes || null) }
      if (isWhatsapp !== undefined) { sets.push('isWhatsapp = ?'); args.push(isWhatsapp ? 1 : 0) }

      if (sets.length > 0) {
        args.push(id)
        await client.execute({
          sql: `UPDATE "Prestataire" SET ${sets.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
          args,
        })
      }
      const rs = await client.execute({ sql: `SELECT * FROM "Prestataire" WHERE id = ?`, args: [id] })
      const rows = toRows(rs)
      if (rows.length === 0) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
      return NextResponse.json(rows[0])
    } finally {
      client.close()
    }
  }

  const data = await prisma.prestataire.update({
    where: { id },
    data: {
      name:       name !== undefined ? name : undefined,
      phone:      phone !== undefined ? phone || null : undefined,
      email:      email !== undefined ? email || null : undefined,
      city:       city !== undefined ? city || null : undefined,
      categories: categories !== undefined ? categories : undefined,
      services:   services !== undefined ? services || null : undefined,
      source:     source !== undefined ? source || null : undefined,
      notes:      notes !== undefined ? notes || null : undefined,
      isWhatsapp: isWhatsapp !== undefined ? isWhatsapp : undefined,
    },
  })
  return NextResponse.json(data)
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
      await client.execute({ sql: `DELETE FROM "Prestataire" WHERE id = ?`, args: [id] })
      return NextResponse.json({ deleted: true })
    } finally {
      client.close()
    }
  }
  await prisma.prestataire.delete({ where: { id } })
  return NextResponse.json({ deleted: true })
}
