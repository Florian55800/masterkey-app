export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@libsql/client'

function getTursoClient() {
  const url = process.env.TURSO_DATABASE_URL
  if (!url) return null
  return createClient({ url: url.replace(/^libsql:\/\//, 'http://'), authToken: process.env.TURSO_AUTH_TOKEN || '' })
}

export async function GET() {
  const client = getTursoClient()
  if (client) {
    try {
      const rs = await client.execute(`
        SELECT v.id, v.leadId, v.date, v.address, v.notes, v.createdAt,
               l.nom as leadNom
        FROM "Visit" v
        LEFT JOIN "Lead" l ON l.id = v.leadId
        ORDER BY v.date ASC
      `)
      const visits = rs.rows.map((r) => ({
        id: r.id, leadId: r.leadId, date: r.date, address: r.address,
        notes: r.notes, createdAt: r.createdAt,
        lead: r.leadNom ? { nom: r.leadNom } : null,
      }))
      return NextResponse.json(visits)
    } finally { client.close() }
  }
  try {
    const visits = await prisma.visit.findMany({
      include: { lead: { select: { nom: true } } },
      orderBy: { date: 'asc' },
    })
    return NextResponse.json(visits)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { leadId, date, address, notes } = body
  const client = getTursoClient()
  if (client) {
    try {
      const rs = await client.execute({
        sql: `INSERT INTO "Visit" (leadId, date, address, notes, createdAt)
              VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        args: [leadId || null, new Date(date).toISOString(), address, notes || null],
      })
      return NextResponse.json({ id: Number(rs.lastInsertRowid) }, { status: 201 })
    } finally { client.close() }
  }
  try {
    const visit = await prisma.visit.create({
      data: { leadId: leadId || null, date: new Date(date), address, notes: notes || null },
      include: { lead: { select: { nom: true } } },
    })
    return NextResponse.json(visit, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
