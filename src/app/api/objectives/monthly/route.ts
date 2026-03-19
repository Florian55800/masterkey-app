export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Generate all period keys we care about: March 2026 → December 2026 + Annual 2027
function getTargetPeriods() {
  const periods: { month: number; year: number; label: string; isAnnual: boolean }[] = []

  // Monthly: current month → December 2026
  const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
  const now = new Date()
  let m = now.getMonth() + 1
  let y = now.getFullYear()

  while (y < 2026 || (y === 2026 && m <= 12)) {
    periods.push({ month: m, year: y, label: `${MONTHS_FR[m - 1]} ${y}`, isAnnual: false })
    m++
    if (m > 12) { m = 1; y++ }
  }

  // Annual 2027 (month = 0)
  periods.push({ month: 0, year: 2027, label: '2027 — Annuel', isAnnual: true })

  return periods
}

export async function GET() {
  try {
    const periods = getTargetPeriods()

    // Fetch all stored objectives
    const storedObjectives = await prisma.monthlyObjective.findMany()

    // Fetch all monthly reports for actuals
    const reports = await prisma.monthlyReport.findMany({
      include: { teamGoals: true },
    })

    // Count leads per month from Lead table
    const leads = await prisma.lead.findMany({
      select: { createdAt: true, statut: true },
    })

    // Live count of active conciergerie properties (exclude sous-location — different business model)
    const conciergerieCount = await prisma.property.count({
      where: { status: 'active', typeGestion: 'conciergerie' },
    })

    const result = periods.map((period) => {
      const stored = storedObjectives.find(
        (o) => o.month === period.month && o.year === period.year
      )

      let actuals: {
        leads: number
        signatures: number
        visites: number
        appels: number
        caParLogement: number | null
        logements: number | null
      } | null = null

      if (!period.isAnnual) {
        const report = reports.find((r) => r.month === period.month && r.year === period.year)

        // Leads created this month
        const leadsThisMonth = leads.filter((l) => {
          const d = new Date(l.createdAt)
          return d.getMonth() + 1 === period.month && d.getFullYear() === period.year
        }).length

        // Visites: sum across team members for this report
        const teamGoalsForMonth = report ? report.teamGoals : []
        const totalVisites = teamGoalsForMonth.reduce((s, g) => s + g.appointmentsMade, 0)

        actuals = {
          leads: leadsThisMonth,
          signatures: report?.newSignatures ?? 0,
          visites: totalVisites,
          appels: 0,
          // caParLogement uses only conciergerie properties (sous-location excluded)
          caParLogement:
            report && conciergerieCount > 0
              ? Math.round(report.caBrut / conciergerieCount)
              : null,
          logements: conciergerieCount,
        }
      } else {
        // Annual 2027: no actuals yet
        actuals = null
      }

      return {
        month: period.month,
        year: period.year,
        label: period.label,
        isAnnual: period.isAnnual,
        targets: stored
          ? {
              leads: stored.targetLeads,
              signatures: stored.targetSignatures,
              visites: stored.targetVisites,
              appels: stored.targetAppels,
              caParLogement: stored.targetCAParLogement,
              logements: stored.targetLogements,
            }
          : null,
        actuals,
      }
    })

    return NextResponse.json({ periods: result })
  } catch (error) {
    console.error('Monthly objectives GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { month, year, targets } = body as {
      month: number
      year: number
      targets: {
        leads: number
        signatures: number
        visites: number
        appels: number
        caParLogement: number
        logements: number
      }
    }

    const objective = await prisma.monthlyObjective.upsert({
      where: { month_year: { month, year } },
      update: {
        targetLeads: targets.leads,
        targetSignatures: targets.signatures,
        targetVisites: targets.visites,
        targetAppels: targets.appels,
        targetCAParLogement: targets.caParLogement,
        targetLogements: targets.logements,
      },
      create: {
        month,
        year,
        targetLeads: targets.leads,
        targetSignatures: targets.signatures,
        targetVisites: targets.visites,
        targetAppels: targets.appels,
        targetCAParLogement: targets.caParLogement,
        targetLogements: targets.logements,
      },
    })

    return NextResponse.json(objective)
  } catch (error) {
    console.error('Monthly objectives POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
