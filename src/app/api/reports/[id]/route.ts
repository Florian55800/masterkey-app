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

export async function GET(
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
      const [rsReport, rsExp] = await Promise.all([
        client.execute({
          sql: `SELECT *, COALESCE(caBrutHT, 0) as caBrutHT, COALESCE(commissionsHT, 0) as commissionsHT
                FROM MonthlyReport WHERE id = ?`,
          args: [id],
        }),
        client.execute({ sql: `SELECT * FROM Expense WHERE reportId = ? ORDER BY createdAt ASC`, args: [id] }),
      ])
      const rows = toRows(rsReport)
      if (rows.length === 0) return NextResponse.json({ error: 'Rapport introuvable' }, { status: 404 })
      return NextResponse.json({ ...rows[0], expenses: toRows(rsExp), teamGoals: [] })
    } finally {
      client.close()
    }
  }

  try {
    const report = await prisma.monthlyReport.findUnique({
      where: { id },
      include: { expenses: { orderBy: { createdAt: 'asc' } }, teamGoals: { include: { user: true } } },
    })
    if (!report) return NextResponse.json({ error: 'Rapport introuvable' }, { status: 404 })
    return NextResponse.json(report)
  } catch (error) {
    console.error('Report GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id)
  const body = await request.json()
  const { caBrut, caBrutHT, commissions, commissionsHT, activeProperties, totalNights, newSignatures, lostProperties, netProfit, notes, targetMargin } = body

  if (process.env.TURSO_DATABASE_URL) {
    const { createClient } = require('@libsql/client')
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN || '',
    })
    try {
      const sets: string[] = ['updatedAt = datetime(\'now\')']
      const args: unknown[] = []
      if (caBrut !== undefined)           { sets.push('caBrut = ?');           args.push(Number(caBrut)) }
      if (caBrutHT !== undefined)         { sets.push('caBrutHT = ?');         args.push(Number(caBrutHT) || 0) }
      if (commissions !== undefined)      { sets.push('commissions = ?');      args.push(Number(commissions)) }
      if (commissionsHT !== undefined)    { sets.push('commissionsHT = ?');    args.push(Number(commissionsHT) || 0) }
      if (activeProperties !== undefined) { sets.push('activeProperties = ?'); args.push(Number(activeProperties)) }
      if (totalNights !== undefined)      { sets.push('totalNights = ?');      args.push(Number(totalNights)) }
      if (newSignatures !== undefined)    { sets.push('newSignatures = ?');    args.push(Number(newSignatures)) }
      if (lostProperties !== undefined)   { sets.push('lostProperties = ?');   args.push(Number(lostProperties)) }
      if (netProfit !== undefined)        { sets.push('netProfit = ?');        args.push(Number(netProfit)) }
      if (notes !== undefined)            { sets.push('notes = ?');            args.push(notes) }
      if (targetMargin !== undefined)     { sets.push('targetMargin = ?');     args.push(targetMargin !== null ? Number(targetMargin) : null) }
      args.push(id)
      await client.execute({ sql: `UPDATE MonthlyReport SET ${sets.join(', ')} WHERE id = ?`, args })
      const rs = await client.execute({
        sql: `SELECT *, COALESCE(caBrutHT, 0) as caBrutHT, COALESCE(commissionsHT, 0) as commissionsHT
              FROM MonthlyReport WHERE id = ?`,
        args: [id],
      })
      const rows = toRows(rs)
      if (rows.length === 0) return NextResponse.json({ error: 'Rapport introuvable' }, { status: 404 })
      return NextResponse.json(rows[0])
    } finally {
      client.close()
    }
  }

  try {
    const report = await prisma.monthlyReport.update({
      where: { id },
      data: {
        caBrut:           caBrut !== undefined ? Number(caBrut) : undefined,
        commissions:      commissions !== undefined ? Number(commissions) : undefined,
        activeProperties: activeProperties !== undefined ? Number(activeProperties) : undefined,
        totalNights:      totalNights !== undefined ? Number(totalNights) : undefined,
        newSignatures:    newSignatures !== undefined ? Number(newSignatures) : undefined,
        lostProperties:   lostProperties !== undefined ? Number(lostProperties) : undefined,
        netProfit:        netProfit !== undefined ? Number(netProfit) : undefined,
        notes:            notes !== undefined ? notes : undefined,
        targetMargin:     targetMargin !== undefined ? Number(targetMargin) : undefined,
      },
    })
    return NextResponse.json(report)
  } catch (error) {
    console.error('Report PUT error:', error)
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
      await client.execute({ sql: `DELETE FROM MonthlyReport WHERE id = ?`, args: [id] })
      return NextResponse.json({ success: true })
    } finally {
      client.close()
    }
  }

  try {
    await prisma.monthlyReport.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Report DELETE error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
