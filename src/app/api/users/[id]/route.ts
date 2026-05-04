export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { hashPin } from '@/lib/hash'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await getSession(req)
  if (!authUser) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const id = parseInt(params.id)
  if (id === authUser.userId) {
    return NextResponse.json({ error: 'Impossible de supprimer votre propre compte' }, { status: 400 })
  }

  try {
    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('User DELETE error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await getSession(req)
  if (!authUser) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const id = parseInt(params.id)
  const body = await req.json()
  const { name, color, pin, photo, role, accessLevel } = body

  const data: Record<string, string> = {}
  if (name) data.name = name
  if (color) data.color = color
  if (photo !== undefined) data.photo = photo
  if (role !== undefined) data.role = role
  if (accessLevel !== undefined) data.accessLevel = accessLevel
  if (pin && pin.length === 4) {
    data.pin = hashPin(pin)
  }

  const user = await prisma.user.update({ where: { id }, data })
  return NextResponse.json({ id: user.id, name: user.name, color: user.color, accessLevel: (user as any).accessLevel })
}
