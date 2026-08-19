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
      authToken: process.env.TURSO_AUTH_TOKEN || '',
    })
    try {
      const [staffRS, propsRS] = await Promise.all([
        client.execute(`SELECT id, name, phone, email, role, notes FROM Staff ORDER BY name ASC`),
        client.execute(
          `SELECT id, name, city, staffId FROM Property WHERE status = 'active' AND staffId IS NOT NULL`
        ),
      ])

      const propsByStaff = new Map<number, any[]>()
      for (const p of toRows(propsRS)) {
        const sid = Number(p.staffId)
        if (!propsByStaff.has(sid)) propsByStaff.set(sid, [])
        propsByStaff.get(sid)!.push({ id: p.id, name: p.name, city: p.city })
      }

      const result = toRows(staffRS).map(s => ({
        ...s,
        properties: propsByStaff.get(Number(s.id)) ?? [],
      }))

      return NextResponse.json(result)
    } catch (error) {
      console.error('Staff GET Turso error:', error)
      return NextResponse.json({ error: String(error) }, { status: 500 })
    } finally {
      client.close()
    }
  }

  try {
    const staff = await prisma.staff.findMany({
      include: {
        properties: { where: { status: 'active' }, select: { id: true, name: true, city: true } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(staff)
  } catch (error) {
    console.error('Staff GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, phone, email, role, notes } = await req.json()

    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN || '',
      })
      try {
        const rs = await client.execute({
          sql: `INSERT INTO Staff (name, phone, email, role, notes, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now')) RETURNING *`,
          args: [name, phone || null, email || null, role || 'ménage', notes || null],
        })
        const row = toRows(rs)[0]
        return NextResponse.json({ ...row, properties: [] }, { status: 201 })
      } finally {
        client.close()
      }
    }

    const member = await prisma.staff.create({
      data: { name, phone: phone || null, email: email || null, role: role || 'ménage', notes: notes || null },
      include: { properties: { where: { status: 'active' }, select: { id: true, name: true, city: true } } },
    })
    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    console.error('Staff POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
