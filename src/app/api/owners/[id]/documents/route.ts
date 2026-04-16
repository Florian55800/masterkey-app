export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

const PUBLIC_DIR = process.env.NODE_ENV === 'production'
  ? '/app/public'
  : join(process.cwd(), 'public')

const ALLOWED_TYPES: Record<string, string> = {
  pdf:  'application/pdf',
  png:  'image/png',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  gif:  'image/gif',
  webp: 'image/webp',
  doc:  'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls:  'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const docs = await (prisma as any).ownerDocument.findMany({
      where: { ownerId: Number(params.id) },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(docs)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const category = (formData.get('category') as string) || 'autre'
    const displayName = (formData.get('name') as string) || ''

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    if (!ALLOWED_TYPES[ext]) {
      return NextResponse.json({ error: 'Type de fichier non autorisé' }, { status: 400 })
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop lourd (max 20 Mo)' }, { status: 400 })
    }

    const filename = `${randomUUID()}.${ext}`
    const uploadDir = join(PUBLIC_DIR, 'uploads', 'owner-docs')
    await mkdir(uploadDir, { recursive: true })
    const bytes = await file.arrayBuffer()
    await writeFile(join(uploadDir, filename), Buffer.from(bytes))
    const url = `/uploads/owner-docs/${filename}`

    const doc = await (prisma as any).ownerDocument.create({
      data: {
        ownerId:  Number(params.id),
        name:     displayName || file.name,
        url,
        mimeType: ALLOWED_TYPES[ext] ?? file.type,
        size:     file.size,
        category,
      },
    })

    return NextResponse.json(doc, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
