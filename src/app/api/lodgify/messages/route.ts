export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://api.lodgify.com'
function headers() {
  return { 'X-ApiKey': process.env.LODGIFY_API_KEY ?? '', 'Content-Type': 'application/json' }
}

// GET /api/lodgify/messages          → list threads
// GET /api/lodgify/messages?uid=xxx  → thread detail
export async function GET(req: NextRequest) {
  const uid = new URL(req.url).searchParams.get('uid')
  try {
    const url = uid
      ? `${BASE}/v2/messaging/${uid}`
      : `${BASE}/v2/messaging?size=50`
    const res = await fetch(url, { headers: headers() })
    if (!res.ok) return NextResponse.json({ error: `Lodgify ${res.status}` }, { status: res.status })
    return NextResponse.json(await res.json())
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// POST /api/lodgify/messages  { uid, message }  → send message
export async function POST(req: NextRequest) {
  const { uid, message } = await req.json()
  try {
    const res = await fetch(`${BASE}/v2/messaging/${uid}`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ message }),
    })
    if (!res.ok) return NextResponse.json({ error: `Lodgify ${res.status}` }, { status: res.status })
    return NextResponse.json(await res.json())
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
