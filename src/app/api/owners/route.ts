export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Sequential queries — parallel Promise.all causes libsql to batch over WebSocket → hang
    const owners = await prisma.owner.findMany({ orderBy: { name: 'asc' } })
    const properties = await prisma.property.findMany({ orderBy: { createdAt: 'desc' } })
    const satisfactions = await prisma.satisfactionScore.findMany({ orderBy: { createdAt: 'desc' } })

    const propsMap = new Map<number, typeof properties>()
    for (const p of properties) {
      if (!propsMap.has(p.ownerId)) propsMap.set(p.ownerId, [])
      propsMap.get(p.ownerId)!.push(p)
    }

    const satMap = new Map<number, typeof satisfactions>()
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
