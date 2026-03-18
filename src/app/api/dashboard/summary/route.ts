export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const now = new Date()
    const selectedMonth = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1))
    const selectedYear = parseInt(searchParams.get('year') ?? String(now.getFullYear()))

    // Get selected month report
    const currentReport = await prisma.monthlyReport.findUnique({
      where: { month_year: { month: selectedMonth, year: selectedYear } },
      include: { expenses: true, teamGoals: { include: { user: true } } },
    })

    // Get last 6 months relative to selected month
    const last6Months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(selectedYear, selectedMonth - 1 - i, 1)
      last6Months.push({ month: d.getMonth() + 1, year: d.getFullYear() })
    }

    const historicalReports = await prisma.monthlyReport.findMany({
      where: { OR: last6Months.map((m) => ({ month: m.month, year: m.year })) },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    })

    // Active properties count
    const activeProperties = await prisma.property.count({ where: { status: 'active' } })

    // Relances (always based on today)
    const today = new Date()
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const upcomingRelances = await prisma.owner.findMany({
      where: { relanceDate: { gte: today, lte: nextWeek } },
      include: { properties: { where: { status: 'active' } } },
      orderBy: { relanceDate: 'asc' },
    })
    const overdueRelances = await prisma.owner.findMany({
      where: { relanceDate: { lt: today } },
      include: { properties: { where: { status: 'active' } } },
      orderBy: { relanceDate: 'asc' },
    })

    // Previous month for comparison
    const prevMonthDate = new Date(selectedYear, selectedMonth - 2, 1)
    const prevReport = await prisma.monthlyReport.findUnique({
      where: { month_year: { month: prevMonthDate.getMonth() + 1, year: prevMonthDate.getFullYear() } },
    })

    const historicalData = last6Months.map((m) => {
      const report = historicalReports.find((r) => r.month === m.month && r.year === m.year)
      return {
        month: m.month,
        year: m.year,
        caBrut: report?.caBrut ?? 0,
        commissions: report?.commissions ?? 0,
        netProfit: report?.netProfit ?? 0,
        activeProperties: report?.activeProperties ?? 0,
        newSignatures: report?.newSignatures ?? 0,
      }
    })

    // All reports for month picker (all years)
    const allReports = await prisma.monthlyReport.findMany({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      select: { month: true, year: true },
    })

    return NextResponse.json({
      currentMonth: {
        month: selectedMonth,
        year: selectedYear,
        report: currentReport,
        activeProperties,
      },
      historical: historicalData,
      upcomingRelances,
      overdueRelances,
      prevReport,
      availableMonths: allReports,
    })
  } catch (error) {
    console.error('Dashboard summary error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
