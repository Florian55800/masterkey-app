/**
 * migrate-turso.js
 * Creates missing tables and columns on Turso production database.
 * Run during Railway build: prisma generate && node scripts/migrate-turso.js && next build
 */

const { createClient } = require('@libsql/client')

async function migrate() {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url) {
    console.log('[migrate-turso] No TURSO_DATABASE_URL found — skipping migration (local dev)')
    return
  }

  // Force HTTP mode — stateless POST per query, no WebSocket cold-start hang
  const httpUrl = url.replace(/^libsql:\/\//, 'https://')
  console.log('[migrate-turso] Connecting to Turso via HTTP...')
  const client = createClient({ url: httpUrl, authToken })

  const migrations = [
    // ── PropertyRevenue ──────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS "PropertyRevenue" (
      "id"             INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
      "propertyId"     INTEGER  NOT NULL,
      "month"          INTEGER  NOT NULL,
      "year"           INTEGER  NOT NULL,
      "platform"       TEXT     NOT NULL,
      "platformAmount" REAL     NOT NULL DEFAULT 0,
      "cleaningFees"   REAL     NOT NULL DEFAULT 0,
      "commissionRate" REAL     NOT NULL DEFAULT 0,
      "notes"          TEXT,
      "createdAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PropertyRevenue_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,

    `CREATE UNIQUE INDEX IF NOT EXISTS "PropertyRevenue_propertyId_month_year_platform_key"
      ON "PropertyRevenue"("propertyId", "month", "year", "platform")`,

    // ── SubletExpense ─────────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS "SubletExpense" (
      "id"            INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
      "propertyId"    INTEGER  NOT NULL,
      "month"         INTEGER  NOT NULL,
      "year"          INTEGER  NOT NULL,
      "loyer"         REAL     NOT NULL DEFAULT 0,
      "electricite"   REAL     NOT NULL DEFAULT 0,
      "wifi"          REAL     NOT NULL DEFAULT 0,
      "autresCharges" REAL     NOT NULL DEFAULT 0,
      "notes"         TEXT,
      "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SubletExpense_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,

    `CREATE UNIQUE INDEX IF NOT EXISTS "SubletExpense_propertyId_month_year_key"
      ON "SubletExpense"("propertyId", "month", "year")`,

    // ── MonthlyObjective ──────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS "MonthlyObjective" (
      "id"                  INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
      "month"               INTEGER  NOT NULL,
      "year"                INTEGER  NOT NULL,
      "targetLeads"         INTEGER  NOT NULL DEFAULT 0,
      "targetSignatures"    INTEGER  NOT NULL DEFAULT 0,
      "targetVisites"       INTEGER  NOT NULL DEFAULT 0,
      "targetAppels"        INTEGER  NOT NULL DEFAULT 0,
      "targetCAParLogement" REAL     NOT NULL DEFAULT 0,
      "targetLogements"     INTEGER  NOT NULL DEFAULT 0,
      "createdAt"           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyObjective_month_year_key"
      ON "MonthlyObjective"("month", "year")`,

    // ── MonthlyReport: add isPlaceholder column if missing ───────────────────
    // SQLite/libSQL doesn't support IF NOT EXISTS on ALTER TABLE ADD COLUMN,
    // so we catch the error if the column already exists.
  ]

  for (const sql of migrations) {
    try {
      await client.execute(sql)
      console.log('[migrate-turso] ✓', sql.trim().split('\n')[0].substring(0, 80))
    } catch (err) {
      console.warn('[migrate-turso] ⚠ (may already exist):', err.message)
    }
  }

  // Add isPlaceholder to MonthlyReport — SQLite will error if column already exists, that's OK
  try {
    await client.execute(
      `ALTER TABLE "MonthlyReport" ADD COLUMN "isPlaceholder" INTEGER NOT NULL DEFAULT 0`
    )
    console.log('[migrate-turso] ✓ Added isPlaceholder column to MonthlyReport')
  } catch {
    console.log('[migrate-turso] ✓ isPlaceholder column already exists on MonthlyReport')
  }

  // Add typeGestion to Property if it somehow doesn't exist
  try {
    await client.execute(
      `ALTER TABLE "Property" ADD COLUMN "typeGestion" TEXT NOT NULL DEFAULT 'conciergerie'`
    )
    console.log('[migrate-turso] ✓ Added typeGestion column to Property')
  } catch {
    console.log('[migrate-turso] ✓ typeGestion column already exists on Property')
  }

  // Add role to User
  try {
    await client.execute(`ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT ''`)
    console.log('[migrate-turso] ✓ Added role column to User')
  } catch {
    console.log('[migrate-turso] ✓ role column already exists on User')
  }

  // Add actuals to MonthlyObjective
  for (const col of ['actualLeads', 'actualSignatures', 'actualVisites', 'actualAppels']) {
    try {
      await client.execute(`ALTER TABLE "MonthlyObjective" ADD COLUMN "${col}" INTEGER NOT NULL DEFAULT 0`)
      console.log(`[migrate-turso] ✓ Added ${col} to MonthlyObjective`)
    } catch {
      console.log(`[migrate-turso] ✓ ${col} already exists on MonthlyObjective`)
    }
  }

  // Add description to Property
  try {
    await client.execute(`ALTER TABLE "Property" ADD COLUMN "description" TEXT`)
    console.log('[migrate-turso] ✓ Added description to Property')
  } catch {
    console.log('[migrate-turso] ✓ description already exists on Property')
  }

  // Add nbSejours/nbNuits to PropertyRevenue
  for (const col of ['nbSejours', 'nbNuits']) {
    try {
      await client.execute(`ALTER TABLE "PropertyRevenue" ADD COLUMN "${col}" INTEGER NOT NULL DEFAULT 0`)
      console.log(`[migrate-turso] ✓ Added ${col} to PropertyRevenue`)
    } catch {
      console.log(`[migrate-turso] ✓ ${col} already exists on PropertyRevenue`)
    }
  }

  // ── Seed data (INSERT OR IGNORE — ne s'exécute qu'une fois) ────────────────
  console.log('[migrate-turso] Seeding owners...')
  const owners = [
    [1, 'Morgan Zappula', null, null, 'Propriétaire très investi, souhaite maximiser ses revenus locatifs.', null, null, null, 'Partenaire', 1773679204579, 1773698081757],
    [2, 'Sophie Durand', '06 98 76 54 32', 'sophie.durand@outlook.fr', 'Nouvellement propriétaire, besoin d\'accompagnement.', 1707955200000, 1775001600000, 'Présenter nouveau package premium', 'Réseau social', 1773679204579, 1773679204579],
    [3, 'Michel Bernard', '06 55 44 33 22', 'm.bernard@free.fr', 'Propriétaire de longue date, très satisfait des services.', 1710028800000, 1774396800000, 'Proposition bien supplémentaire', 'Bouche à oreille', 1773679204580, 1773679204580],
  ]
  for (const o of owners) {
    try {
      await client.execute({ sql: `INSERT OR IGNORE INTO "Owner" (id, name, phone, email, notes, contractStart, contractEnd, nextAction, source, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)`, args: o })
      console.log(`[migrate-turso] ✓ Owner: ${o[1]}`)
    } catch (e) { console.log(`[migrate-turso] Owner skip: ${e.message}`) }
  }

  console.log('[migrate-turso] Seeding properties...')
  const properties = [
    [1, 'Appartement Centre Ville Nancy', '12 rue de la Paix', 'Nancy', 'Appartement', 'conciergerie', 1, 20.0, null, 1685577600000, null, 'active', null, 1773679204581, 1773679204581],
    [2, 'Studio Stanislas', '5 place Stanislas', 'Nancy', 'Studio', 'conciergerie', 1, 20.0, null, 1694736000000, null, 'active', null, 1773679204581, 1773679204581],
    [3, 'Maison Durand', '23 rue des Fleurs', 'Nancy', 'Maison', 'conciergerie', 2, 18.0, null, 1704844800000, null, 'active', null, 1773679204581, 1773679204581],
    [4, 'Loft Industriel', '8 rue des Artisans', 'Nancy', 'Loft', 'conciergerie', 3, 22.0, null, 1700438400000, null, 'active', null, 1773679204581, 1773679204581],
    [5, 'Appartement T3 Vandœuvre', '45 avenue de la Libération', 'Nancy', 'Appartement', 'conciergerie', 3, 20.0, null, 1707091200000, null, 'active', null, 1773679204581, 1773679204581],
  ]
  for (const p of properties) {
    try {
      await client.execute({ sql: `INSERT OR IGNORE INTO "Property" (id, name, address, city, type, typeGestion, ownerId, commissionRate, description, dateSigned, dateLost, status, photo, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, args: p })
      console.log(`[migrate-turso] ✓ Property: ${p[1]}`)
    } catch (e) { console.log(`[migrate-turso] Property skip: ${e.message}`) }
  }

  console.log('[migrate-turso] Seeding satisfaction scores...')
  const scores = [
    [1, 1, 9, 1, 2024, 1773679204580], [2, 1, 10, 2, 2024, 1773679204580],
    [3, 2, 8, 1, 2024, 1773679204580], [4, 2, 9, 2, 2024, 1773679204580],
    [5, 3, 10, 1, 2024, 1773679204580], [6, 3, 10, 2, 2024, 1773679204580],
  ]
  for (const s of scores) {
    try {
      await client.execute({ sql: `INSERT OR IGNORE INTO "SatisfactionScore" (id, ownerId, score, quarter, year, createdAt) VALUES (?,?,?,?,?,?)`, args: s })
    } catch (e) { console.log(`[migrate-turso] Score skip: ${e.message}`) }
  }
  console.log('[migrate-turso] ✓ Seed complete')

  console.log('[migrate-turso] Migration complete ✅')
  await client.close()
}

migrate().catch((err) => {
  console.error('[migrate-turso] Fatal error:', err)
  process.exit(1)
})
