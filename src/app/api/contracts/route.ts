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
      const rs = await client.execute(
        `SELECT * FROM Contract ORDER BY dateExpiration ASC, name ASC`
      )
      return NextResponse.json(toRows(rs))
    } catch (error) {
      console.error('Contracts GET Turso error:', error)
      return NextResponse.json({ error: String(error) }, { status: 500 })
    } finally {
      client.close()
    }
  }

  try {
    const contracts = await prisma.contract.findMany({
      orderBy: [{ dateExpiration: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json(contracts)
  } catch (error) {
    console.error('Contracts GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, contrepartie, type, dateSigne, dateExpiration, dureePreavis, statut, notes } = body

  if (process.env.TURSO_DATABASE_URL) {
    const { createClient } = require('@libsql/client')
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN || '',
    })
    try {
      const rs = await client.execute({
        sql: `INSERT INTO Contract (name, contrepartie, type, dateSigne, dateExpiration, dureePreavis, statut, notes, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
              RETURNING *`,
        args: [
          name, contrepartie || null, type || 'autre',
          dateSigne || null, dateExpiration || null,
          dureePreavis ? Number(dureePreavis) : null,
          statut || 'actif', notes || null,
        ],
      })
      return NextResponse.json(toRows(rs)[0], { status: 201 })
    } catch (error) {
      console.error('Contracts POST Turso error:', error)
      return NextResponse.json({ error: String(error) }, { status: 500 })
    } finally {
      client.close()
    }
  }

  try {
    const contract = await prisma.contract.create({
      data: {
        name,
        contrepartie: contrepartie || null,
        type: type || 'autre',
        dateSigne: dateSigne ? new Date(dateSigne) : null,
        dateExpiration: dateExpiration ? new Date(dateExpiration) : null,
        dureePreavis: dureePreavis ? Number(dureePreavis) : null,
        statut: statut || 'actif',
        notes: notes || null,
      },
    })
    return NextResponse.json(contract, { status: 201 })
  } catch (error) {
    console.error('Contracts POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
