export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const onboarding = await (prisma as any).ownerOnboarding.findUnique({
      where: { ownerId: Number(params.id) },
    })
    return NextResponse.json(onboarding ?? null)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const ownerId = Number(params.id)

    const data = {
      nomPrenom:             body.nomPrenom             ?? null,
      adresseDomicile:       body.adresseDomicile       ?? null,
      telephone:             body.telephone             ?? null,
      villeLogement:         body.villeLogement         ?? null,
      adresseLogement:       body.adresseLogement       ?? null,
      typeBien:              body.typeBien              ?? null,
      arriveeAutonome:       body.arriveeAutonome       ?? null,
      codeBoiteACles:        body.codeBoiteACles        ?? null,
      surface:               body.surface               ?? null,
      nbChambres:            body.nbChambres            ?? null,
      nbSallesBain:          body.nbSallesBain          ?? null,
      etage:                 body.etage                 ?? null,
      accessible:            body.accessible            ?? null,
      equipements:           body.equipements           ?? null,
      wifiNom:               body.wifiNom               ?? null,
      wifiMdp:               body.wifiMdp               ?? null,
      consignesPoubelles:    body.consignesPoubelles    ?? null,
      reglementInterieur:    body.reglementInterieur    ?? null,
      instructionsAppareils: body.instructionsAppareils ?? null,
      styleDecoration:       body.styleDecoration       ?? null,
      themeParticularite:    body.themeParticularite    ?? null,
      dejaEnLocation:        body.dejaEnLocation        ?? null,
      lienAnnonce:           body.lienAnnonce           ?? null,
      disponibiliteMois:     body.disponibiliteMois     ?? null,
      occupe:                body.occupe                ?? null,
      detecteurFumee:        body.detecteurFumee        ?? null,
      emplacementElectrique: body.emplacementElectrique ?? null,
      extincteur:            body.extincteur            ?? null,
      piscine:               body.piscine               ?? null,
      prixMoyenNuit:         body.prixMoyenNuit         ?? null,
      tauxOccupation:        body.tauxOccupation        ?? null,
      revenusMenuels:        body.revenusMenuels        ?? null,
      fraisMensuels:         body.fraisMensuels         ?? null,
      maximiserRevenus:      body.maximiserRevenus      ?? null,
    }

    const onboarding = await (prisma as any).ownerOnboarding.upsert({
      where: { ownerId },
      create: { ownerId, ...data },
      update: data,
    })

    return NextResponse.json(onboarding)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
