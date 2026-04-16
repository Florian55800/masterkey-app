export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    const doc = await (prisma as any).ownerDocument.findUnique({
      where: { id: Number(params.docId) },
    })
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await (prisma as any).ownerDocument.delete({
      where: { id: Number(params.docId) },
    })

    // Remove file from disk (best effort)
    try {
      await unlink(join(process.cwd(), 'public', doc.url))
    } catch { /* ignore if file missing */ }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
