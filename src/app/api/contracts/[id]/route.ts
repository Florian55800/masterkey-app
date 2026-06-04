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
  const { name, contrepartie, type, dateSigne, dateExpiration, dureePreavis, statut, notes } = body

  if (process.env.TURSO_DATABASE_URL) {
    const { createClient } = require('@libsql/client')
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN || '',
    })
    try {
      const sets: string[] = ["updatedAt = datetime('now')"]
      const args: unknown[] = []
      if (name !== undefined)           { sets.push('name = ?');           args.push(name) }
      if (contrepartie !== undefined)   { sets.push('contrepartie = ?');   args.push(contrepartie || null) }
      if (type !== undefined)           { sets.push('type = ?');           args.push(type) }
      if (dateSigne !== undefined)      { sets.push('dateSigne = ?');      args.push(dateSigne || null) }
      if (dateExpiration !== undefined) { sets.push('dateExpiration = ?'); args.push(dateExpiration || null) }
      if (dureePreavis !== undefined)   { sets.push('dureePreavis = ?');   args.push(dureePreavis ? Number(dureePreavis) : null) }
      if (statut !== undefined)         { sets.push('statut = ?');         args.push(statut) }
      if (notes !== undefined)          { sets.push('notes = ?');          args.push(notes || null) }
      args.push(id)
      await client.execute({ sql: `UPDATE Contract SET ${sets.join(', ')} WHERE id = ?`, args })
      const rs = await client.execute({ sql: `SELECT * FROM Contract WHERE id = ?`, args: [id] })
      const rows = toRows(rs)
      if (rows.length === 0) return NextResponse.json({ error: 'Contrat introuvable' }, { status: 404 })
      return NextResponse.json(rows[0])
    } catch (error) {
      console.error('Contracts PUT Turso error:', error)
      return NextResponse.json({ error: String(error) }, { status: 500 })
    } finally {
      client.close()
    }
  }

  try {
    const contract = await prisma.contract.update({
      where: { id },
      data: {
        name:           name !== undefined ? name : undefined,
        contrepartie:   contrepartie !== undefined ? (contrepartie || null) : undefined,
        type:           type !== undefined ? type : undefined,
        dateSigne:      dateSigne !== undefined ? (dateSigne ? new Date(dateSigne) : null) : undefined,
        dateExpiration: dateExpiration !== undefined ? (dateExpiration ? new Date(dateExpiration) : null) : undefined,
        dureePreavis:   dureePreavis !== undefined ? (dureePreavis ? Number(dureePreavis) : null) : undefined,
        statut:         statut !== undefined ? statut : undefined,
        notes:          notes !== undefined ? (notes || null) : undefined,
      },
    })
    return NextResponse.json(contract)
  } catch (error) {
    console.error('Contracts PUT error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
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
      authToken: process.env.TURSO_AUTH_TOKEN || '',
    })
    try {
      await client.execute({ sql: `DELETE FROM Contract WHERE id = ?`, args: [id] })
      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Contracts DELETE Turso error:', error)
      return NextResponse.json({ error: String(error) }, { status: 500 })
    } finally {
      client.close()
    }
  }

  try {
    await prisma.contract.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contracts DELETE error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
