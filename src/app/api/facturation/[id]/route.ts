export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { platformAmount, cleaningFees, commissionRate, notes } = body

    const revenue = await prisma.propertyRevenue.update({
      where: { id: Number(params.id) },
      data: {
        platformAmount: Number(platformAmount) || 0,
        cleaningFees: Number(cleaningFees) || 0,
        commissionRate: Number(commissionRate) || 0,
        notes: notes ?? null,
      },
    })

    return NextResponse.json(revenue)
  } catch (error) {
    console.error('Facturation PUT error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.propertyRevenue.delete({ where: { id: Number(params.id) } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Facturation DELETE error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
