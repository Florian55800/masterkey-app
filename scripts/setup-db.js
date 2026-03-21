/**
 * setup-db.js
 * Crée le schéma complet sur sqld (base vierge).
 * Pas de seed — les données seront saisies via l'interface.
 */

const { createClient } = require('@libsql/client')

async function setup() {
  const url = process.env.TURSO_DATABASE_URL
  if (!url) {
    console.log('[setup-db] Pas de TURSO_DATABASE_URL — skipped (dev local)')
    return
  }

  const httpUrl = url.replace(/^libsql:\/\//, 'https://')
  const client = createClient({ url: httpUrl, authToken: process.env.TURSO_AUTH_TOKEN || '' })

  console.log('[setup-db] Connexion à', httpUrl)

  const tables = [
    `CREATE TABLE IF NOT EXISTS "User" (
      "id"        INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name"      TEXT     NOT NULL,
      "pin"       TEXT     NOT NULL,
      "color"     TEXT     NOT NULL,
      "photo"     TEXT,
      "role"      TEXT     NOT NULL DEFAULT '',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS "Owner" (
      "id"          INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name"        TEXT     NOT NULL,
      "phone"       TEXT,
      "email"       TEXT,
      "notes"       TEXT,
      "photo"       TEXT,
      "lastContact" DATETIME,
      "relanceDate" DATETIME,
      "relanceNote" TEXT,
      "source"      TEXT,
      "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS "Property" (
      "id"             INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name"           TEXT     NOT NULL,
      "address"        TEXT     NOT NULL,
      "city"           TEXT     NOT NULL,
      "type"           TEXT     NOT NULL,
      "typeGestion"    TEXT     NOT NULL DEFAULT 'conciergerie',
      "ownerId"        INTEGER  NOT NULL,
      "commissionRate" REAL     NOT NULL,
      "photo"          TEXT,
      "description"    TEXT,
      "dateSigned"     DATETIME NOT NULL,
      "dateLost"       DATETIME,
      "status"         TEXT     NOT NULL DEFAULT 'active',
      "createdAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("ownerId") REFERENCES "Owner" ("id")
    )`,

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
      "nbSejours"      INTEGER  NOT NULL DEFAULT 0,
      "nbNuits"        INTEGER  NOT NULL DEFAULT 0,
      "createdAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE
    )`,

    `CREATE UNIQUE INDEX IF NOT EXISTS "PropertyRevenue_propertyId_month_year_platform_key"
      ON "PropertyRevenue"("propertyId","month","year","platform")`,

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
      FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE
    )`,

    `CREATE UNIQUE INDEX IF NOT EXISTS "SubletExpense_propertyId_month_year_key"
      ON "SubletExpense"("propertyId","month","year")`,

    `CREATE TABLE IF NOT EXISTS "SatisfactionScore" (
      "id"        INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
      "ownerId"   INTEGER  NOT NULL,
      "score"     INTEGER  NOT NULL,
      "quarter"   INTEGER  NOT NULL,
      "year"      INTEGER  NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("ownerId") REFERENCES "Owner" ("id")
    )`,

    `CREATE TABLE IF NOT EXISTS "MonthlyReport" (
      "id"               INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
      "month"            INTEGER  NOT NULL,
      "year"             INTEGER  NOT NULL,
      "caBrut"           REAL     NOT NULL DEFAULT 0,
      "commissions"      REAL     NOT NULL DEFAULT 0,
      "activeProperties" INTEGER  NOT NULL DEFAULT 0,
      "totalNights"      INTEGER  NOT NULL DEFAULT 0,
      "newSignatures"    INTEGER  NOT NULL DEFAULT 0,
      "lostProperties"   INTEGER  NOT NULL DEFAULT 0,
      "netProfit"        REAL     NOT NULL DEFAULT 0,
      "notes"            TEXT,
      "targetMargin"     REAL,
      "isPlaceholder"    INTEGER  NOT NULL DEFAULT 0,
      "createdAt"        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyReport_month_year_key"
      ON "MonthlyReport"("month","year")`,

    `CREATE TABLE IF NOT EXISTS "Expense" (
      "id"          INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
      "reportId"    INTEGER  NOT NULL,
      "category"    TEXT     NOT NULL,
      "description" TEXT,
      "amount"      REAL     NOT NULL,
      "isRecurring" INTEGER  NOT NULL DEFAULT 0,
      "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("reportId") REFERENCES "MonthlyReport" ("id") ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS "TeamGoal" (
      "id"               INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
      "userId"           INTEGER  NOT NULL,
      "reportId"         INTEGER  NOT NULL,
      "propertiesSigned" INTEGER  NOT NULL DEFAULT 0,
      "appointmentsMade" INTEGER  NOT NULL DEFAULT 0,
      "personalGoal"     TEXT,
      "goalStatus"       TEXT     NOT NULL DEFAULT 'en_cours',
      "createdAt"        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("userId")   REFERENCES "User" ("id"),
      FOREIGN KEY ("reportId") REFERENCES "MonthlyReport" ("id") ON DELETE CASCADE
    )`,

    `CREATE UNIQUE INDEX IF NOT EXISTS "TeamGoal_userId_reportId_key"
      ON "TeamGoal"("userId","reportId")`,

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
      "actualLeads"         INTEGER  NOT NULL DEFAULT 0,
      "actualSignatures"    INTEGER  NOT NULL DEFAULT 0,
      "actualVisites"       INTEGER  NOT NULL DEFAULT 0,
      "actualAppels"        INTEGER  NOT NULL DEFAULT 0,
      "createdAt"           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyObjective_month_year_key"
      ON "MonthlyObjective"("month","year")`,

    `CREATE TABLE IF NOT EXISTS "City" (
      "id"       INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name"     TEXT    NOT NULL UNIQUE,
      "isActive" INTEGER NOT NULL DEFAULT 0
    )`,

    `CREATE TABLE IF NOT EXISTS "Config" (
      "key"       TEXT     NOT NULL PRIMARY KEY,
      "value"     TEXT     NOT NULL,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS "Lead" (
      "id"           INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
      "nom"          TEXT     NOT NULL,
      "email"        TEXT,
      "telephone"    TEXT,
      "adresseBien"  TEXT,
      "ville"        TEXT,
      "typeBien"     TEXT,
      "nbChambres"   TEXT,
      "surface"      REAL,
      "lienAnnonce"  TEXT,
      "statut"       TEXT     NOT NULL DEFAULT 'À contacter',
      "commentaires" TEXT,
      "dateContact"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "relanceDate"  DATETIME,
      "relanceNote"  TEXT,
      "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  ]

  for (const sql of tables) {
    try {
      await client.execute(sql)
      const label = sql.trim().split('\n')[0].substring(0, 70)
      console.log('[setup-db] ✓', label)
    } catch (err) {
      console.warn('[setup-db] ⚠', err.message)
    }
  }

  // Seed des utilisateurs (Florian + Lucas) — identifiants de connexion uniquement
  const users = [
    [1, 'Florian', '1234', '#D4AF37', '', ''],
    [2, 'Lucas',   '5678', '#3B82F6', '', ''],
  ]
  console.log('[setup-db] Création des utilisateurs...')
  for (const [id, name, pin, color, photo, role] of users) {
    try {
      await client.execute({
        sql: `INSERT OR IGNORE INTO "User" (id, name, pin, color, photo, role) VALUES (?,?,?,?,?,?)`,
        args: [id, name, pin, color, photo, role],
      })
      console.log(`[setup-db] ✓ User: ${name}`)
    } catch (err) {
      console.warn(`[setup-db] User skip: ${err.message}`)
    }
  }

  // Seed des statuts leads par défaut
  const defaultStatuts = JSON.stringify([
    { label: 'À contacter', color: 'blue' },
    { label: 'Follow up',   color: 'amber' },
    { label: 'En passe de signer', color: 'green' },
    { label: 'Signé',  color: 'emerald' },
    { label: 'Mort',   color: 'red' },
  ])
  try {
    await client.execute({
      sql: `INSERT OR IGNORE INTO "Config" (key, value, updatedAt) VALUES ('lead_statuts', ?, CURRENT_TIMESTAMP)`,
      args: [defaultStatuts],
    })
    console.log('[setup-db] ✓ Config: lead_statuts')
  } catch (err) {
    console.warn('[setup-db] Config skip:', err.message)
  }

  console.log('[setup-db] Schéma prêt ✅')
  await client.close()
}

setup().catch((err) => {
  console.error('[setup-db] Erreur fatale:', err)
  process.exit(1)
})
