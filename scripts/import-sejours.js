/**
 * import-sejours.js
 *
 * Usage:
 *   node scripts/import-sejours.js <csv_file> <property_id>
 *
 * Exemple:
 *   node scripts/import-sejours.js "CSV/Séjour Nancy 1 er Août au 1er mars .csv" 4
 *
 * Règle de comptage :
 *   - On groupe par MOIS D'ARRIVÉE (DateArrival)
 *   - Toutes les nuits de la réservation sont comptées dans ce mois, même si
 *     le départ tombe le mois suivant (ex. arrivée 27/01 → départ 4/02 = 8 nuits en janvier)
 *   - Plateformes reconnues : Airbnb → "airbnb", Booking.com → "booking"
 *   - Les réservations annulées (Status = Cancelled / Declined) sont ignorées
 *
 * Le script fait un UPDATE sur les lignes existantes dans PropertyRevenue.
 * Si une ligne n'existe pas encore, elle est signalée mais non créée
 * (les données de revenus doivent être saisies via l'interface).
 */

const { createClient } = require('@libsql/client')
const fs   = require('fs')
const path = require('path')

// ── Paramètres ──────────────────────────────────────────────────────────────

const csvPath    = process.argv[2]
const propertyId = parseInt(process.argv[3], 10)

if (!csvPath || isNaN(propertyId)) {
  console.error('Usage: node scripts/import-sejours.js <csv_file> <property_id>')
  process.exit(1)
}

const PLATFORM_MAP = {
  'airbnb':      'airbnb',
  'booking.com': 'booking',
  'direct':      'direct',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizePlatform(source) {
  return PLATFORM_MAP[source.toLowerCase()] ?? source.toLowerCase()
}

/** Parse MM/DD/YYYY → { month, year } */
function parseArrivalMonth(dateStr) {
  if (!dateStr) return null
  const [mm, , yyyy] = dateStr.split('/')
  const month = parseInt(mm, 10)
  const year  = parseInt(yyyy, 10)
  if (!month || !year) return null
  return { month, year }
}

/** Parse CSV manually (handles quoted fields with commas) */
function parseCSV(content) {
  const lines = content.split('\n').filter(Boolean)
  const headers = splitCSVLine(lines[0])
  return lines.slice(1).map(line => {
    const values = splitCSVLine(line)
    const row = {}
    headers.forEach((h, i) => { row[h.trim()] = (values[i] ?? '').trim() })
    return row
  })
}

function splitCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const url = process.env.TURSO_DATABASE_URL
    ? process.env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, 'https://')
    : 'http://sqld:8080'

  const client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN ?? '',
  })

  const csvContent = fs.readFileSync(path.resolve(csvPath), 'utf-8')
    .replace(/^\uFEFF/, '') // strip BOM
  const rows = parseCSV(csvContent)

  // ── Dédupliquer par (Id, Source) et ignorer les annulations ──────────────
  const seen = new Set()
  const reservations = []

  for (const row of rows) {
    const key = `${row['Id']}_${row['Source']}`
    if (seen.has(key)) continue
    seen.add(key)

    const status = (row['Status'] ?? '').toLowerCase()
    if (status === 'cancelled' || status === 'declined') continue

    const arrivalKey = parseArrivalMonth(row['DateArrival'])
    if (!arrivalKey) continue

    const nights = parseInt(row['Nights'], 10) || 0
    if (nights === 0) continue

    reservations.push({
      platform: normalizePlatform(row['Source'] ?? ''),
      month:    arrivalKey.month,
      year:     arrivalKey.year,
      nights,
    })
  }

  // ── Agréger par (month, year, platform) ──────────────────────────────────
  /** @type {Map<string, { month, year, platform, sejours, nuits }>} */
  const agg = new Map()

  for (const r of reservations) {
    const key = `${r.year}-${String(r.month).padStart(2,'0')}-${r.platform}`
    if (!agg.has(key)) {
      agg.set(key, { month: r.month, year: r.year, platform: r.platform, sejours: 0, nuits: 0 })
    }
    const entry = agg.get(key)
    entry.sejours += 1
    entry.nuits   += r.nights
  }

  // ── Afficher le récapitulatif ─────────────────────────────────────────────
  console.log(`\n=== Import séjours — propertyId=${propertyId} ===`)
  console.log(`    Fichier : ${path.basename(csvPath)}`)
  console.log(`    Réservations valides : ${reservations.length}`)
  console.log(`    Lignes à mettre à jour : ${agg.size}\n`)

  const entries = [...agg.values()].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month !== b.month ? a.month - b.month : a.platform.localeCompare(b.platform)
  )

  // ── UPDATE en base ────────────────────────────────────────────────────────
  for (const d of entries) {
    const label = `${String(d.month).padStart(2,'0')}/${d.year} [${d.platform}]`

    const res = await client.execute({
      sql: `UPDATE "PropertyRevenue"
            SET nbSejours = ?, nbNuits = ?
            WHERE propertyId = ? AND month = ? AND year = ? AND platform = ?`,
      args: [d.sejours, d.nuits, propertyId, d.month, d.year, d.platform],
    })

    if (res.rowsAffected > 0) {
      console.log(`  ✓ ${label} — ${d.sejours} séjours, ${d.nuits} nuits`)
    } else {
      console.log(`  ⚠ ${label} — ligne non trouvée (rowsAffected=0) : séjours=${d.sejours}, nuits=${d.nuits}`)
    }
  }

  console.log('\n=== Terminé ✅ ===\n')
  await client.close()
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
