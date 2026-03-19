export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { loyer, electricite, wifi, autresCharges, notes } = body

    const expense = await prisma.subletExpense.update({
      where: { id: Number(params.id) },
      data: {
        loyer: Number(loyer) || 0,
        electricite: Number(electricite) || 0,
        wifi: Number(wifi) || 0,
        autresCharges: Number(autresCharges) || 0,
        notes: notes ?? null,
      },
    })

    return NextResponse.json(expense)
  } catch (error) {
    console.error('Sous-location PUT error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.subletExpense.delete({ where: { id: Number(params.id) } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Sous-location DELETE error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
