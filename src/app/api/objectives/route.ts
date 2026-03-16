import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [activeProperties, cities, reports] = await Promise.all([
      prisma.property.count({ where: { status: 'active' } }),
      prisma.city.findMany({ orderBy: { name: 'asc' } }),
      prisma.monthlyReport.findMany({
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 12,
      }),
    ])

    const activeCities = cities.filter((c) => c.isActive).length
    const totalReports = reports.length
    const totalRevenue = reports.reduce((sum, r) => sum + r.caBrut, 0)
    const totalNights = reports.reduce((sum, r) => sum + r.totalNights, 0)

    const milestones = {
      properties: {
        current: activeProperties,
        milestones: [
          { value: 5, label: 'Premier pas', unlocked: activeProperties >= 5 },
          { value: 10, label: 'En route', unlocked: activeProperties >= 10 },
          { value: 25, label: 'En croissance', unlocked: activeProperties >= 25 },
          { value: 50, label: 'Leader local', unlocked: activeProperties >= 50 },
          { value: 100, label: 'Référence régionale', unlocked: activeProperties >= 100 },
        ],
      },
      cities: {
        current: activeCities,
        milestones: [
          { value: 1, label: 'Première ville', unlocked: activeCities >= 1 },
          { value: 3, label: 'Expansion régionale', unlocked: activeCities >= 3 },
          { value: 5, label: 'Couverture Lorraine', unlocked: activeCities >= 5 },
        ],
      },
      revenue: {
        current: totalRevenue,
        milestones: [
          { value: 10000, label: '10k€ CA', unlocked: totalRevenue >= 10000 },
          { value: 50000, label: '50k€ CA', unlocked: totalRevenue >= 50000 },
          { value: 100000, label: '100k€ CA', unlocked: totalRevenue >= 100000 },
        ],
      },
    }

    return NextResponse.json({ milestones, cities, activeProperties, activeCities, totalReports, totalRevenue, totalNights })
  } catch (error) {
    console.error('Objectives GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
