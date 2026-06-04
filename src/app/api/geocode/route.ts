export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

async function geocodeAddress(address: string, city: string): Promise<{ lat: number; lon: number } | null> {
  const query = encodeURIComponent(`${address}, ${city}, France`)
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'MasterKey-Dashboard/1.0 (masterkeys.services@gmail.com)' },
    })
    const data = await r.json()
    if (data.length === 0) return null
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

// POST /api/geocode — géocode une propriété et sauvegarde les coords
export async function POST(request: NextRequest) {
  const { propertyId, address, city } = await request.json()

  const coords = await geocodeAddress(address, city)
  if (!coords) {
    return NextResponse.json({ error: 'Adresse introuvable' }, { status: 404 })
  }

  if (process.env.TURSO_DATABASE_URL) {
    const { createClient } = require('@libsql/client')
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN || '',
    })
    try {
      await client.execute({
        sql: `UPDATE Property SET latitude = ?, longitude = ?, updatedAt = datetime('now') WHERE id = ?`,
        args: [coords.lat, coords.lon, propertyId],
      })
      return NextResponse.json({ latitude: coords.lat, longitude: coords.lon })
    } finally {
      client.close()
    }
  }

  await prisma.property.update({
    where: { id: propertyId },
    data: { latitude: coords.lat, longitude: coords.lon },
  })
  return NextResponse.json({ latitude: coords.lat, longitude: coords.lon })
}
