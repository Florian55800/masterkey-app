export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await getSession(req)
  if (!authUser) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const id = parseInt(params.id)
  const body = await req.json()
  const { name, color, pin, photo } = body

  const data: Record<string, string> = {}
  if (name) data.name = name
  if (color) data.color = color
  if (photo !== undefined) data.photo = photo
  if (pin && pin.length === 4) {
    data.pin = await bcrypt.hash(pin, 10)
  }

  const user = await prisma.user.update({ where: { id }, data })
  return NextResponse.json({ id: user.id, name: user.name, color: user.color })
}
