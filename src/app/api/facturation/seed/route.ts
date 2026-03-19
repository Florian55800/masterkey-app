export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/facturation/seed
 * Imports historical revenue data for conciergerie properties.
 * Call once from the Facturation page to pre-fill Aug 2025 → Feb 2026.
 * Idempotent — uses upsert so running it multiple times is safe.
 */
export async function POST() {
  try {
    // ── Fetch properties by name so we use real DB IDs ─────────────────────
    const props = await prisma.property.findMany({
      where: { typeGestion: 'conciergerie' },
      select: { id: true, name: true, commissionRate: true },
    })

    const byName = (keyword: string) => {
      const p = props.find((p) => p.name.toLowerCase().includes(keyword.toLowerCase()))
      if (!p) throw new Error(`Propriété introuvable : "${keyword}"`)
      return p
    }

    // ── Map property references (adjust keywords to match your DB names) ────
    // These names must partially match the property names you entered in the app.
    // If a property is not found the endpoint returns a 500 with the name.
    const metz      = byName('Metz')
    const commercy  = byName('Commercy')
    const lignyC    = byName('Ligny Centre')
    const lignyS    = byName('Studio Ligny')   // adjust if needed
    const nancy     = byName('Nancy')
    const bar       = byName('Bar')

    // ── Historical data — FILL IN YOUR ACTUAL NUMBERS HERE ────────────────
    // Format: { prop, month, year, platform, platformAmount, cleaningFees, commissionRate }
    // commissionRate is the % (e.g. 20 for 20%)
    // platformAmount = total Airbnb/Booking payout (frais ménage inclus)
    // cleaningFees   = frais de ménage à déduire du montant plateforme
    const revenues: {
      prop: { id: number; commissionRate: number }
      month: number
      year: number
      platform: string
      platformAmount: number
      cleaningFees: number
      commissionRate: number
    }[] = [
      // ── T2 Metz — 20% ──────────────────────────────────────────────────
      { prop: metz, month: 8,  year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 20 },
      { prop: metz, month: 9,  year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 20 },
      { prop: metz, month: 10, year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 20 },
      { prop: metz, month: 11, year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 20 },
      { prop: metz, month: 12, year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 20 },
      { prop: metz, month: 1,  year: 2026, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 20 },
      { prop: metz, month: 2,  year: 2026, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 20 },

      // ── T2 Commercy — 20% (puis 25%) ───────────────────────────────────
      { prop: commercy, month: 8,  year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 20 },
      { prop: commercy, month: 9,  year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 20 },
      { prop: commercy, month: 10, year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 20 },
      { prop: commercy, month: 11, year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 25 },
      { prop: commercy, month: 12, year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 25 },
      { prop: commercy, month: 1,  year: 2026, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 25 },
      { prop: commercy, month: 2,  year: 2026, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 25 },

      // ── T2 Ligny Centre — 25% ──────────────────────────────────────────
      { prop: lignyC, month: 8,  year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 25 },
      { prop: lignyC, month: 9,  year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 25 },
      { prop: lignyC, month: 10, year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 25 },
      { prop: lignyC, month: 11, year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 25 },
      { prop: lignyC, month: 12, year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 25 },
      { prop: lignyC, month: 1,  year: 2026, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 25 },
      { prop: lignyC, month: 2,  year: 2026, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 25 },

      // ── Studio Ligny — 25% ─────────────────────────────────────────────
      { prop: lignyS, month: 8,  year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 25 },
      { prop: lignyS, month: 9,  year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 25 },
      { prop: lignyS, month: 10, year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 25 },
      { prop: lignyS, month: 11, year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 25 },
      { prop: lignyS, month: 12, year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 25 },
      { prop: lignyS, month: 1,  year: 2026, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 25 },
      { prop: lignyS, month: 2,  year: 2026, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 25 },

      // ── Studio Gare Nancy — 25% ────────────────────────────────────────
      { prop: nancy, month: 8,  year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 25 },
      { prop: nancy, month: 9,  year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 25 },
      { prop: nancy, month: 10, year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 25 },
      { prop: nancy, month: 11, year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 25 },
      { prop: nancy, month: 12, year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 25 },
      { prop: nancy, month: 1,  year: 2026, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 25 },
      { prop: nancy, month: 2,  year: 2026, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 25 },

      // ── T2 Bar — 20% ───────────────────────────────────────────────────
      { prop: bar, month: 8,  year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 20 },
      { prop: bar, month: 9,  year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 20 },
      { prop: bar, month: 10, year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 20 },
      { prop: bar, month: 11, year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 20 },
      { prop: bar, month: 12, year: 2025, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 20 },
      { prop: bar, month: 1,  year: 2026, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 20 },
      { prop: bar, month: 2,  year: 2026, platform: 'airbnb',  platformAmount: 0, cleaningFees: 0, commissionRate: 20 },
    ]

    let created = 0
    for (const r of revenues) {
      // Only upsert entries that have actual amounts (skip empty placeholders)
      if (r.platformAmount === 0 && r.cleaningFees === 0) continue

      await prisma.propertyRevenue.upsert({
        where: {
          propertyId_month_year_platform: {
            propertyId: r.prop.id,
            month: r.month,
            year: r.year,
            platform: r.platform,
          },
        },
        update: {
          platformAmount: r.platformAmount,
          cleaningFees: r.cleaningFees,
          commissionRate: r.commissionRate,
        },
        create: {
          propertyId: r.prop.id,
          month: r.month,
          year: r.year,
          platform: r.platform,
          platformAmount: r.platformAmount,
          cleaningFees: r.cleaningFees,
          commissionRate: r.commissionRate,
        },
      })
      created++
    }

    return NextResponse.json({
      ok: true,
      created,
      message: `${created} entrées importées. Les lignes avec montant=0 ont été ignorées — remplis les montants dans le fichier seed.`,
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
