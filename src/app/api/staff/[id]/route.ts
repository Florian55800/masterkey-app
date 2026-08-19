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
    const { name, phone, email, role, notes } = await req.json()
    const id = Number(params.id)

    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN || '',
      })
      try {
        const sets: string[] = ['updatedAt = datetime(\'now\')']
        const args: unknown[] = []
        if (name !== undefined) { sets.push('name = ?'); args.push(name) }
        if (phone !== undefined) { sets.push('phone = ?'); args.push(phone || null) }
        if (email !== undefined) { sets.push('email = ?'); args.push(email || null) }
        if (role !== undefined)  { sets.push('role = ?');  args.push(role) }
        if (notes !== undefined) { sets.push('notes = ?'); args.push(notes || null) }
        args.push(id)
        await client.execute({ sql: `UPDATE Staff SET ${sets.join(', ')} WHERE id = ?`, args })

        const [staffRS, propsRS] = await Promise.all([
          client.execute({ sql: `SELECT id, name, phone, email, role, notes FROM Staff WHERE id = ?`, args: [id] }),
          client.execute({ sql: `SELECT id, name, city FROM Property WHERE staffId = ? AND status = 'active'`, args: [id] }),
        ])
        const row = toRows(staffRS)[0]
        return NextResponse.json({ ...row, properties: toRows(propsRS) })
      } finally {
        client.close()
      }
    }

    const member = await prisma.staff.update({
      where: { id },
      data: {
        name: name ?? undefined,
        phone: phone !== undefined ? phone || null : undefined,
        email: email !== undefined ? email || null : undefined,
        role: role ?? undefined,
        notes: notes !== undefined ? notes || null : undefined,
      },
      include: { properties: { where: { status: 'active' }, select: { id: true, name: true, city: true } } },
    })
    return NextResponse.json(member)
  } catch (error) {
    console.error('Staff PUT error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)

    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN || '',
      })
      try {
        await client.execute({
          sql: `UPDATE Property SET staffId = NULL, updatedAt = datetime('now') WHERE staffId = ?`,
          args: [id],
        })
        await client.execute({ sql: `DELETE FROM Staff WHERE id = ?`, args: [id] })
        return NextResponse.json({ ok: true })
      } finally {
        client.close()
      }
    }

    await prisma.property.updateMany({ where: { staffId: id }, data: { staffId: null } })
    await prisma.staff.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Staff DELETE error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
