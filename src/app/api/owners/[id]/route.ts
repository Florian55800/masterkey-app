export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const owner = await prisma.owner.findUnique({
      where: { id: Number(params.id) },
      include: {
        properties: true,
        satisfactions: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (!owner) {
      return NextResponse.json({ error: 'Propriétaire introuvable' }, { status: 404 })
    }

    return NextResponse.json(owner)
  } catch (error) {
    console.error('Owner GET error:', error)
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
      name,
      phone,
      email,
      notes,
      lastContact,
      relanceDate,
      relanceNote,
      source,
      photo,
    } = body

    const owner = await prisma.owner.update({
      where: { id: Number(params.id) },
      data: {
        name: name !== undefined ? name : undefined,
        phone: phone !== undefined ? phone || null : undefined,
        email: email !== undefined ? email || null : undefined,
        notes: notes !== undefined ? notes || null : undefined,
        lastContact: lastContact !== undefined ? (lastContact ? new Date(lastContact) : null) : undefined,
        relanceDate: relanceDate !== undefined ? (relanceDate ? new Date(relanceDate) : null) : undefined,
        relanceNote: relanceNote !== undefined ? relanceNote || null : undefined,
        source: source !== undefined ? source || null : undefined,
        photo: photo !== undefined ? photo || null : undefined,
      },
      include: { properties: true, satisfactions: true },
    })

    return NextResponse.json(owner)
  } catch (error) {
    console.error('Owner PUT error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.owner.delete({
      where: { id: Number(params.id) },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Owner DELETE error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
