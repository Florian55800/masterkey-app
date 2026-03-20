export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate()
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const property = await prisma.property.findUnique({
      where: { id: Number(params.id) },
      include: {
        owner: true,
        revenues: { orderBy: [{ year: 'asc' }, { month: 'asc' }, { platform: 'asc' }] },
      },
    })
    if (!property) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    // Build monthly aggregated stats
    const monthMap = new Map<string, {
      month: number; year: number
      totalGross: number; totalCleaning: number; totalNet: number
      totalPartMK: number; totalPartProprio: number
      nbSejours: number; nbNuits: number
    }>()

    for (const r of property.revenues) {
      const key = `${r.year}-${String(r.month).padStart(2, '0')}`
      if (!monthMap.has(key)) {
        monthMap.set(key, {
          month: r.month, year: r.year,
          totalGross: 0, totalCleaning: 0, totalNet: 0,
          totalPartMK: 0, totalPartProprio: 0,
          nbSejours: 0, nbNuits: 0,
        })
      }
      const m = monthMap.get(key)!
      const base = r.platformAmount - r.cleaningFees
      const partMK = base * (r.commissionRate / 100)
      m.totalGross    += r.platformAmount
      m.totalCleaning += r.cleaningFees
      m.totalNet      += base
      m.totalPartMK   += partMK
      m.totalPartProprio += base - partMK
      m.nbSejours     += r.nbSejours ?? 0
      m.nbNuits       += r.nbNuits ?? 0
    }

    const MONTHS_FR = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

    const monthlyStats = Array.from(monthMap.values())
      .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
      .map(m => {
        const days = getDaysInMonth(m.month, m.year)
        const tauxOccupation = m.nbNuits > 0 ? Math.round((m.nbNuits / days) * 100) : 0
        const prixMoyenNuit  = m.nbNuits > 0 ? m.totalNet / m.nbNuits : null
        return {
          ...m,
          label: `${MONTHS_FR[m.month]} ${m.year}`,
          daysInMonth: days,
          tauxOccupation,
          prixMoyenNuit,
        }
      })

    return NextResponse.json({
      id: property.id,
      name: property.name,
      address: property.address,
      city: property.city,
      type: property.type,
      typeGestion: property.typeGestion,
      commissionRate: property.commissionRate,
      description: property.description ?? '',
      photo: property.photo,
      dateSigned: property.dateSigned,
      status: property.status,
      owner: property.owner,
      monthlyStats,
    })
  } catch (error) {
    console.error('Property GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, address, city, type, typeGestion, ownerId, commissionRate, dateSigned, status, photo, description } = body

    const property = await prisma.property.update({
      where: { id: Number(params.id) },
      data: {
        name: name !== undefined ? name : undefined,
        address: address !== undefined ? address : undefined,
        city: city !== undefined ? city : undefined,
        type: type !== undefined ? type : undefined,
        typeGestion: typeGestion !== undefined ? typeGestion : undefined,
        ownerId: ownerId !== undefined ? Number(ownerId) : undefined,
        commissionRate: commissionRate !== undefined ? Number(commissionRate) : undefined,
        dateSigned: dateSigned !== undefined ? new Date(dateSigned) : undefined,
        status: status !== undefined ? status : undefined,
        photo: photo !== undefined ? photo || null : undefined,
        description: description !== undefined ? description || null : undefined,
      },
      include: { owner: true },
    })

    return NextResponse.json(property)
  } catch (error) {
    console.error('Property PUT error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const property = await prisma.property.update({
      where: { id: Number(params.id) },
      data: { status: 'inactive', dateLost: new Date() },
    })
    return NextResponse.json(property)
  } catch (error) {
    console.error('Property DELETE error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
