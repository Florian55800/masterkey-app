export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    const users = await prisma.user.findMany({
      include: {
        teamGoals: {
          include: { report: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { id: 'asc' },
    })

    // Get or compute current month report
    const currentReport = await prisma.monthlyReport.findUnique({
      where: { month_year: { month: currentMonth, year: currentYear } },
      include: {
        teamGoals: {
          include: { user: true },
        },
      },
    })

    // Compute cumulative stats for each user
    const usersWithStats = users.map((user) => {
      const totalSigned = user.teamGoals.reduce((sum, g) => sum + g.propertiesSigned, 0)
      const totalAppointments = user.teamGoals.reduce((sum, g) => sum + g.appointmentsMade, 0)
      const totalCalls = user.teamGoals.reduce((sum, g) => sum + (g.callsMade ?? 0), 0)
      const goalsAchieved = user.teamGoals.filter((g) => g.goalStatus === 'atteint').length
      const currentGoal = user.teamGoals.find(
        (g) => g.report.month === currentMonth && g.report.year === currentYear
      )
      return {
        id: user.id,
        name: user.name,
        color: user.color,
        photo: user.photo ?? null,
        totalSigned,
        totalAppointments,
        totalCalls,
        goalsAchieved,
        currentGoal: currentGoal || null,
      }
    })

    return NextResponse.json({ users: usersWithStats, currentReport })
  } catch (error) {
    console.error('Team GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
