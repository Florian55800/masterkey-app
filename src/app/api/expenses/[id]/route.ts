export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id)
  if (process.env.TURSO_DATABASE_URL) {
    const { createClient } = require('@libsql/client')
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    try {
      await client.execute({ sql: `DELETE FROM "Expense" WHERE id = ?`, args: [id] })
      return NextResponse.json({ success: true })
    } finally {
      client.close()
    }
  }
  await prisma.expense.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
