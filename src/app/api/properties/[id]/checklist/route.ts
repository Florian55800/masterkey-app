export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const checklist = await (prisma as any).propertyChecklist.findUnique({
      where: { propertyId: Number(params.id) },
    })
    return NextResponse.json(checklist ?? { consommables: '[]', equipements: '[]' })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const propertyId = Number(params.id)
    const data = {
      consommables: JSON.stringify(body.consommables ?? []),
      equipements:  JSON.stringify(body.equipements  ?? []),
    }
    const checklist = await (prisma as any).propertyChecklist.upsert({
      where:  { propertyId },
      create: { propertyId, ...data },
      update: data,
    })
    return NextResponse.json(checklist)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
