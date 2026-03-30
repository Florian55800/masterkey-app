export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

function toRows(rs: { columns: string[]; rows: unknown[][] }): Record<string, unknown>[] {
  return rs.rows.map((row) => {
    const obj: Record<string, unknown> = {}
    rs.columns.forEach((col, i) => { obj[col] = (row as unknown[])[i] })
    return obj
  })
}

function parseGuide(row: Record<string, unknown>) {
  return {
    id: row.id,
    propertyId: row.propertyId,
    shareToken: row.shareToken,
    welcomeMessage: row.welcomeMessage ?? null,
    wifiName: row.wifiName ?? null,
    wifiPassword: row.wifiPassword ?? null,
    keyCode: row.keyCode ?? null,
    checkIn: row.checkIn ?? null,
    checkOut: row.checkOut ?? null,
    houseRules: row.houseRules ? JSON.parse(row.houseRules as string) : [],
    restaurants: row.restaurants ? JSON.parse(row.restaurants as string) : [],
    activities: row.activities ? JSON.parse(row.activities as string) : [],
    customSections: row.customSections ? JSON.parse(row.customSections as string) : [],
    mediaUrls: row.mediaUrls ? JSON.parse(row.mediaUrls as string) : [],
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
          SELECT wg.*, p.name as propertyName, p.address as propertyAddress, p.city as propertyCity
          FROM WelcomeGuide wg
          LEFT JOIN Property p ON p.id = wg.propertyId
          ORDER BY wg.createdAt DESC
        `)
        return NextResponse.json(toRows(rs).map(parseGuide))
      } finally { client.close() }
    }
    const guides = await (prisma.welcomeGuide as any).findMany({
      include: { property: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(guides.map((g: any) => ({
      ...g,
      houseRules: JSON.parse(g.houseRules),
      restaurants: JSON.parse(g.restaurants),
      activities: JSON.parse(g.activities),
      customSections: JSON.parse(g.customSections),
      mediaUrls: JSON.parse(g.mediaUrls),
      propertyName: g.property.name,
      propertyAddress: g.property.address,
      propertyCity: g.property.city,
    })))
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { propertyId } = await req.json()
    const shareToken = randomUUID().replace(/-/g, '')
    const now = new Date().toISOString()

    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
      try {
        await client.execute({
          sql: `INSERT INTO WelcomeGuide (propertyId, shareToken, createdAt, updatedAt)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(propertyId) DO NOTHING`,
          args: [propertyId, shareToken, now, now],
        })
        const rs = await client.execute({
          sql: `SELECT wg.*, p.name as propertyName, p.address as propertyAddress, p.city as propertyCity
                FROM WelcomeGuide wg
                LEFT JOIN Property p ON p.id = wg.propertyId
                WHERE wg.propertyId = ?`,
          args: [propertyId],
        })
        return NextResponse.json(parseGuide(toRows(rs)[0]), { status: 201 })
      } finally { client.close() }
    }
    const guide = await (prisma.welcomeGuide as any).upsert({
      where: { propertyId },
      create: { propertyId, shareToken },
      update: {},
      include: { property: true },
    })
    return NextResponse.json({
      ...guide,
      houseRules: JSON.parse(guide.houseRules),
      restaurants: JSON.parse(guide.restaurants),
      activities: JSON.parse(guide.activities),
      customSections: JSON.parse(guide.customSections),
      mediaUrls: JSON.parse(guide.mediaUrls),
      propertyName: guide.property.name,
      propertyAddress: guide.property.address,
      propertyCity: guide.property.city,
    }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
