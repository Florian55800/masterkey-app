export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const properties = await prisma.property.findMany({
      include: { owner: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(properties)
  } catch (error) {
    console.error('Properties GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, address, city, type, ownerId, commissionRate, dateSigned, photo } = body

    const property = await prisma.property.create({
      data: {
        name,
        address,
        city,
        type,
        ownerId: Number(ownerId),
        commissionRate: Number(commissionRate),
        dateSigned: new Date(dateSigned),
        status: 'active',
        photo: photo || null,
      },
      include: { owner: true },
    })

    return NextResponse.json(property, { status: 201 })
  } catch (error) {
    console.error('Property POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
