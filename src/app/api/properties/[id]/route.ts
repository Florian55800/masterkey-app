export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate()
}

function toRows(rs: { columns: string[]; rows: unknown[][] }): Record<string, unknown>[] {
  return rs.rows.map((row) => {
    const obj: Record<string, unknown> = {}
    rs.columns.forEach((col, i) => {
      const v = (row as unknown[])[i]
      obj[col] = typeof v === 'bigint' ? Number(v) : v
    })
    return obj
  })
}

const MONTHS_FR = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const propertyId = Number(params.id)

  // Production: fresh libsql WebSocket connection per request
  if (process.env.TURSO_DATABASE_URL) {
    const { createClient } = require('@libsql/client')
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    try {
      const propRS = await client.execute({
        sql: `SELECT p.id, p.name, p.address, p.city, p.type, p.typeGestion,
                     p.commissionRate, p.cleaningFee, p.staffId, p.lodgifyId,
                     p.description, p.photo, p.dateSigned,
                     p.status, p.ownerId,
                     o.id as ownerId_val, o.name as ownerName,
                     s.id as _staffId, s.name as _staffName, s.phone as _staffPhone
              FROM Property p
              LEFT JOIN Owner o ON o.id = p.ownerId
              LEFT JOIN Staff s ON s.id = p.staffId
              WHERE p.id = ?`,
        args: [propertyId],
      })

      const rows = toRows(propRS)
      if (rows.length === 0) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
      const row = rows[0]

      const revsRS = await client.execute({
        sql: `SELECT id, month, year, platform, platformAmount, cleaningFees,
                     commissionRate, nbSejours, nbNuits
              FROM PropertyRevenue
              WHERE propertyId = ?
              ORDER BY year ASC, month ASC, platform ASC`,
        args: [propertyId],
      })
      const revenues = toRows(revsRS)

      // Aggregate into monthly stats
      const monthMap = new Map<string, {
        month: number; year: number
        totalGross: number; totalCleaning: number; totalNet: number
        totalPartMK: number; totalPartProprio: number
        nbSejours: number; nbNuits: number
      }>()

      for (const r of revenues) {
        const key = `${r.year}-${String(r.month).padStart(2, '0')}`
        if (!monthMap.has(key)) {
          monthMap.set(key, {
            month: r.month as number, year: r.year as number,
            totalGross: 0, totalCleaning: 0, totalNet: 0,
            totalPartMK: 0, totalPartProprio: 0,
            nbSejours: 0, nbNuits: 0,
          })
        }
        const m = monthMap.get(key)!
        const platformAmount = Number(r.platformAmount) || 0
        const cleaningFees = Number(r.cleaningFees) || 0
        const commissionRate = Number(r.commissionRate) || 0
        const base = platformAmount - cleaningFees
        const partMK = base * (commissionRate / 100)
        m.totalGross    += platformAmount
        m.totalCleaning += cleaningFees
        m.totalNet      += base
        m.totalPartMK   += partMK
        m.totalPartProprio += base - partMK
        m.nbSejours     += Number(r.nbSejours) || 0
        m.nbNuits       += Number(r.nbNuits) || 0
      }

      const monthlyStats = Array.from(monthMap.values())
        .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
        .map(m => {
          const days = getDaysInMonth(m.month, m.year)
          return {
            ...m,
            label: `${MONTHS_FR[m.month]} ${m.year}`,
            daysInMonth: days,
            tauxOccupation: m.nbNuits > 0 ? Math.round((m.nbNuits / days) * 100) : 0,
            prixMoyenNuit: m.nbNuits > 0 ? m.totalNet / m.nbNuits : null,
          }
        })

      return NextResponse.json({
        id: row.id,
        name: row.name,
        address: row.address,
        city: row.city,
        type: row.type,
        typeGestion: row.typeGestion,
        commissionRate: row.commissionRate,
        cleaningFee: row.cleaningFee ?? 0,
        staffId: row.staffId ?? null,
        lodgifyId: row.lodgifyId ?? null,
        staff: row._staffId ? { id: row._staffId, name: row._staffName, phone: row._staffPhone } : null,
        description: row.description ?? '',
        photo: row.photo,
        dateSigned: row.dateSigned,
        status: row.status,
        owner: { id: row.ownerId, name: row.ownerName },
        monthlyStats,
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('Property[id] GET error:', msg)
      return NextResponse.json({ error: msg }, { status: 500 })
    } finally {
      client.close()
    }
  }

  // Local dev: Prisma + SQLite
  try {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        owner: true,
        revenues: { orderBy: [{ year: 'asc' }, { month: 'asc' }, { platform: 'asc' }] },
      },
    })
    if (!property) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    const monthMap = new Map<string, {
      month: number; year: number
      totalGross: number; totalCleaning: number; totalNet: number
      totalPartMK: number; totalPartProprio: number
      nbSejours: number; nbNuits: number
    }>()

    for (const r of property.revenues) {
      const key = `${r.year}-${String(r.month).padStart(2, '0')}`
      if (!monthMap.has(key)) {
        monthMap.set(key, {
          month: r.month, year: r.year,
          totalGross: 0, totalCleaning: 0, totalNet: 0,
          totalPartMK: 0, totalPartProprio: 0,
          nbSejours: 0, nbNuits: 0,
        })
      }
      const m = monthMap.get(key)!
      const base = r.platformAmount - r.cleaningFees
      const partMK = base * (r.commissionRate / 100)
      m.totalGross    += r.platformAmount
      m.totalCleaning += r.cleaningFees
      m.totalNet      += base
      m.totalPartMK   += partMK
      m.totalPartProprio += base - partMK
      m.nbSejours     += r.nbSejours ?? 0
      m.nbNuits       += r.nbNuits ?? 0
    }

    const monthlyStats = Array.from(monthMap.values())
      .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
      .map(m => {
        const days = getDaysInMonth(m.month, m.year)
        return {
          ...m,
          label: `${MONTHS_FR[m.month]} ${m.year}`,
          daysInMonth: days,
          tauxOccupation: m.nbNuits > 0 ? Math.round((m.nbNuits / days) * 100) : 0,
          prixMoyenNuit: m.nbNuits > 0 ? m.totalNet / m.nbNuits : null,
        }
      })

    return NextResponse.json({
      id: property.id,
      name: property.name,
      address: property.address,
      city: property.city,
      type: property.type,
      typeGestion: property.typeGestion,
      commissionRate: property.commissionRate,
      description: property.description ?? '',
      photo: property.photo,
      dateSigned: property.dateSigned,
      status: property.status,
      owner: property.owner,
      monthlyStats,
    })
  } catch (error) {
    console.error('Property GET error:', error)
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
    const { name, address, city, type, typeGestion, ownerId, commissionRate, dateSigned, status, photo, description, cleaningFee, staffId, lodgifyId } = body

    // Production : raw SQL (Prisma unreliable with libsql driver in prod)
    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      })
      try {
        await client.execute({
          sql: `UPDATE "Property" SET
            name = COALESCE(?, name),
            address = COALESCE(?, address),
            city = COALESCE(?, city),
            type = COALESCE(?, type),
            typeGestion = COALESCE(?, typeGestion),
            ownerId = COALESCE(?, ownerId),
            commissionRate = COALESCE(?, commissionRate),
            cleaningFee = COALESCE(?, cleaningFee),
            staffId = ?,
            lodgifyId = ?,
            dateSigned = COALESCE(?, dateSigned),
            status = COALESCE(?, status),
            photo = ?,
            description = ?,
            updatedAt = CURRENT_TIMESTAMP
          WHERE id = ?`,
          args: [
            name ?? null, address ?? null, city ?? null, type ?? null,
            typeGestion ?? null, ownerId ? Number(ownerId) : null,
            commissionRate !== undefined ? Number(commissionRate) : null,
            cleaningFee !== undefined ? Number(cleaningFee) : null,
            staffId !== undefined ? (staffId ? Number(staffId) : null) : undefined,
            lodgifyId !== undefined ? (lodgifyId ? Number(lodgifyId) : null) : undefined,
            dateSigned ?? null, status ?? null,
            photo !== undefined ? (photo || null) : undefined,
            description !== undefined ? (description || null) : undefined,
            id,
          ],
        })
        const propRS = await client.execute({
          sql: `SELECT p.*, o.id as _oid, o.name as _oname, s.id as _sid, s.name as _sname, s.phone as _sphone
                FROM Property p
                LEFT JOIN Owner o ON o.id = p.ownerId
                LEFT JOIN Staff s ON s.id = p.staffId
                WHERE p.id = ?`,
          args: [id],
        })
        const rows = toRows(propRS)
        if (rows.length === 0) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
        const r = rows[0]
        return NextResponse.json({
          ...r,
          owner: { id: r._oid, name: r._oname ?? '—' },
          staff: r._sid ? { id: r._sid, name: r._sname, phone: r._sphone } : null,
        })
      } finally {
        client.close()
      }
    }

    // Dev : Prisma
    const property = await prisma.property.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        address: address !== undefined ? address : undefined,
        city: city !== undefined ? city : undefined,
        type: type !== undefined ? type : undefined,
        typeGestion: typeGestion !== undefined ? typeGestion : undefined,
        ownerId: ownerId !== undefined ? Number(ownerId) : undefined,
        commissionRate: commissionRate !== undefined ? Number(commissionRate) : undefined,
        cleaningFee: cleaningFee !== undefined ? Number(cleaningFee) : undefined,
        staffId: staffId !== undefined ? (staffId ? Number(staffId) : null) : undefined,
        lodgifyId: lodgifyId !== undefined ? (lodgifyId ? Number(lodgifyId) : null) : undefined,
        dateSigned: dateSigned !== undefined ? new Date(dateSigned) : undefined,
        status: status !== undefined ? status : undefined,
        photo: photo !== undefined ? photo || null : undefined,
        description: description !== undefined ? description || null : undefined,
      },
      include: { owner: true, staff: { select: { id: true, name: true, phone: true } } },
    })
    return NextResponse.json(property)
  } catch (error) {
    console.error('Property PUT error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id)
  const { searchParams } = new URL(request.url)
  const permanent = searchParams.get('permanent') === 'true'

  try {
    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = require('@libsql/client')
      const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      })
      try {
        if (permanent) {
          await client.execute({ sql: `DELETE FROM "Property" WHERE id = ?`, args: [id] })
          return NextResponse.json({ deleted: true })
        } else {
          await client.execute({
            sql: `UPDATE "Property" SET status = 'inactive', dateLost = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
            args: [id],
          })
          return NextResponse.json({ status: 'inactive' })
        }
      } finally {
        client.close()
      }
    }

    if (permanent) {
      await prisma.property.delete({ where: { id } })
      return NextResponse.json({ deleted: true })
    } else {
      const property = await prisma.property.update({
        where: { id },
        data: { status: 'inactive', dateLost: new Date() },
      })
      return NextResponse.json(property)
    }
  } catch (error) {
    console.error('Property DELETE error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
