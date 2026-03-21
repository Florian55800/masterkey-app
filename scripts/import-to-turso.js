/**
 * import-to-turso.js
 * Importe les données locales (SQLite) vers Turso production.
 * Usage : node scripts/import-to-turso.js
 */

const { createClient } = require('@libsql/client')

async function main() {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url || !authToken) {
    console.error('❌ TURSO_DATABASE_URL et TURSO_AUTH_TOKEN requis')
    process.exit(1)
  }

  console.log('🔌 Connexion à Turso...')
  const client = createClient({ url, authToken })

  // ── 1. Owners ──────────────────────────────────────────────────────────────
  console.log('📥 Import des propriétaires...')
  const owners = [
    { id: 1, name: 'Morgan Zappula', phone: null, email: null, notes: 'Propriétaire très investi, souhaite maximiser ses revenus locatifs.', contractStart: null, contractEnd: null, nextAction: null, source: 'Partenaire', createdAt: 1773679204579, updatedAt: 1773698081757 },
    { id: 2, name: 'Sophie Durand', phone: '06 98 76 54 32', email: 'sophie.durand@outlook.fr', notes: 'Nouvellement propriétaire, besoin d\'accompagnement.', contractStart: 1707955200000, contractEnd: 1775001600000, nextAction: 'Présenter nouveau package premium', source: 'Réseau social', createdAt: 1773679204579, updatedAt: 1773679204579 },
    { id: 3, name: 'Michel Bernard', phone: '06 55 44 33 22', email: 'm.bernard@free.fr', notes: 'Propriétaire de longue date, très satisfait des services.', contractStart: 1710028800000, contractEnd: 1774396800000, nextAction: 'Proposition bien supplémentaire', source: 'Bouche à oreille', createdAt: 1773679204580, updatedAt: 1773679204580 },
  ]

  for (const o of owners) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO Owner (id, name, phone, email, notes, contractStart, contractEnd, nextAction, source, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [o.id, o.name, o.phone, o.email, o.notes, o.contractStart, o.contractEnd, o.nextAction, o.source, o.createdAt, o.updatedAt],
    })
    console.log(`  ✅ Owner: ${o.name}`)
  }

  // ── 2. Properties ──────────────────────────────────────────────────────────
  console.log('📥 Import des logements...')
  const properties = [
    { id: 1, name: 'Appartement Centre Ville Nancy', address: '12 rue de la Paix', city: 'Nancy', type: 'Appartement', typeGestion: 'conciergerie', ownerId: 1, commissionRate: 20.0, description: null, dateSigned: 1685577600000, dateLost: null, status: 'active', photo: null, createdAt: 1773679204581, updatedAt: 1773679204581 },
    { id: 2, name: 'Studio Stanislas', address: '5 place Stanislas', city: 'Nancy', type: 'Studio', typeGestion: 'conciergerie', ownerId: 1, commissionRate: 20.0, description: null, dateSigned: 1694736000000, dateLost: null, status: 'active', photo: null, createdAt: 1773679204581, updatedAt: 1773679204581 },
    { id: 3, name: 'Maison Durand', address: '23 rue des Fleurs', city: 'Nancy', type: 'Maison', typeGestion: 'conciergerie', ownerId: 2, commissionRate: 18.0, description: null, dateSigned: 1704844800000, dateLost: null, status: 'active', photo: null, createdAt: 1773679204581, updatedAt: 1773679204581 },
    { id: 4, name: 'Loft Industriel', address: '8 rue des Artisans', city: 'Nancy', type: 'Loft', typeGestion: 'conciergerie', ownerId: 3, commissionRate: 22.0, description: null, dateSigned: 1700438400000, dateLost: null, status: 'active', photo: null, createdAt: 1773679204581, updatedAt: 1773679204581 },
    { id: 5, name: 'Appartement T3 Vandœuvre', address: '45 avenue de la Libération', city: 'Nancy', type: 'Appartement', typeGestion: 'conciergerie', ownerId: 3, commissionRate: 20.0, description: null, dateSigned: 1707091200000, dateLost: null, status: 'active', photo: null, createdAt: 1773679204581, updatedAt: 1773679204581 },
  ]

  for (const p of properties) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO Property (id, name, address, city, type, typeGestion, ownerId, commissionRate, description, dateSigned, dateLost, status, photo, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [p.id, p.name, p.address, p.city, p.type, p.typeGestion, p.ownerId, p.commissionRate, p.description, p.dateSigned, p.dateLost, p.status, p.photo, p.createdAt, p.updatedAt],
    })
    console.log(`  ✅ Property: ${p.name}`)
  }

  // ── 3. SatisfactionScores ──────────────────────────────────────────────────
  console.log('📥 Import des scores de satisfaction...')
  const scores = [
    { id: 1, ownerId: 1, score: 9, quarter: 1, year: 2024, createdAt: 1773679204580 },
    { id: 2, ownerId: 1, score: 10, quarter: 2, year: 2024, createdAt: 1773679204580 },
    { id: 3, ownerId: 2, score: 8, quarter: 1, year: 2024, createdAt: 1773679204580 },
    { id: 4, ownerId: 2, score: 9, quarter: 2, year: 2024, createdAt: 1773679204580 },
    { id: 5, ownerId: 3, score: 10, quarter: 1, year: 2024, createdAt: 1773679204580 },
    { id: 6, ownerId: 3, score: 10, quarter: 2, year: 2024, createdAt: 1773679204580 },
  ]

  for (const s of scores) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO SatisfactionScore (id, ownerId, score, quarter, year, createdAt)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [s.id, s.ownerId, s.score, s.quarter, s.year, s.createdAt],
    })
    console.log(`  ✅ Score owner ${s.ownerId} Q${s.quarter}/${s.year}: ${s.score}/10`)
  }

  console.log('\n✅ Import terminé avec succès !')
  client.close()
}

main().catch((e) => {
  console.error('❌ Erreur:', e.message)
  process.exit(1)
})
