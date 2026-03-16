import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const owners = await prisma.owner.findMany({
      include: {
        properties: true,
        satisfactions: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(owners)
  } catch (error) {
    console.error('Owners GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    const owner = await prisma.owner.create({
      data: {
        name,
        phone: phone || null,
        email: email || null,
        notes: notes || null,
        lastContact: lastContact ? new Date(lastContact) : null,
        relanceDate: relanceDate ? new Date(relanceDate) : null,
        relanceNote: relanceNote || null,
        source: source || null,
        photo: photo || null,
      },
      include: { properties: true, satisfactions: true },
    })

    return NextResponse.json(owner, { status: 201 })
  } catch (error) {
    console.error('Owner POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
