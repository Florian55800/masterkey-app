export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const month = parseInt(searchParams.get('month') ?? '0')
    const year = parseInt(searchParams.get('year') ?? '0')

    const properties = await prisma.property.findMany({
      where: { typeGestion: 'conciergerie' },
      include: {
        owner: { select: { id: true, name: true } },
        revenues: month && year
          ? { where: { month, year } }
          : { orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 50 },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(properties)
  } catch (error) {
    console.error('Facturation GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { propertyId, month, year, platform, platformAmount, cleaningFees, commissionRate, notes } = body

    const revenue = await prisma.propertyRevenue.upsert({
      where: {
        propertyId_month_year_platform: {
          propertyId: Number(propertyId),
          month: Number(month),
          year: Number(year),
          platform: String(platform),
        },
      },
      update: {
        platformAmount: Number(platformAmount) || 0,
        cleaningFees: Number(cleaningFees) || 0,
        commissionRate: Number(commissionRate) || 0,
        notes: notes ?? null,
        nbSejours: Number(body.nbSejours) || 0,
        nbNuits:   Number(body.nbNuits)   || 0,
      },
      create: {
        propertyId: Number(propertyId),
        month: Number(month),
        year: Number(year),
        platform: String(platform),
        platformAmount: Number(platformAmount) || 0,
        cleaningFees: Number(cleaningFees) || 0,
        commissionRate: Number(commissionRate) || 0,
        notes: notes ?? null,
        nbSejours: Number(body.nbSejours) || 0,
        nbNuits:   Number(body.nbNuits)   || 0,
      },
    })

    return NextResponse.json(revenue)
  } catch (error) {
    console.error('Facturation POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
