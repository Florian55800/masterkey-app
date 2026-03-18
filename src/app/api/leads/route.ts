export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const leads = await prisma.lead.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json(leads)
  } catch (error) {
    console.error('Leads error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const lead = await prisma.lead.create({
      data: {
        nom: body.nom,
        email: body.email || null,
        telephone: body.telephone || null,
        adresseBien: body.adresseBien || null,
        ville: body.ville || null,
        typeBien: body.typeBien || null,
        nbChambres: body.nbChambres || null,
        surface: body.surface ? parseFloat(body.surface) : null,
        lienAnnonce: body.lienAnnonce || null,
        statut: body.statut || 'À contacter',
        commentaires: body.commentaires || null,
        dateContact: body.dateContact ? new Date(body.dateContact) : new Date(),
        relanceDate: body.relanceDate ? new Date(body.relanceDate) : null,
        relanceNote: body.relanceNote || null,
      },
    })
    return NextResponse.json(lead)
  } catch (error) {
    console.error('Lead create error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
