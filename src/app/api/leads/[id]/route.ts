export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Maps a statut label to its MonthlyObjective field
function objectiveField(label: string): 'actualSignatures' | 'actualVisites' | 'actualAppels' | null {
  const l = label.toLowerCase()
  if (l.includes('sign')) return 'actualSignatures'
  if (l.includes('visite')) return 'actualVisites'
  if (l.includes('appel')) return 'actualAppels'
  return null
}

async function updateObjectives(added: string[], removed: string[]) {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const delta: Record<string, number> = {}
  for (const s of added)   { const f = objectiveField(s); if (f) delta[f] = (delta[f] ?? 0) + 1 }
  for (const s of removed) { const f = objectiveField(s); if (f) delta[f] = (delta[f] ?? 0) - 1 }

  if (Object.keys(delta).length === 0) return

  // Ensure the row exists first
  const existing = await prisma.monthlyObjective.findUnique({ where: { month_year: { month, year } } })

  if (existing) {
    await prisma.monthlyObjective.update({
      where: { month_year: { month, year } },
      data: Object.fromEntries(
        Object.entries(delta).map(([field, inc]) => [
          field,
          { increment: inc }
        ])
      ),
    })
  } else {
    const base = { month, year, targetLeads: 0, targetSignatures: 0, targetVisites: 0, targetAppels: 0, targetCAParLogement: 0, targetLogements: 0 }
    await prisma.monthlyObjective.create({
      data: {
        ...base,
        actualSignatures: delta['actualSignatures'] ?? 0,
        actualVisites:    delta['actualVisites']    ?? 0,
        actualAppels:     delta['actualAppels']     ?? 0,
      },
    })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id)
    const body = await req.json()

    // Fetch current lead to compute statuts diff
    const current = await prisma.lead.findUnique({ where: { id }, select: { statut: true, statuts: true } })
    const oldStatuts: string[] = current?.statuts ? JSON.parse(current.statuts) : (current?.statut ? [current.statut] : [])

    // New statuts: prefer body.statuts array, fallback to [body.statut]
    const newStatuts: string[] = Array.isArray(body.statuts) ? body.statuts : (body.statut ? [body.statut] : [])

    const added   = newStatuts.filter(s => !oldStatuts.includes(s))
    const removed = oldStatuts.filter(s => !newStatuts.includes(s))

    // Update objectives asynchronously (don't fail the lead save if this fails)
    updateObjectives(added, removed).catch(e => console.error('Objective update error:', e))

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        nom:          body.nom,
        email:        body.email        || null,
        telephone:    body.telephone    || null,
        adresseBien:  body.adresseBien  || null,
        ville:        body.ville        || null,
        typeBien:     body.typeBien     || null,
        nbChambres:   body.nbChambres   || null,
        surface:      body.surface ? parseFloat(body.surface) : null,
        lienAnnonce:  body.lienAnnonce  || null,
        statut:       newStatuts[0] ?? body.statut ?? 'À contacter',
        statuts:      JSON.stringify(newStatuts),
        commentaires: body.commentaires || null,
        dateContact:  body.dateContact ? new Date(body.dateContact) : undefined,
        relanceDate:  body.relanceDate  ? new Date(body.relanceDate) : null,
        relanceNote:  body.relanceNote  || null,
      },
    })
    return NextResponse.json({ ...lead, statuts: newStatuts })
  } catch (error) {
    console.error('Lead update error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.lead.delete({ where: { id: parseInt(params.id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Lead delete error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
