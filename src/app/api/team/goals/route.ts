export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      month,
      year,
      propertiesSigned,
      appointmentsMade,
      personalGoal,
      goalStatus,
    } = body

    // Find or create the MonthlyReport for this period
    let report = await prisma.monthlyReport.findUnique({
      where: { month_year: { month: Number(month), year: Number(year) } },
    })
    if (!report) {
      report = await prisma.monthlyReport.create({
        data: {
          month: Number(month),
          year: Number(year),
          caBrut: 0,
          commissions: 0,
          activeProperties: 0,
          totalNights: 0,
          newSignatures: 0,
          lostProperties: 0,
          netProfit: 0,
        },
      })
    }

    // Upsert team goal
    const goal = await prisma.teamGoal.upsert({
      where: {
        userId_reportId: {
          userId: Number(userId),
          reportId: report.id,
        },
      },
      update: {
        propertiesSigned: propertiesSigned !== undefined ? Number(propertiesSigned) : undefined,
        appointmentsMade: appointmentsMade !== undefined ? Number(appointmentsMade) : undefined,
        personalGoal: personalGoal !== undefined ? personalGoal : undefined,
        goalStatus: goalStatus !== undefined ? goalStatus : undefined,
      },
      create: {
        userId: Number(userId),
        reportId: report.id,
        propertiesSigned: Number(propertiesSigned) || 0,
        appointmentsMade: Number(appointmentsMade) || 0,
        personalGoal: personalGoal || null,
        goalStatus: goalStatus || 'en_cours',
      },
      include: { user: true, report: true },
    })

    return NextResponse.json(goal)
  } catch (error) {
    console.error('Team goal POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
