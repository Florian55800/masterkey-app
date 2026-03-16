import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const report = await prisma.monthlyReport.findUnique({
      where: { id: Number(params.id) },
      include: {
        expenses: { orderBy: { createdAt: 'asc' } },
        teamGoals: { include: { user: true } },
      },
    })

    if (!report) {
      return NextResponse.json({ error: 'Rapport introuvable' }, { status: 404 })
    }

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
  try {
    const body = await request.json()
    const {
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

    const report = await prisma.monthlyReport.update({
      where: { id: Number(params.id) },
      data: {
        caBrut: caBrut !== undefined ? Number(caBrut) : undefined,
        commissions: commissions !== undefined ? Number(commissions) : undefined,
        activeProperties: activeProperties !== undefined ? Number(activeProperties) : undefined,
        totalNights: totalNights !== undefined ? Number(totalNights) : undefined,
        newSignatures: newSignatures !== undefined ? Number(newSignatures) : undefined,
        lostProperties: lostProperties !== undefined ? Number(lostProperties) : undefined,
        netProfit: netProfit !== undefined ? Number(netProfit) : undefined,
        notes: notes !== undefined ? notes : undefined,
        targetMargin: targetMargin !== undefined ? Number(targetMargin) : undefined,
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
  try {
    await prisma.monthlyReport.delete({
      where: { id: Number(params.id) },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Report DELETE error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
