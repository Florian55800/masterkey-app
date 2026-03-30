export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

const PUBLIC_DIR = process.env.NODE_ENV === 'production'
  ? '/app/public'
  : join(process.cwd(), 'public')

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
    propertyPhoto: row.propertyPhoto ?? null,
  }
}

// GET by id or shareToken
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const isToken = isNaN(Number(params.id))

    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
      try {
        const sql = isToken
          ? `SELECT wg.*, p.name as propertyName, p.address as propertyAddress, p.city as propertyCity, p.photo as propertyPhoto
             FROM WelcomeGuide wg
             LEFT JOIN Property p ON p.id = wg.propertyId
             WHERE wg.shareToken = ?`
          : `SELECT wg.*, p.name as propertyName, p.address as propertyAddress, p.city as propertyCity, p.photo as propertyPhoto
             FROM WelcomeGuide wg
             LEFT JOIN Property p ON p.id = wg.propertyId
             WHERE wg.id = ?`
        const rs = await client.execute({ sql, args: [isToken ? params.id : Number(params.id)] })
        const rows = toRows(rs)
        if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        return NextResponse.json(parseGuide(rows[0]))
      } finally { client.close() }
    }
    const where = isToken ? { shareToken: params.id } : { id: Number(params.id) }
    const guide = await (prisma.welcomeGuide as any).findUnique({ where, include: { property: true } })
    if (!guide) return NextResponse.json({ error: 'Not found' }, { status: 404 })
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
      propertyPhoto: guide.property.photo ?? null,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// PUT — update guide fields
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const {
      welcomeMessage, wifiName, wifiPassword, keyCode,
      checkIn, checkOut, houseRules, restaurants, activities,
      customSections, mediaUrls,
    } = body
    const now = new Date().toISOString()

    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
      try {
        await client.execute({
          sql: `UPDATE WelcomeGuide SET
            welcomeMessage = ?, wifiName = ?, wifiPassword = ?, keyCode = ?,
            checkIn = ?, checkOut = ?, houseRules = ?, restaurants = ?,
            activities = ?, customSections = ?, mediaUrls = ?, updatedAt = ?
            WHERE id = ?`,
          args: [
            welcomeMessage ?? null,
            wifiName ?? null,
            wifiPassword ?? null,
            keyCode ?? null,
            checkIn ?? null,
            checkOut ?? null,
            JSON.stringify(houseRules ?? []),
            JSON.stringify(restaurants ?? []),
            JSON.stringify(activities ?? []),
            JSON.stringify(customSections ?? []),
            JSON.stringify(mediaUrls ?? []),
            now,
            Number(params.id),
          ],
        })
        return NextResponse.json({ success: true })
      } finally { client.close() }
    }
    await (prisma.welcomeGuide as any).update({
      where: { id: Number(params.id) },
      data: {
        welcomeMessage: welcomeMessage ?? null,
        wifiName: wifiName ?? null,
        wifiPassword: wifiPassword ?? null,
        keyCode: keyCode ?? null,
        checkIn: checkIn ?? null,
        checkOut: checkOut ?? null,
        houseRules: JSON.stringify(houseRules ?? []),
        restaurants: JSON.stringify(restaurants ?? []),
        activities: JSON.stringify(activities ?? []),
        customSections: JSON.stringify(customSections ?? []),
        mediaUrls: JSON.stringify(mediaUrls ?? []),
      },
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
    const allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4']
    if (!allowed.includes(ext)) return NextResponse.json({ error: 'Type non autorisé' }, { status: 400 })
    if (file.size > 50 * 1024 * 1024) return NextResponse.json({ error: 'Fichier trop lourd (max 50MB)' }, { status: 400 })

    const filename = `${randomUUID()}.${ext}`
    const uploadDir = join(PUBLIC_DIR, 'uploads', 'welcome')
    await mkdir(uploadDir, { recursive: true })
    const bytes = await file.arrayBuffer()
    await writeFile(join(uploadDir, filename), Buffer.from(bytes))
    const url = `/uploads/welcome/${filename}`

    const now = new Date().toISOString()
    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
      try {
        const rs = await client.execute({ sql: `SELECT mediaUrls FROM WelcomeGuide WHERE id = ?`, args: [Number(params.id)] })
        const rows = toRows(rs)
        const current: string[] = rows[0]?.mediaUrls ? JSON.parse(rows[0].mediaUrls as string) : []
        await client.execute({
          sql: `UPDATE WelcomeGuide SET mediaUrls = ?, updatedAt = ? WHERE id = ?`,
          args: [JSON.stringify([...current, url]), now, Number(params.id)],
        })
      } catch (dbErr) {
        console.error('[upload] DB update failed:', dbErr)
      } finally { client.close() }
    } else {
      const guide = await (prisma.welcomeGuide as any).findUnique({ where: { id: Number(params.id) } })
      if (guide) {
        const current: string[] = JSON.parse(guide.mediaUrls)
        await (prisma.welcomeGuide as any).update({
          where: { id: Number(params.id) },
          data: { mediaUrls: JSON.stringify([...current, url]) },
        })
      }
    }
    return NextResponse.json({ url })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// DELETE — remove file url from mediaUrls
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { url } = await req.json()
    const now = new Date().toISOString()

    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
      try {
        const rs = await client.execute({ sql: `SELECT mediaUrls FROM WelcomeGuide WHERE id = ?`, args: [Number(params.id)] })
        const rows = toRows(rs)
        const current: string[] = rows[0]?.mediaUrls ? JSON.parse(rows[0].mediaUrls as string) : []
        const updated = current.filter(u => u !== url)
        await client.execute({
          sql: `UPDATE WelcomeGuide SET mediaUrls = ?, updatedAt = ? WHERE id = ?`,
          args: [JSON.stringify(updated), now, Number(params.id)],
        })
      } finally { client.close() }
    } else {
      const guide = await (prisma.welcomeGuide as any).findUnique({ where: { id: Number(params.id) } })
      if (guide) {
        const current: string[] = JSON.parse(guide.mediaUrls)
        const updated = current.filter(u => u !== url)
        await (prisma.welcomeGuide as any).update({
          where: { id: Number(params.id) },
          data: { mediaUrls: JSON.stringify(updated) },
        })
      }
    }
    // Remove file from disk
    try {
      const filepath = join(process.cwd(), 'public', url)
      await unlink(filepath)
    } catch { /* ignore */ }
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
