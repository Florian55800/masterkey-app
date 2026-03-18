export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, address, city, type, typeGestion, ownerId, commissionRate, dateSigned, status, photo } = body

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
    // Soft delete - mark as inactive
    const property = await prisma.property.update({
      where: { id: Number(params.id) },
      data: {
        status: 'inactive',
        dateLost: new Date(),
      },
    })
    return NextResponse.json(property)
  } catch (error) {
    console.error('Property DELETE error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
