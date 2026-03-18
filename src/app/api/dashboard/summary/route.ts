export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    // Get current month report
    const currentReport = await prisma.monthlyReport.findUnique({
      where: { month_year: { month: currentMonth, year: currentYear } },
      include: { expenses: true, teamGoals: { include: { user: true } } },
    })

    // Get last 6 months of reports
    const last6Months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1)
      last6Months.push({ month: d.getMonth() + 1, year: d.getFullYear() })
    }

    const historicalReports = await prisma.monthlyReport.findMany({
      where: {
        OR: last6Months.map((m) => ({ month: m.month, year: m.year })),
      },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    })

    // Get active properties count
    const activeProperties = await prisma.property.count({
      where: { status: 'active' },
    })

    // Get upcoming relances (next 7 days)
    const today = new Date()
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const upcomingRelances = await prisma.owner.findMany({
      where: {
        relanceDate: {
          gte: today,
          lte: nextWeek,
        },
      },
      include: {
        properties: { where: { status: 'active' } },
      },
      orderBy: { relanceDate: 'asc' },
    })

    // Get overdue relances
    const overdueRelances = await prisma.owner.findMany({
      where: {
        relanceDate: {
          lt: today,
        },
      },
      include: {
        properties: { where: { status: 'active' } },
      },
      orderBy: { relanceDate: 'asc' },
    })

    // Previous month for comparison
    const prevMonthDate = new Date(currentYear, currentMonth - 2, 1)
    const prevReport = await prisma.monthlyReport.findUnique({
      where: {
        month_year: {
          month: prevMonthDate.getMonth() + 1,
          year: prevMonthDate.getFullYear(),
        },
      },
    })

    // Build historical data array with proper ordering
    const historicalData = last6Months.map((m) => {
      const report = historicalReports.find(
        (r) => r.month === m.month && r.year === m.year
      )
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

    // All 12 months of current year for overview
    const allYearReports = await prisma.monthlyReport.findMany({
      where: { year: currentYear },
      orderBy: { month: 'asc' },
    })

    const yearOverview = allYearReports.map((report) => ({
      month: report.month,
      year: currentYear,
      hasReport: true,
      caBrut: report.caBrut,
      commissions: report.commissions,
      netProfit: report.netProfit,
      newSignatures: report.newSignatures,
      activeProperties: report.activeProperties,
      totalNights: report.totalNights,
      notes: report.notes,
    }))

    return NextResponse.json({
      currentMonth: {
        month: currentMonth,
        year: currentYear,
        report: currentReport,
        activeProperties,
      },
      historical: historicalData,
      upcomingRelances,
      overdueRelances,
      prevReport,
      yearOverview,
    })
  } catch (error) {
    console.error('Dashboard summary error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
