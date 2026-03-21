import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { key: string } }) {
  try {
    const row = await prisma.config.findUnique({ where: { key: params.key } })
    return NextResponse.json({ value: row?.value ?? null })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { key: string } }) {
  try {
    const { value } = await req.json()
    const row = await prisma.config.upsert({
      where: { key: params.key },
      update: { value },
      create: { key: params.key, value },
    })
    return NextResponse.json({ value: row.value })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
