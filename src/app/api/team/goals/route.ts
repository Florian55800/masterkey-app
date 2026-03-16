import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      reportId,
      propertiesSigned,
      appointmentsMade,
      personalGoal,
      goalStatus,
    } = body

    // Upsert team goal
    const goal = await prisma.teamGoal.upsert({
      where: {
        userId_reportId: {
          userId: Number(userId),
          reportId: Number(reportId),
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
        reportId: Number(reportId),
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
