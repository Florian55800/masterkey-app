export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { name, phone, email, role, notes } = await req.json()
    const member = await prisma.staff.update({
      where: { id: Number(params.id) },
      data: {
        name: name ?? undefined,
        phone: phone !== undefined ? phone || null : undefined,
        email: email !== undefined ? email || null : undefined,
        role: role ?? undefined,
        notes: notes !== undefined ? notes || null : undefined,
      },
      include: { properties: { where: { status: 'active' }, select: { id: true, name: true, city: true } } },
    })
    return NextResponse.json(member)
  } catch (error) {
    console.error('Staff PUT error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Unassign from properties first
    await prisma.property.updateMany({ where: { staffId: Number(params.id) }, data: { staffId: null } })
    await prisma.staff.delete({ where: { id: Number(params.id) } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Staff DELETE error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
