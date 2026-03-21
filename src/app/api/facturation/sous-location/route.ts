export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const month = parseInt(searchParams.get('month') ?? '0')
    const year = parseInt(searchParams.get('year') ?? '0')

    const properties = await prisma.property.findMany({
      where: { typeGestion: 'sous-location' },
      include: {
        owner: { select: { id: true, name: true } },
        revenues: month && year
          ? { where: { month, year } }
          : { orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 50 },
        subletExpenses: month && year
          ? { where: { month, year } }
          : { orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 12 },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(properties)
  } catch (error) {
    console.error('Sous-location GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { propertyId, month, year, loyer, electricite, wifi, autresCharges, nbSejours, nbNuits, notes } = body

    const expense = await prisma.subletExpense.upsert({
      where: {
        propertyId_month_year: {
          propertyId: Number(propertyId),
          month: Number(month),
          year: Number(year),
        },
      },
      update: {
        loyer: Number(loyer) || 0,
        electricite: Number(electricite) || 0,
        wifi: Number(wifi) || 0,
        autresCharges: Number(autresCharges) || 0,
        nbSejours: Number(nbSejours) || 0,
        nbNuits: Number(nbNuits) || 0,
        notes: notes ?? null,
      },
      create: {
        propertyId: Number(propertyId),
        month: Number(month),
        year: Number(year),
        loyer: Number(loyer) || 0,
        electricite: Number(electricite) || 0,
        wifi: Number(wifi) || 0,
        autresCharges: Number(autresCharges) || 0,
        nbSejours: Number(nbSejours) || 0,
        nbNuits: Number(nbNuits) || 0,
        notes: notes ?? null,
      },
    })

    return NextResponse.json(expense)
  } catch (error) {
    console.error('Sous-location POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
