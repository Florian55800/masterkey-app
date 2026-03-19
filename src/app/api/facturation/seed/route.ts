export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/facturation/seed
 * Importe toutes les données historiques Aug 2025 → Fév 2026
 * depuis "Mes Comptes Airbnb & Conciergerie.xlsx".
 * Idempotent — upsert, peut être lancé plusieurs fois sans doublon.
 */
export async function POST() {
  try {
    const props = await prisma.property.findMany({
      select: { id: true, name: true, typeGestion: true },
    })

    const byName = (keyword: string) => {
      const p = props.find((p) =>
        p.name.toLowerCase().includes(keyword.toLowerCase())
      )
      if (!p) throw new Error(`Propriété introuvable : "${keyword}" — vérifie le nom dans Logements`)
      return p
    }

    const metz     = byName('Metz')
    const commercy = byName('Commercy')
    const lignyC   = byName('Ligny Centre')
    const lignyS   = byName('Studio Ligny')
    const nancy    = byName('Nancy')
    const bar      = byName('Bar')
    const rochelle = byName('Rochelle')

    // ── Revenus conciergerie ───────────────────────────────────────────────────
    // Données extraites de Conciergerie_Mensuel
    // platformAmount = montant reversé par la plateforme (€)
    // cleaningFees   = frais de ménage facturés (€)
    const revenues = [
      // ── Août 2025 ──────────────────────────────────────────────────────────
      { prop: metz,     month: 8,  year: 2025, platform: 'airbnb',  platformAmount: 1503.06, cleaningFees: 450.00, commissionRate: 20 },
      { prop: metz,     month: 8,  year: 2025, platform: 'booking', platformAmount:  712.87, cleaningFees:   0.00, commissionRate: 20 },
      { prop: commercy, month: 8,  year: 2025, platform: 'airbnb',  platformAmount:  479.14, cleaningFees:  87.40, commissionRate: 25 },
      { prop: lignyC,   month: 8,  year: 2025, platform: 'airbnb',  platformAmount:  634.77, cleaningFees:  80.00, commissionRate: 25 },
      { prop: lignyS,   month: 8,  year: 2025, platform: 'airbnb',  platformAmount:  331.93, cleaningFees:  60.00, commissionRate: 25 },
      { prop: nancy,    month: 8,  year: 2025, platform: 'airbnb',  platformAmount:  123.49, cleaningFees: 100.00, commissionRate: 25 },
      { prop: nancy,    month: 8,  year: 2025, platform: 'booking', platformAmount:  106.36, cleaningFees:   0.00, commissionRate: 25 },

      // ── Septembre 2025 ─────────────────────────────────────────────────────
      { prop: metz,     month: 9,  year: 2025, platform: 'airbnb',  platformAmount:  403.44, cleaningFees: 240.00, commissionRate: 20 },
      { prop: metz,     month: 9,  year: 2025, platform: 'booking', platformAmount: 1582.18, cleaningFees: 240.00, commissionRate: 20 },
      { prop: commercy, month: 9,  year: 2025, platform: 'airbnb',  platformAmount:  408.36, cleaningFees: 127.50, commissionRate: 25 },
      { prop: commercy, month: 9,  year: 2025, platform: 'booking', platformAmount:  234.89, cleaningFees: 127.50, commissionRate: 25 },
      { prop: lignyC,   month: 9,  year: 2025, platform: 'airbnb',  platformAmount:  636.45, cleaningFees:  45.00, commissionRate: 25 },
      { prop: lignyC,   month: 9,  year: 2025, platform: 'booking', platformAmount:  393.02, cleaningFees:  90.00, commissionRate: 25 },
      { prop: lignyS,   month: 9,  year: 2025, platform: 'booking', platformAmount:  148.48, cleaningFees:  45.00, commissionRate: 25 },
      { prop: nancy,    month: 9,  year: 2025, platform: 'airbnb',  platformAmount:  343.75, cleaningFees: 110.00, commissionRate: 25 },
      { prop: nancy,    month: 9,  year: 2025, platform: 'booking', platformAmount:  591.68, cleaningFees: 110.00, commissionRate: 25 },

      // ── Octobre 2025 ───────────────────────────────────────────────────────
      { prop: metz,     month: 10, year: 2025, platform: 'airbnb',  platformAmount:  837.22, cleaningFees: 150.00, commissionRate: 20 },
      { prop: metz,     month: 10, year: 2025, platform: 'booking', platformAmount:  782.04, cleaningFees: 150.00, commissionRate: 20 },
      { prop: commercy, month: 10, year: 2025, platform: 'airbnb',  platformAmount:  480.52, cleaningFees: 138.00, commissionRate: 20 },
      { prop: commercy, month: 10, year: 2025, platform: 'booking', platformAmount:  390.82, cleaningFees: 138.00, commissionRate: 20 },
      { prop: lignyC,   month: 10, year: 2025, platform: 'airbnb',  platformAmount:  535.00, cleaningFees:  62.50, commissionRate: 25 },
      { prop: lignyC,   month: 10, year: 2025, platform: 'booking', platformAmount:  123.59, cleaningFees:  62.50, commissionRate: 25 },
      { prop: lignyS,   month: 10, year: 2025, platform: 'airbnb',  platformAmount:  535.00, cleaningFees:  62.50, commissionRate: 25 },
      { prop: lignyS,   month: 10, year: 2025, platform: 'booking', platformAmount:  123.59, cleaningFees:  62.50, commissionRate: 25 },
      { prop: nancy,    month: 10, year: 2025, platform: 'booking', platformAmount: 1260.77, cleaningFees:  80.00, commissionRate: 25 },

      // ── Novembre 2025 ──────────────────────────────────────────────────────
      { prop: metz,     month: 11, year: 2025, platform: 'airbnb',  platformAmount: 1528.37, cleaningFees: 120.00, commissionRate: 20 },
      { prop: metz,     month: 11, year: 2025, platform: 'booking', platformAmount:  403.79, cleaningFees: 120.00, commissionRate: 20 },
      { prop: commercy, month: 11, year: 2025, platform: 'airbnb',  platformAmount:   54.79, cleaningFees:   0.00, commissionRate: 20 },
      { prop: commercy, month: 11, year: 2025, platform: 'booking', platformAmount:  515.02, cleaningFees: 190.20, commissionRate: 20 },
      { prop: lignyC,   month: 11, year: 2025, platform: 'airbnb',  platformAmount:  528.00, cleaningFees:  81.25, commissionRate: 25 },
      { prop: lignyC,   month: 11, year: 2025, platform: 'booking', platformAmount:  474.00, cleaningFees:  81.25, commissionRate: 25 },
      { prop: lignyS,   month: 11, year: 2025, platform: 'airbnb',  platformAmount:  528.00, cleaningFees:  81.25, commissionRate: 25 },
      { prop: lignyS,   month: 11, year: 2025, platform: 'booking', platformAmount:  474.00, cleaningFees:  81.25, commissionRate: 25 },
      { prop: nancy,    month: 11, year: 2025, platform: 'airbnb',  platformAmount:  204.58, cleaningFees: 100.00, commissionRate: 25 },
      { prop: nancy,    month: 11, year: 2025, platform: 'booking', platformAmount:  916.00, cleaningFees: 100.00, commissionRate: 25 },

      // ── Décembre 2025 ──────────────────────────────────────────────────────
      { prop: metz,     month: 12, year: 2025, platform: 'airbnb',  platformAmount: 1363.70, cleaningFees: 150.00, commissionRate: 20 },
      { prop: metz,     month: 12, year: 2025, platform: 'booking', platformAmount:  911.49, cleaningFees: 150.00, commissionRate: 20 },
      { prop: commercy, month: 12, year: 2025, platform: 'airbnb',  platformAmount:  257.48, cleaningFees:  66.00, commissionRate: 20 },
      { prop: commercy, month: 12, year: 2025, platform: 'booking', platformAmount:  563.02, cleaningFees:  66.00, commissionRate: 20 },
      { prop: lignyC,   month: 12, year: 2025, platform: 'airbnb',  platformAmount:  562.29, cleaningFees:  38.50, commissionRate: 25 },
      { prop: lignyC,   month: 12, year: 2025, platform: 'booking', platformAmount:   75.00, cleaningFees:  38.50, commissionRate: 25 },
      { prop: lignyS,   month: 12, year: 2025, platform: 'airbnb',  platformAmount:  562.29, cleaningFees:  38.50, commissionRate: 25 },
      { prop: lignyS,   month: 12, year: 2025, platform: 'booking', platformAmount:   75.00, cleaningFees:  38.50, commissionRate: 25 },
      { prop: nancy,    month: 12, year: 2025, platform: 'airbnb',  platformAmount:  210.86, cleaningFees:  90.00, commissionRate: 25 },
      { prop: nancy,    month: 12, year: 2025, platform: 'booking', platformAmount:  810.91, cleaningFees:  90.00, commissionRate: 25 },
      { prop: bar,      month: 12, year: 2025, platform: 'booking', platformAmount:  168.79, cleaningFees:  60.00, commissionRate: 20 },

      // ── Janvier 2026 ───────────────────────────────────────────────────────
      { prop: metz,     month: 1,  year: 2026, platform: 'airbnb',  platformAmount: 2083.89, cleaningFees:  90.00, commissionRate: 20 },
      { prop: metz,     month: 1,  year: 2026, platform: 'booking', platformAmount:  264.99, cleaningFees:  90.00, commissionRate: 20 },
      { prop: commercy, month: 1,  year: 2026, platform: 'airbnb',  platformAmount:  139.14, cleaningFees: 123.10, commissionRate: 20 },
      { prop: commercy, month: 1,  year: 2026, platform: 'booking', platformAmount:   59.17, cleaningFees:   0.00, commissionRate: 20 },
      { prop: lignyC,   month: 1,  year: 2026, platform: 'airbnb',  platformAmount:  446.48, cleaningFees: 198.00, commissionRate: 25 },
      { prop: lignyC,   month: 1,  year: 2026, platform: 'booking', platformAmount:   64.77, cleaningFees:   0.00, commissionRate: 25 },
      { prop: lignyS,   month: 1,  year: 2026, platform: 'airbnb',  platformAmount:  446.48, cleaningFees:   0.00, commissionRate: 25 },
      { prop: nancy,    month: 1,  year: 2026, platform: 'airbnb',  platformAmount:  154.03, cleaningFees: 100.00, commissionRate: 25 },
      { prop: nancy,    month: 1,  year: 2026, platform: 'booking', platformAmount:  319.46, cleaningFees: 100.00, commissionRate: 25 },
      { prop: bar,      month: 1,  year: 2026, platform: 'airbnb',  platformAmount:  134.37, cleaningFees:  80.00, commissionRate: 20 },
      { prop: bar,      month: 1,  year: 2026, platform: 'booking', platformAmount:  363.63, cleaningFees:  80.00, commissionRate: 20 },

      // ── Février 2026 ───────────────────────────────────────────────────────
      { prop: metz,     month: 2,  year: 2026, platform: 'airbnb',  platformAmount: 1629.02, cleaningFees:  90.00, commissionRate: 20 },
      { prop: commercy, month: 2,  year: 2026, platform: 'airbnb',  platformAmount:  635.26, cleaningFees:  35.00, commissionRate: 20 },
      { prop: lignyC,   month: 2,  year: 2026, platform: 'airbnb',  platformAmount:  248.15, cleaningFees:  38.50, commissionRate: 25 },
      { prop: lignyC,   month: 2,  year: 2026, platform: 'booking', platformAmount:  159.00, cleaningFees:  38.50, commissionRate: 25 },
      { prop: lignyS,   month: 2,  year: 2026, platform: 'airbnb',  platformAmount:  248.15, cleaningFees:  38.50, commissionRate: 25 },
      { prop: lignyS,   month: 2,  year: 2026, platform: 'booking', platformAmount:  159.00, cleaningFees:  38.50, commissionRate: 25 },
      { prop: nancy,    month: 2,  year: 2026, platform: 'airbnb',  platformAmount:  185.88, cleaningFees: 110.00, commissionRate: 25 },
      { prop: nancy,    month: 2,  year: 2026, platform: 'booking', platformAmount:  852.56, cleaningFees: 110.00, commissionRate: 25 },
      { prop: bar,      month: 2,  year: 2026, platform: 'airbnb',  platformAmount:  314.20, cleaningFees: 100.00, commissionRate: 20 },
      { prop: bar,      month: 2,  year: 2026, platform: 'booking', platformAmount:  390.75, cleaningFees: 100.00, commissionRate: 20 },

      // ── Sous-location : Studio Quartier Rochelle — revenus plateforme ──────
      { prop: rochelle, month: 8,  year: 2025, platform: 'airbnb',  platformAmount: 436.82, cleaningFees: 0, commissionRate: 0 },
      { prop: rochelle, month: 8,  year: 2025, platform: 'booking', platformAmount: 646.56, cleaningFees: 0, commissionRate: 0 },
      { prop: rochelle, month: 9,  year: 2025, platform: 'airbnb',  platformAmount: 614.18, cleaningFees: 0, commissionRate: 0 },
      { prop: rochelle, month: 9,  year: 2025, platform: 'booking', platformAmount: 344.08, cleaningFees: 0, commissionRate: 0 },
      { prop: rochelle, month: 10, year: 2025, platform: 'booking', platformAmount: 948.29, cleaningFees: 0, commissionRate: 0 },
      { prop: rochelle, month: 11, year: 2025, platform: 'airbnb',  platformAmount: 422.39, cleaningFees: 0, commissionRate: 0 },
      { prop: rochelle, month: 11, year: 2025, platform: 'booking', platformAmount: 371.01, cleaningFees: 0, commissionRate: 0 },
      { prop: rochelle, month: 12, year: 2025, platform: 'airbnb',  platformAmount: 362.88, cleaningFees: 0, commissionRate: 0 },
      { prop: rochelle, month: 12, year: 2025, platform: 'booking', platformAmount: 586.20, cleaningFees: 0, commissionRate: 0 },
      { prop: rochelle, month: 1,  year: 2026, platform: 'airbnb',  platformAmount: 512.01, cleaningFees: 0, commissionRate: 0 },
      { prop: rochelle, month: 1,  year: 2026, platform: 'booking', platformAmount: 159.87, cleaningFees: 0, commissionRate: 0 },
      { prop: rochelle, month: 2,  year: 2026, platform: 'airbnb',  platformAmount: 580.68, cleaningFees: 0, commissionRate: 0 },
      { prop: rochelle, month: 2,  year: 2026, platform: 'booking', platformAmount: 412.56, cleaningFees: 0, commissionRate: 0 },
    ]

    // ── Charges sous-location : Studio Quartier Rochelle ──────────────────────
    // Loyer 300€ / EDF 143€ / Internet 23.22€ / Autres 14€ — constant chaque mois
    const subletExpenses = [
      { prop: rochelle, month: 8,  year: 2025, loyer: 300, electricite: 143, wifi: 23.22, autresCharges: 14 },
      { prop: rochelle, month: 9,  year: 2025, loyer: 300, electricite: 143, wifi: 23.22, autresCharges: 14 },
      { prop: rochelle, month: 10, year: 2025, loyer: 300, electricite: 143, wifi: 23.22, autresCharges: 14 },
      { prop: rochelle, month: 11, year: 2025, loyer: 300, electricite: 143, wifi: 23.22, autresCharges: 14 },
      { prop: rochelle, month: 12, year: 2025, loyer: 300, electricite: 143, wifi: 23.22, autresCharges: 14 },
      { prop: rochelle, month: 1,  year: 2026, loyer: 300, electricite: 143, wifi: 23.22, autresCharges: 14 },
      { prop: rochelle, month: 2,  year: 2026, loyer: 300, electricite: 143, wifi: 23.22, autresCharges: 14 },
    ]

    let revenuesCreated = 0
    let expensesCreated = 0

    // Upsert all revenues
    for (const r of revenues) {
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
      revenuesCreated++
    }

    // Upsert all sublet expenses
    for (const e of subletExpenses) {
      await prisma.subletExpense.upsert({
        where: {
          propertyId_month_year: {
            propertyId: e.prop.id,
            month: e.month,
            year: e.year,
          },
        },
        update: {
          loyer: e.loyer,
          electricite: e.electricite,
          wifi: e.wifi,
          autresCharges: e.autresCharges,
        },
        create: {
          propertyId: e.prop.id,
          month: e.month,
          year: e.year,
          loyer: e.loyer,
          electricite: e.electricite,
          wifi: e.wifi,
          autresCharges: e.autresCharges,
        },
      })
      expensesCreated++
    }

    return NextResponse.json({
      ok: true,
      revenuesCreated,
      expensesCreated,
      message: `✓ ${revenuesCreated} revenus + ${expensesCreated} charges sous-location importés (Août 2025 → Fév 2026)`,
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
