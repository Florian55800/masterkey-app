export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

function toRows(rs: { columns: string[]; rows: unknown[][] }): Record<string, unknown>[] {
  return rs.rows.map((row) => {
    const obj: Record<string, unknown> = {}
    rs.columns.forEach((col, i) => { obj[col] = (row as unknown[])[i] })
    return obj
  })
}

// GET by token (public) or by id
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const isToken = isNaN(Number(params.id))

    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
      try {
        const sql = isToken
          ? `SELECT cs.*, p.name as propertyName, p.address as propertyAddress, p.city as propertyCity, p.photo as propertyPhoto, s.name as staffName, s.phone as staffPhone FROM CleaningSheet cs LEFT JOIN Property p ON p.id = cs.propertyId LEFT JOIN Staff s ON s.id = p.staffId WHERE cs.shareToken = ?`
          : `SELECT cs.*, p.name as propertyName, p.address as propertyAddress, p.city as propertyCity, p.photo as propertyPhoto, s.name as staffName, s.phone as staffPhone FROM CleaningSheet cs LEFT JOIN Property p ON p.id = cs.propertyId LEFT JOIN Staff s ON s.id = p.staffId WHERE cs.id = ?`
        const rs = await client.execute({ sql, args: [isToken ? params.id : Number(params.id)] })
        const rows = toRows(rs)
        if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        const row = rows[0]
        return NextResponse.json({
          id: row.id, propertyId: row.propertyId, instructions: row.instructions ?? '',
          checklist: row.checklist ? JSON.parse(row.checklist as string) : [],
          mediaUrls: row.mediaUrls ? JSON.parse(row.mediaUrls as string) : [],
          shareToken: row.shareToken, propertyName: row.propertyName,
          propertyAddress: row.propertyAddress, propertyCity: row.propertyCity,
          propertyPhoto: row.propertyPhoto, staffName: row.staffName, staffPhone: row.staffPhone,
        })
      } finally { client.close() }
    }
    const where = isToken ? { shareToken: params.id } : { id: Number(params.id) }
    const sheet = await (prisma.cleaningSheet as any).findUnique({ where, include: { property: { include: { staff: true } } } })
    if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({
      ...sheet,
      checklist: JSON.parse(sheet.checklist), mediaUrls: JSON.parse(sheet.mediaUrls),
      propertyName: sheet.property.name, propertyAddress: sheet.property.address,
      propertyCity: sheet.property.city, propertyPhoto: sheet.property.photo,
      staffName: sheet.property.staff?.name ?? null, staffPhone: sheet.property.staff?.phone ?? null,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// PUT — update instructions + checklist
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { instructions, checklist, mediaUrls } = body
    const now = new Date().toISOString()

    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
      try {
        await client.execute({
          sql: `UPDATE CleaningSheet SET instructions = ?, checklist = ?, mediaUrls = ?, updatedAt = ? WHERE id = ?`,
          args: [instructions ?? null, JSON.stringify(checklist), JSON.stringify(mediaUrls ?? []), now, Number(params.id)],
        })
        return NextResponse.json({ success: true })
      } finally { client.close() }
    }
    await (prisma.cleaningSheet as any).update({
      where: { id: Number(params.id) },
      data: { instructions, checklist: JSON.stringify(checklist), mediaUrls: JSON.stringify(mediaUrls ?? []) },
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// POST — upload media file
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const allowed = ['jpg','jpeg','png','gif','webp','mp4','mov','avi','pdf']
    if (!allowed.includes(ext)) return NextResponse.json({ error: 'Type non autorisé' }, { status: 400 })
    if (file.size > 50 * 1024 * 1024) return NextResponse.json({ error: 'Fichier trop lourd (max 50MB)' }, { status: 400 })

    const filename = `${randomUUID()}.${ext}`
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'cleaning')
    const { mkdir } = require('fs/promises')
    await mkdir(uploadDir, { recursive: true })
    const bytes = await file.arrayBuffer()
    await writeFile(join(uploadDir, filename), Buffer.from(bytes))
    const url = `/uploads/cleaning/${filename}`

    // Append to mediaUrls
    const now = new Date().toISOString()
    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
      try {
        const rs = await client.execute({ sql: `SELECT mediaUrls FROM CleaningSheet WHERE id = ?`, args: [Number(params.id)] })
        const rows = toRows(rs)
        const current: string[] = rows[0]?.mediaUrls ? JSON.parse(rows[0].mediaUrls as string) : []
        await client.execute({ sql: `UPDATE CleaningSheet SET mediaUrls = ?, updatedAt = ? WHERE id = ?`, args: [JSON.stringify([...current, url]), now, Number(params.id)] })
      } finally { client.close() }
    }
    return NextResponse.json({ url })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// DELETE — remove file from mediaUrls
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { url } = await req.json()
    const now = new Date().toISOString()

    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
      try {
        const rs = await client.execute({ sql: `SELECT mediaUrls FROM CleaningSheet WHERE id = ?`, args: [Number(params.id)] })
        const rows = toRows(rs)
        const current: string[] = rows[0]?.mediaUrls ? JSON.parse(rows[0].mediaUrls as string) : []
        const updated = current.filter(u => u !== url)
        await client.execute({ sql: `UPDATE CleaningSheet SET mediaUrls = ?, updatedAt = ? WHERE id = ?`, args: [JSON.stringify(updated), now, Number(params.id)] })
      } finally { client.close() }
    }
    // Delete file from disk
    try {
      const filepath = join(process.cwd(), 'public', url)
      await unlink(filepath)
    } catch { /* ignore */ }
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
