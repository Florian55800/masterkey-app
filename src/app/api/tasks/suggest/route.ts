export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function daysAgo(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

export async function GET() {
  try {
    const now = new Date()
    const today = now.toISOString().split('T')[0]

    const [leads, owners, properties, lastReport] = await Promise.all([
      prisma.lead.findMany({
        where: { statut: { not: 'Mort' } },
        select: { id: true, nom: true, statut: true, statuts: true, relanceDate: true, dateContact: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.owner.findMany({
        select: { id: true, name: true, relanceDate: true, phone: true },
      }),
      prisma.property.count({ where: { status: 'active' } }),
      prisma.monthlyReport.findFirst({
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        select: { month: true, year: true, caBrut: true },
      }),
    ])

    const suggestions: { title: string; type: string; priority: 'high' | 'medium' | 'low' }[] = []

    // ── Relances clients en retard ────────────────────────────────────────────
    const overdueOwners = owners.filter(o => o.relanceDate && new Date(o.relanceDate as unknown as string) < now)
    if (overdueOwners.length === 1) {
      suggestions.push({
        title: `📞 Rappeler ${overdueOwners[0].name} — relance en retard`,
        type: 'appel',
        priority: 'high',
      })
    } else if (overdueOwners.length > 1) {
      suggestions.push({
        title: `📞 ${overdueOwners.length} relances clients en retard à traiter`,
        type: 'appel',
        priority: 'high',
      })
    }

    // ── Leads overdue ──────────────────────────────────────────────────────────
    const overdueLeads = leads.filter(l => l.relanceDate && new Date(l.relanceDate as unknown as string) < now)
    if (overdueLeads.length === 1) {
      suggestions.push({
        title: `🎯 Relancer ${overdueLeads[0].nom} — prospect en attente`,
        type: 'appel',
        priority: 'high',
      })
    } else if (overdueLeads.length > 1) {
      suggestions.push({
        title: `🎯 ${overdueLeads.length} prospects à relancer en retard`,
        type: 'appel',
        priority: 'high',
      })
    }

    // ── Leads "À contacter" récents ────────────────────────────────────────────
    const toContact = leads.filter(l => {
      const statuts = l.statuts ? JSON.parse(l.statuts) : [l.statut]
      return statuts.includes('À contacter')
    })
    if (toContact.length > 0) {
      const recent = toContact.filter(l => daysAgo(l.dateContact as unknown as string) <= 7)
      if (recent.length > 0) {
        suggestions.push({
          title: `📋 Contacter ${recent.length} nouveau${recent.length > 1 ? 'x' : ''} lead${recent.length > 1 ? 's' : ''} cette semaine`,
          type: 'appel',
          priority: 'medium',
        })
      }
    }

    // ── Leads "En passe de signer" ────────────────────────────────────────────
    const hotLeads = leads.filter(l => {
      const statuts = l.statuts ? JSON.parse(l.statuts) : [l.statut]
      return statuts.includes('En passe de signer')
    })
    if (hotLeads.length > 0) {
      suggestions.push({
        title: `🏆 Finaliser ${hotLeads.length} dossier${hotLeads.length > 1 ? 's' : ''} en passe de signer`,
        type: 'reunion',
        priority: 'high',
      })
    }

    // ── Facturation du mois précédent non saisie ──────────────────────────────
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth()
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    const prevMonthNames = ['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
    const hasLastMonthReport = lastReport && lastReport.month === prevMonth && lastReport.year === prevYear && (lastReport.caBrut ?? 0) > 0
    if (!hasLastMonthReport && now.getDate() <= 15) {
      suggestions.push({
        title: `💰 Saisir la facturation de ${prevMonthNames[prevMonth]} ${prevYear}`,
        type: 'autre',
        priority: 'high',
      })
    }

    // ── Leads "Follow up" sans relance planifiée ───────────────────────────────
    const followUpNoDate = leads.filter(l => {
      const statuts = l.statuts ? JSON.parse(l.statuts) : [l.statut]
      return statuts.includes('Follow up') && !l.relanceDate
    })
    if (followUpNoDate.length > 0) {
      suggestions.push({
        title: `⏰ Planifier une relance pour ${followUpNoDate.length} prospect${followUpNoDate.length > 1 ? 's' : ''} en follow up`,
        type: 'email',
        priority: 'medium',
      })
    }

    // ── Croissance ────────────────────────────────────────────────────────────
    if (properties < 10) {
      suggestions.push({
        title: `🚀 Prospecter de nouveaux propriétaires — objectif ${properties + 2} logements`,
        type: 'appel',
        priority: 'low',
      })
    } else {
      suggestions.push({
        title: `📢 Publier une annonce ou post réseau social pour attirer de nouveaux propriétaires`,
        type: 'autre',
        priority: 'low',
      })
    }

    // ── Relances clients à venir today ────────────────────────────────────────
    const todayRelances = owners.filter(o => {
      if (!o.relanceDate) return false
      const d = new Date(o.relanceDate as unknown as string).toISOString().split('T')[0]
      return d === today
    })
    if (todayRelances.length > 0) {
      todayRelances.forEach(o => {
        suggestions.push({
          title: `📞 Relancer ${o.name} aujourd'hui`,
          type: 'appel',
          priority: 'high',
        })
      })
    }

    // Sort: high first, then medium, then low
    const order = { high: 0, medium: 1, low: 2 }
    suggestions.sort((a, b) => order[a.priority] - order[b.priority])

    return NextResponse.json(suggestions.slice(0, 6))
  } catch (error) {
    console.error('Suggest error:', error)
    return NextResponse.json([], { status: 200 })
  }
}
