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

  console.log('[migrate-turso] Connecting to Turso...')
  const client = createClient({ url, authToken })

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

  console.log('[migrate-turso] Migration complete ✅')
  await client.close()
}

migrate().catch((err) => {
  console.error('[migrate-turso] Fatal error:', err)
  process.exit(1)
})
