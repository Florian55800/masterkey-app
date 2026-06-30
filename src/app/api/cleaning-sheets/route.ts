export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { DEFAULT_CHECKLIST } from '@/lib/cleaning-defaults'

function toRows(rs: { columns: string[]; rows: unknown[][] }): Record<string, unknown>[] {
  return rs.rows.map((row) => {
    const obj: Record<string, unknown> = {}
    rs.columns.forEach((col, i) => { obj[col] = (row as unknown[])[i] })
    return obj
  })
}

function parseSheet(row: Record<string, unknown>) {
  return {
    id: row.id,
    propertyId: row.propertyId,
    accessCode: row.accessCode ?? null,
    checkoutTime: row.checkoutTime ?? null,
    nextCheckinTime: row.nextCheckinTime ?? null,
    instructions: row.instructions ?? '',
    checklist: row.checklist ? JSON.parse(row.checklist as string) : DEFAULT_CHECKLIST,
    customSections: row.customSections ? JSON.parse(row.customSections as string) : [],
    mediaUrls: row.mediaUrls ? JSON.parse(row.mediaUrls as string) : [],
    shareToken: row.shareToken,
    createdAt: row.createdAt,
    propertyName: row.propertyName ?? null,
    propertyAddress: row.propertyAddress ?? null,
    propertyCity: row.propertyCity ?? null,
  }
}

export async function GET() {
  try {
    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
      try {
        const rs = await client.execute(`
          SELECT cs.*, p.name as propertyName, p.address as propertyAddress, p.city as propertyCity,
                 s.name as staffName, s.phone as staffPhone
          FROM CleaningSheet cs
          LEFT JOIN Property p ON p.id = cs.propertyId
          LEFT JOIN Staff s ON s.id = p.staffId
          ORDER BY cs.createdAt DESC
        `)
        return NextResponse.json(toRows(rs).map(parseSheet))
      } finally { client.close() }
    }
    const sheets = await (prisma as any).cleaningSheet.findMany({
      include: { property: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(sheets.map((s: any) => ({
      ...s,
      checklist: JSON.parse(s.checklist),
      customSections: JSON.parse(s.customSections ?? '[]'),
      mediaUrls: JSON.parse(s.mediaUrls),
      propertyName: s.property.name,
      propertyAddress: s.property.address,
      propertyCity: s.property.city,
    })))
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { propertyId } = await req.json()
    const shareToken = randomUUID().replace(/-/g, '')
    const checklistJson = JSON.stringify(DEFAULT_CHECKLIST)
    const now = new Date().toISOString()

    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
      try {
        await client.execute({
          sql: `INSERT INTO CleaningSheet (propertyId, checklist, mediaUrls, shareToken, createdAt, updatedAt)
                VALUES (?, ?, '[]', ?, ?, ?)
                ON CONFLICT(propertyId) DO NOTHING`,
          args: [propertyId, checklistJson, shareToken, now, now],
        })
        const rs = await client.execute({ sql: `SELECT cs.*, p.name as propertyName, p.address as propertyAddress, p.city as propertyCity, s.name as staffName, s.phone as staffPhone FROM CleaningSheet cs LEFT JOIN Property p ON p.id = cs.propertyId LEFT JOIN Staff s ON s.id = p.staffId WHERE cs.propertyId = ?`, args: [propertyId] })
        return NextResponse.json(parseSheet(toRows(rs)[0]), { status: 201 })
      } finally { client.close() }
    }
    const sheet = await prisma.cleaningSheet.upsert({
      where: { propertyId },
      create: { propertyId, checklist: checklistJson, shareToken },
      update: {},
      include: { property: { include: { staff: true } } },
    })
    return NextResponse.json({
      ...sheet,
      checklist: JSON.parse(sheet.checklist),
      mediaUrls: JSON.parse(sheet.mediaUrls),
      propertyName: sheet.property.name,
      propertyAddress: sheet.property.address,
      propertyCity: sheet.property.city,
      staffName: sheet.property.staff?.name ?? null,
      staffPhone: sheet.property.staff?.phone ?? null,
    }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
