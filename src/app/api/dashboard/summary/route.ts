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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const now = new Date()
  const selectedMonth = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1))
  const selectedYear  = parseInt(searchParams.get('year')  ?? String(now.getFullYear()))

  const last6Months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(selectedYear, selectedMonth - 1 - i, 1)
    last6Months.push({ month: d.getMonth() + 1, year: d.getFullYear() })
  }

  const prevMonthDate = new Date(selectedYear, selectedMonth - 2, 1)
  const prevMonth = prevMonthDate.getMonth() + 1
  const prevYear  = prevMonthDate.getFullYear()

  if (process.env.TURSO_DATABASE_URL) {
    const { createClient } = require('@libsql/client')
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN || '',
    })
    try {
      const todayStr = now.toISOString()

      const [
        rsCurrentReport,
        rsExpenses,
        rsHistorical,
        rsActiveProps,
        rsUpcomingRelances,
        rsOverdueRelances,
        rsUpcomingLeadRelances,
        rsOverdueLeadRelances,
        rsPrevReport,
        rsAllReports,
      ] = await Promise.all([
        client.execute({
          sql: `SELECT * FROM MonthlyReport WHERE month = ? AND year = ?`,
          args: [selectedMonth, selectedYear],
        }),
        client.execute({
          sql: `SELECT e.* FROM Expense e
                JOIN MonthlyReport r ON r.id = e.reportId
                WHERE r.month = ? AND r.year = ?`,
          args: [selectedMonth, selectedYear],
        }),
        client.execute({
          sql: `SELECT * FROM MonthlyReport WHERE ${last6Months.map(() => '(month = ? AND year = ?)').join(' OR ')}
                ORDER BY year ASC, month ASC`,
          args: last6Months.flatMap(m => [m.month, m.year]),
        }),
        client.execute(`SELECT COUNT(*) as cnt FROM Property WHERE status = 'active'`),
        client.execute({
          sql: `SELECT o.id, o.name, o.phone, o.relanceDate, o.relanceNote
                FROM Owner o WHERE o.relanceDate >= ? ORDER BY o.relanceDate ASC`,
          args: [todayStr],
        }),
        client.execute({
          sql: `SELECT o.id, o.name, o.phone, o.relanceDate, o.relanceNote
                FROM Owner o WHERE o.relanceDate < ? ORDER BY o.relanceDate ASC`,
          args: [todayStr],
        }),
        client.execute({
          sql: `SELECT id, nom, telephone, relanceDate, relanceNote, statut
                FROM Lead WHERE relanceDate >= ? AND statut != 'Mort' ORDER BY relanceDate ASC`,
          args: [todayStr],
        }),
        client.execute({
          sql: `SELECT id, nom, telephone, relanceDate, relanceNote, statut
                FROM Lead WHERE relanceDate < ? AND statut != 'Mort' ORDER BY relanceDate ASC`,
          args: [todayStr],
        }),
        client.execute({
          sql: `SELECT * FROM MonthlyReport WHERE month = ? AND year = ?`,
          args: [prevMonth, prevYear],
        }),
        client.execute(`SELECT month, year FROM MonthlyReport ORDER BY year DESC, month DESC`),
      ])

      const currentReport = toRows(rsCurrentReport)[0] ?? null
      const expenses = toRows(rsExpenses)
      if (currentReport) currentReport.expenses = expenses

      const historicalReports = toRows(rsHistorical)
      const historicalData = last6Months.map((m) => {
        const r = historicalReports.find(h => h.month === m.month && h.year === m.year)
        return {
          month: m.month, year: m.year,
          caBrut:           Number(r?.caBrut ?? 0),
          commissions:      Number(r?.commissions ?? 0),
          netProfit:        Number(r?.netProfit ?? 0),
          activeProperties: Number(r?.activeProperties ?? 0),
          newSignatures:    Number(r?.newSignatures ?? 0),
        }
      })

      const liveActiveProperties = Number(toRows(rsActiveProps)[0]?.cnt ?? 0)
      const activeProperties = currentReport?.activeProperties
        ? Number(currentReport.activeProperties)
        : liveActiveProperties

      const upcomingRelances  = toRows(rsUpcomingRelances).map(o => ({ ...o, properties: [] }))
      const overdueRelances   = toRows(rsOverdueRelances).map(o => ({ ...o, properties: [] }))
      const upcomingLeadRelances = toRows(rsUpcomingLeadRelances)
      const overdueLeadRelances  = toRows(rsOverdueLeadRelances)
      const prevReport = toRows(rsPrevReport)[0] ?? null
      const availableMonths = toRows(rsAllReports).map(r => ({ month: r.month, year: r.year }))

      return NextResponse.json({
        currentMonth: { month: selectedMonth, year: selectedYear, report: currentReport, activeProperties },
        historical: historicalData,
        upcomingRelances, overdueRelances,
        upcomingLeadRelances, overdueLeadRelances,
        prevReport, availableMonths,
      })
    } catch (error) {
      console.error('Dashboard summary Turso error:', error)
      return NextResponse.json({ error: String(error) }, { status: 500 })
    } finally {
      client.close()
    }
  }

  // ── Prisma (dev local) ────────────────────────────────────────────────────
  try {
    const today = new Date()
    const [
      currentReport, historicalReports, liveActiveProperties,
      upcomingRelances, overdueRelances, upcomingLeadRelances, overdueLeadRelances,
      prevReport, allReports,
    ] = await Promise.all([
      prisma.monthlyReport.findUnique({
        where: { month_year: { month: selectedMonth, year: selectedYear } },
        include: { expenses: true, teamGoals: { include: { user: true } } },
      }),
      prisma.monthlyReport.findMany({
        where: { OR: last6Months.map((m) => ({ month: m.month, year: m.year })) },
        orderBy: [{ year: 'asc' }, { month: 'asc' }],
      }),
      prisma.property.count({ where: { status: 'active' } }),
      prisma.owner.findMany({
        where: { relanceDate: { gte: today } },
        include: { properties: { where: { status: 'active' } } },
        orderBy: { relanceDate: 'asc' },
      }),
      prisma.owner.findMany({
        where: { relanceDate: { lt: today } },
        include: { properties: { where: { status: 'active' } } },
        orderBy: { relanceDate: 'asc' },
      }),
      prisma.lead.findMany({
        where: { relanceDate: { gte: today }, statut: { not: 'Mort' } },
        orderBy: { relanceDate: 'asc' },
      }),
      prisma.lead.findMany({
        where: { relanceDate: { lt: today }, statut: { not: 'Mort' } },
        orderBy: { relanceDate: 'asc' },
      }),
      prisma.monthlyReport.findUnique({
        where: { month_year: { month: prevMonth, year: prevYear } },
      }),
      prisma.monthlyReport.findMany({
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        select: { month: true, year: true },
      }),
    ])

    const activeProperties = currentReport?.activeProperties ?? liveActiveProperties
    const historicalData = last6Months.map((m) => {
      const report = historicalReports.find((r) => r.month === m.month && r.year === m.year)
      return {
        month: m.month, year: m.year,
        caBrut:           report?.caBrut ?? 0,
        commissions:      report?.commissions ?? 0,
        netProfit:        report?.netProfit ?? 0,
        activeProperties: report?.activeProperties ?? 0,
        newSignatures:    report?.newSignatures ?? 0,
      }
    })

    return NextResponse.json({
      currentMonth: { month: selectedMonth, year: selectedYear, report: currentReport, activeProperties },
      historical: historicalData,
      upcomingRelances, overdueRelances,
      upcomingLeadRelances, overdueLeadRelances,
      prevReport, availableMonths: allReports,
    })
  } catch (error) {
    console.error('Dashboard summary error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
