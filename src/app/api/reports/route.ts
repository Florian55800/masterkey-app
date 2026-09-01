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

let migrationDone = false
async function runMigration(client: any) {
  if (migrationDone) return
  try { await client.execute({ sql: `ALTER TABLE MonthlyReport ADD COLUMN caBrutHT REAL DEFAULT 0`, args: [] }) } catch {}
  try { await client.execute({ sql: `ALTER TABLE MonthlyReport ADD COLUMN commissionsHT REAL DEFAULT 0`, args: [] }) } catch {}
  migrationDone = true
}

export async function GET() {
  if (process.env.TURSO_DATABASE_URL) {
    const { createClient } = require('@libsql/client')
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN || '',
    })
    try {
      await runMigration(client)

      // ── 1 query : all reports ─────────────────────────────────────────────
      const rsReports = await client.execute(
        `SELECT id, month, year, caBrut, COALESCE(caBrutHT, 0) as caBrutHT,
                commissions, COALESCE(commissionsHT, 0) as commissionsHT,
                activeProperties, totalNights,
                newSignatures, lostProperties, netProfit, notes, targetMargin, isPlaceholder,
                createdAt, updatedAt
         FROM MonthlyReport
         WHERE isPlaceholder = 0
         ORDER BY year DESC, month DESC`
      )
      const reports = toRows(rsReports)

      let withExpenses: any[]
      if (reports.length === 0) {
        withExpenses = []
      } else {
        // ── 1 query : all expenses for all reports ────────────────────────
        const reportIds = reports.map(r => r.id as number)
        const ph = reportIds.map(() => '?').join(',')
        const rsExp = await client.execute({
          sql: `SELECT id, reportId, category, description, amount, isRecurring, payDate, paymentDay, createdAt
                FROM Expense WHERE reportId IN (${ph}) ORDER BY createdAt ASC`,
          args: reportIds,
        })
        const expByReport = new Map<number, any[]>()
        for (const e of toRows(rsExp)) {
          const rid = Number(e.reportId)
          if (!expByReport.has(rid)) expByReport.set(rid, [])
          expByReport.get(rid)!.push(e)
        }
        withExpenses = reports.map(r => ({ ...r, expenses: expByReport.get(Number(r.id)) ?? [], teamGoals: [] }))
      }

      return NextResponse.json(withExpenses)
    } catch (error) {
      console.error('Reports GET Turso error:', error)
      return NextResponse.json({ error: String(error) }, { status: 500 })
    } finally {
      client.close()
    }
  }

  try {
    const reports = await prisma.monthlyReport.findMany({
      where: { isPlaceholder: false },
      include: {
        expenses: true,
        teamGoals: { include: { user: true } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })
    return NextResponse.json(reports)
  } catch (error) {
    console.error('Reports GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      month, year, caBrut, caBrutHT, commissions, commissionsHT, activeProperties,
      totalNights, newSignatures, lostProperties, netProfit, notes, targetMargin,
    } = body

    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN || '',
      })
      try {
        await runMigration(client)
        // Vérifier si le rapport existe déjà
        const existing = await client.execute({
          sql: `SELECT id FROM MonthlyReport WHERE month = ? AND year = ?`,
          args: [Number(month), Number(year)],
        })
        if (toRows(existing).length > 0) {
          return NextResponse.json({ error: 'Un rapport existe déjà pour ce mois' }, { status: 409 })
        }
        const rs = await client.execute({
          sql: `INSERT INTO MonthlyReport (month, year, caBrut, caBrutHT, commissions, commissionsHT,
                  activeProperties, totalNights, newSignatures, lostProperties, netProfit,
                  notes, targetMargin, isPlaceholder, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))
                RETURNING *`,
          args: [
            Number(month), Number(year),
            Number(caBrut) || 0, Number(caBrutHT) || 0,
            Number(commissions) || 0, Number(commissionsHT) || 0,
            Number(activeProperties) || 0, Number(totalNights) || 0,
            Number(newSignatures) || 0, Number(lostProperties) || 0,
            Number(netProfit) || 0,
            notes || null,
            targetMargin ? Number(targetMargin) : null,
          ],
        })
        return NextResponse.json(toRows(rs)[0], { status: 201 })
      } finally {
        client.close()
      }
    }

    const report = await prisma.monthlyReport.create({
      data: {
        month: Number(month), year: Number(year),
        caBrut: Number(caBrut) || 0, commissions: Number(commissions) || 0,
        activeProperties: Number(activeProperties) || 0, totalNights: Number(totalNights) || 0,
        newSignatures: Number(newSignatures) || 0, lostProperties: Number(lostProperties) || 0,
        netProfit: Number(netProfit) || 0, notes: notes || null,
        targetMargin: targetMargin ? Number(targetMargin) : null,
      },
    })
    return NextResponse.json(report, { status: 201 })
  } catch (error: unknown) {
    console.error('Report POST error:', error)
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Un rapport existe déjà pour ce mois' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
