export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://api.lodgify.com'

function headers() {
  return {
    'X-ApiKey': process.env.LODGIFY_API_KEY ?? '',
    'Content-Type': 'application/json',
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const filter    = searchParams.get('filter') ?? 'Upcoming'   // Upcoming | Historic | All
  const page      = searchParams.get('page')   ?? '1'
  const size      = searchParams.get('size')   ?? '50'
  const propertyId = searchParams.get('propertyId') ?? ''

  try {
    let url = `${BASE}/v2/reservations/bookings?stayFilter=${filter}&page=${page}&size=${size}&includeCount=true`
    if (propertyId) url += `&propertyId=${propertyId}`

    const res = await fetch(url, { headers: headers() })
    if (!res.ok) return NextResponse.json({ error: `Lodgify ${res.status}` }, { status: res.status })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
