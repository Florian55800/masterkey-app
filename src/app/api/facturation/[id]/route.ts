export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const base = {
      platformAmount: Number(body.platformAmount) || 0,
      cleaningFees:   Number(body.cleaningFees)   || 0,
      commissionRate: Number(body.commissionRate) || 0,
      notes:          body.notes ?? null,
    }

    let revenue: any
    try {
      revenue = await prisma.propertyRevenue.update({
        where: { id: Number(params.id) },
        data: {
          ...base,
          nbSejours: body.nbSejours !== undefined ? Number(body.nbSejours) : undefined,
          nbNuits:   body.nbNuits   !== undefined ? Number(body.nbNuits)   : undefined,
        },
      })
    } catch {
      // Fallback sans les colonnes nbSejours/nbNuits (avant migration)
      revenue = await prisma.propertyRevenue.update({
        where: { id: Number(params.id) },
        data: base,
      })
    }

    return NextResponse.json({ ...revenue, nbSejours: revenue.nbSejours ?? 0, nbNuits: revenue.nbNuits ?? 0 })
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
