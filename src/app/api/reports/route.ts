export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const reports = await prisma.monthlyReport.findMany({
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
      month,
      year,
      caBrut,
      commissions,
      activeProperties,
      totalNights,
      newSignatures,
      lostProperties,
      netProfit,
      notes,
      targetMargin,
    } = body

    const report = await prisma.monthlyReport.create({
      data: {
        month: Number(month),
        year: Number(year),
        caBrut: Number(caBrut) || 0,
        commissions: Number(commissions) || 0,
        activeProperties: Number(activeProperties) || 0,
        totalNights: Number(totalNights) || 0,
        newSignatures: Number(newSignatures) || 0,
        lostProperties: Number(lostProperties) || 0,
        netProfit: Number(netProfit) || 0,
        notes: notes || null,
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
