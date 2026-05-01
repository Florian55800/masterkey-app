export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Colonnes sûres — exclut nbSejours/nbNuits qui peuvent manquer sur les anciennes BDs
const SAFE_REVENUE_SELECT = {
  id: true, propertyId: true, month: true, year: true,
  platform: true, platformAmount: true, cleaningFees: true,
  commissionRate: true, notes: true, createdAt: true, updatedAt: true,
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const month = parseInt(searchParams.get('month') ?? '0')
    const year  = parseInt(searchParams.get('year')  ?? '0')

    const revenueFilter = month && year
      ? { where: { month, year }, select: SAFE_REVENUE_SELECT }
      : { orderBy: [{ year: 'desc' as const }, { month: 'desc' as const }], take: 50, select: SAFE_REVENUE_SELECT }

    const properties = await prisma.property.findMany({
      where: { typeGestion: 'conciergerie' },
      include: {
        owner: { select: { id: true, name: true } },
        revenues: revenueFilter,
      },
      orderBy: { name: 'asc' },
    })

    // Assure nbSejours/nbNuits = 0 même si les colonnes n'existent pas encore en BD
    return NextResponse.json(properties.map(p => ({
      ...p,
      revenues: p.revenues.map(r => ({
        ...r,
        nbSejours: (r as any).nbSejours ?? 0,
        nbNuits:   (r as any).nbNuits   ?? 0,
      })),
    })))
  } catch (error) {
    console.error('Facturation GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { propertyId, month, year, platform, platformAmount, cleaningFees, commissionRate, notes } = body

    const key = {
      propertyId_month_year_platform: {
        propertyId: Number(propertyId), month: Number(month),
        year: Number(year), platform: String(platform),
      },
    }
    const base = {
      platformAmount: Number(platformAmount) || 0,
      cleaningFees:   Number(cleaningFees)   || 0,
      commissionRate: Number(commissionRate) || 0,
      notes:          notes ?? null,
    }

    let revenue: any
    try {
      // Essai avec nbSejours/nbNuits (colonnes présentes après migration)
      revenue = await prisma.propertyRevenue.upsert({
        where: key,
        update: { ...base, nbSejours: Number(body.nbSejours) || 0, nbNuits: Number(body.nbNuits) || 0 },
        create: { propertyId: Number(propertyId), month: Number(month), year: Number(year), platform: String(platform), ...base, nbSejours: Number(body.nbSejours) || 0, nbNuits: Number(body.nbNuits) || 0 },
      })
    } catch {
      // Fallback sans les colonnes (avant migration)
      revenue = await (prisma as any).propertyRevenue.upsert({
        where: key,
        update: base,
        create: { propertyId: Number(propertyId), month: Number(month), year: Number(year), platform: String(platform), ...base },
      })
    }

    return NextResponse.json({ ...revenue, nbSejours: revenue.nbSejours ?? 0, nbNuits: revenue.nbNuits ?? 0 })
  } catch (error) {
    console.error('Facturation POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
