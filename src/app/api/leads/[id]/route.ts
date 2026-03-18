export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id)
    const body = await req.json()
    const lead = await prisma.lead.update({
      where: { id },
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
        statut: body.statut,
        commentaires: body.commentaires || null,
        dateContact: body.dateContact ? new Date(body.dateContact) : undefined,
        relanceDate: body.relanceDate ? new Date(body.relanceDate) : null,
        relanceNote: body.relanceNote || null,
      },
    })
    return NextResponse.json(lead)
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
