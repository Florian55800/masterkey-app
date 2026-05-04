export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const owner = await prisma.owner.findUnique({
      where: { id: Number(params.id) },
      include: {
        properties: true,
        satisfactions: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (!owner) {
      return NextResponse.json({ error: 'Propriétaire introuvable' }, { status: 404 })
    }

    return NextResponse.json(owner)
  } catch (error) {
    console.error('Owner GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id)
  try {
    const body = await request.json()
    const { name, phone, isWhatsapp, email, adresseDomicile, notes, lastContact, relanceDate, relanceNote, source, photo } = body

    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      })
      try {
        await client.execute({
          sql: `UPDATE "Owner" SET
            name            = COALESCE(?, name),
            phone           = ?,
            isWhatsapp      = ?,
            email           = ?,
            adresseDomicile = ?,
            notes           = ?,
            lastContact     = ?,
            relanceDate     = ?,
            relanceNote     = ?,
            source          = ?,
            photo           = ?,
            updatedAt       = CURRENT_TIMESTAMP
          WHERE id = ?`,
          args: [
            name ?? null,
            phone !== undefined ? (phone || null) : undefined,
            isWhatsapp !== undefined ? (isWhatsapp ? 1 : 0) : undefined,
            email !== undefined ? (email || null) : undefined,
            adresseDomicile !== undefined ? (adresseDomicile || null) : undefined,
            notes !== undefined ? (notes || null) : undefined,
            lastContact !== undefined ? (lastContact || null) : undefined,
            relanceDate !== undefined ? (relanceDate || null) : undefined,
            relanceNote !== undefined ? (relanceNote || null) : undefined,
            source !== undefined ? (source || null) : undefined,
            photo !== undefined ? (photo || null) : undefined,
            id,
          ],
        })
        return NextResponse.json({ success: true })
      } finally {
        client.close()
      }
    }

    const owner = await prisma.owner.update({
      where: { id },
      data: {
        name:            name            !== undefined ? name                                           : undefined,
        phone:           phone           !== undefined ? phone || null                                  : undefined,
        isWhatsapp:      isWhatsapp      !== undefined ? isWhatsapp === true                            : undefined,
        email:           email           !== undefined ? email || null                                  : undefined,
        adresseDomicile: adresseDomicile !== undefined ? adresseDomicile || null                        : undefined,
        notes:           notes           !== undefined ? notes || null                                  : undefined,
        lastContact:     lastContact     !== undefined ? (lastContact ? new Date(lastContact) : null)   : undefined,
        relanceDate:     relanceDate     !== undefined ? (relanceDate  ? new Date(relanceDate)  : null)  : undefined,
        relanceNote:     relanceNote     !== undefined ? relanceNote || null                             : undefined,
        source:          source          !== undefined ? source || null                                 : undefined,
        photo:           photo           !== undefined ? photo || null                                  : undefined,
      },
      include: { properties: true, satisfactions: true },
    })
    return NextResponse.json(owner)
  } catch (error) {
    console.error('Owner PUT error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id)
  try {
    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      })
      try {
        await client.execute({ sql: `DELETE FROM "Owner" WHERE id = ?`, args: [id] })
        return NextResponse.json({ success: true })
      } finally {
        client.close()
      }
    }
    await prisma.owner.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Owner DELETE error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
