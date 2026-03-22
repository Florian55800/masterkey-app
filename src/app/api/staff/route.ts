export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const staff = await prisma.staff.findMany({
      include: {
        properties: {
          where: { status: 'active' },
          select: { id: true, name: true, city: true },
        },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(staff)
  } catch (error) {
    console.error('Staff GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, phone, email, role, notes } = await req.json()
    const member = await prisma.staff.create({
      data: { name, phone: phone || null, email: email || null, role: role || 'ménage', notes: notes || null },
      include: { properties: { where: { status: 'active' }, select: { id: true, name: true, city: true } } },
    })
    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    console.error('Staff POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
