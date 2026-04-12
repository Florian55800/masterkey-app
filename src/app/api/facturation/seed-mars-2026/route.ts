export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const props = await (prisma as any).property.findMany({
    select: { id: true, name: true, typeGestion: true, status: true, lodgifyId: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(props)
}

/**
 * POST /api/facturation/seed-mars-2026
 * Met à jour uniquement nbSejours et nbNuits pour mars 2026
 * à partir du rapport OTC Smoobu. N'écrase pas les montants déjà saisis.
 */
export async function POST() {
  try {
    const props = await (prisma as any).property.findMany({
      select: { id: true, name: true },
    })

    const byName = (keyword: string) => {
      const p = props.find((p: any) =>
        p.name.toLowerCase().includes(keyword.toLowerCase())
      )
      if (!p) throw new Error(`Propriété introuvable : "${keyword}" — vérifie le nom dans Logements`)
      return p as { id: number; name: string }
    }

    const bar         = byName('Bar')
    const commercy    = byName('Commercy')
    const lignyT2     = byName('Grand Salon')
    const lignyStudio = byName('Centre Ligny')
    const nancy       = byName('Rives')
    const rochelle    = byName('Rochelle')
    const stanislas   = byName('Chaleureux')
    const stDizier    = byName('Dizier')
    const hyperNancy  = byName('Hyper')

    const data = [
      // Bar-le-Duc
      { prop: bar,          platform: 'airbnb',  nbSejours: 2,  nbNuits: 9  },
      { prop: bar,          platform: 'booking', nbSejours: 4,  nbNuits: 13 },
      // Commercy
      { prop: commercy,     platform: 'airbnb',  nbSejours: 4,  nbNuits: 24 },
      { prop: commercy,     platform: 'booking', nbSejours: 1,  nbNuits: 2  },
      // T2 Cosy Ligny
      { prop: lignyT2,      platform: 'airbnb',  nbSejours: 1,  nbNuits: 3  },
      // Studio Nancy Rives de Meurthe
      { prop: nancy,        platform: 'airbnb',  nbSejours: 6,  nbNuits: 12 },
      { prop: nancy,        platform: 'booking', nbSejours: 5,  nbNuits: 8  },
      // Studio Rochelle
      { prop: rochelle,     platform: 'airbnb',  nbSejours: 8,  nbNuits: 18 },
      // Studio Ligny Centre
      { prop: lignyStudio,  platform: 'airbnb',  nbSejours: 4,  nbNuits: 11 },
      { prop: lignyStudio,  platform: 'booking', nbSejours: 4,  nbNuits: 7  },
      // T4 Stanislas
      { prop: stanislas,    platform: 'airbnb',  nbSejours: 1,  nbNuits: 1  },
      // Saint-Dizier
      { prop: stDizier,     platform: 'airbnb',  nbSejours: 1,  nbNuits: 1  },
      { prop: stDizier,     platform: 'booking', nbSejours: 1,  nbNuits: 2  },
      // T2 Hyper-Centre Nancy
      { prop: hyperNancy,   platform: 'booking', nbSejours: 1,  nbNuits: 3  },
    ]

    let updated = 0
    let created = 0

    for (const row of data) {
      const where = {
        propertyId_month_year_platform: {
          propertyId: row.prop.id,
          month: 3,
          year: 2026,
          platform: row.platform,
        },
      }
      const existing = await (prisma as any).propertyRevenue.findUnique({ where })
      if (existing) {
        await (prisma as any).propertyRevenue.update({
          where,
          data: { nbSejours: row.nbSejours, nbNuits: row.nbNuits },
        })
        updated++
      } else {
        await (prisma as any).propertyRevenue.create({
          data: {
            propertyId: row.prop.id,
            month: 3,
            year: 2026,
            platform: row.platform,
            platformAmount: 0,
            cleaningFees: 0,
            commissionRate: 0,
            nbSejours: row.nbSejours,
            nbNuits: row.nbNuits,
          },
        })
        created++
      }
    }

    return NextResponse.json({
      ok: true,
      updated,
      created,
      message: `✓ ${updated} revenus mis à jour + ${created} créés — séjours/nuits mars 2026`,
    })
  } catch (error) {
    console.error('Seed mars-2026 error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
