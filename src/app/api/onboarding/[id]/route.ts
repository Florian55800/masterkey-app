export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { checks } = await req.json()
    const checksJson = JSON.stringify(checks)
    const now = new Date().toISOString()

    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
      try {
        await client.execute({
          sql: `UPDATE OnboardingSession SET checks = ?, updatedAt = ? WHERE id = ?`,
          args: [checksJson, now, params.id],
        })
        return NextResponse.json({ success: true })
      } finally { client.close() }
    }
    await prisma.onboardingSession.update({ where: { id: params.id }, data: { checks: checksJson } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
      try {
        await client.execute({ sql: `DELETE FROM OnboardingSession WHERE id = ?`, args: [params.id] })
        return NextResponse.json({ success: true })
      } finally { client.close() }
    }
    await prisma.onboardingSession.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
