export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    type OwnerRow = {
      id: number; name: string; phone: string | null; email: string | null
      notes: string | null; photo: string | null; lastContact: string | null
      relanceDate: string | null; relanceNote: string | null; source: string | null
      createdAt: string; updatedAt: string
    }
    type PropRow = {
      id: number; name: string; address: string; city: string; type: string
      typeGestion: string; ownerId: number; commissionRate: number
      dateSigned: string; dateLost: string | null; status: string
      photo: string | null; createdAt: string
    }
    type SatRow = { id: number; ownerId: number; score: number; quarter: number; year: number; createdAt: string }

    const owners = await prisma.$queryRaw<OwnerRow[]>`SELECT id, name, phone, email, notes, photo, lastContact, relanceDate, relanceNote, source, createdAt, updatedAt FROM Owner ORDER BY name ASC`
    const properties = await prisma.$queryRaw<PropRow[]>`SELECT id, name, address, city, type, typeGestion, ownerId, commissionRate, dateSigned, dateLost, status, photo, createdAt FROM Property ORDER BY createdAt DESC`
    const satisfactions = await prisma.$queryRaw<SatRow[]>`SELECT id, ownerId, score, quarter, year, createdAt FROM SatisfactionScore ORDER BY createdAt DESC`

    const propsMap = new Map<number, PropRow[]>()
    for (const p of properties) {
      if (!propsMap.has(p.ownerId)) propsMap.set(p.ownerId, [])
      propsMap.get(p.ownerId)!.push(p)
    }
    const satMap = new Map<number, SatRow[]>()
    for (const s of satisfactions) {
      if (!satMap.has(s.ownerId)) satMap.set(s.ownerId, [])
      satMap.get(s.ownerId)!.push(s)
    }

    const result = owners.map((o) => ({
      ...o,
      properties: propsMap.get(o.id) ?? [],
      satisfactions: satMap.get(o.id) ?? [],
    }))

    return NextResponse.json(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Owners GET error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
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
