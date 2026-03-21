/**
 * turso.ts — Direct Turso HTTP API client
 *
 * Bypasses @libsql/client and WebSocket entirely.
 * Each call is a plain HTTPS POST → no cold-start, no persistent connection.
 * Used only when TURSO_DATABASE_URL is set (production Railway).
 * Local dev keeps using Prisma + SQLite.
 */

type TursoCell =
  | { type: 'integer'; value: string }
  | { type: 'float'; value: string }
  | { type: 'text'; value: string }
  | { type: 'blob'; base64: string }
  | { type: 'null'; value?: null }

interface TursoResultSet {
  cols: Array<{ name: string }>
  rows: TursoCell[][]
}

function parseCell(cell: TursoCell): unknown {
  if (!cell || cell.type === 'null') return null
  if (cell.type === 'integer') return parseInt((cell as { type: 'integer'; value: string }).value, 10)
  if (cell.type === 'float') return parseFloat((cell as { type: 'float'; value: string }).value)
  return (cell as { type: 'text'; value: string }).value
}

function resultToObjects(result: TursoResultSet): Record<string, unknown>[] {
  return result.rows.map((row) => {
    const obj: Record<string, unknown> = {}
    result.cols.forEach((col, i) => {
      obj[col.name] = parseCell(row[i])
    })
    return obj
  })
}

export async function tursoQuery(
  sql: string,
  args: Array<string | number | null> = []
): Promise<Record<string, unknown>[]> {
  const rawUrl = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!rawUrl) throw new Error('TURSO_DATABASE_URL not set')

  const baseUrl = rawUrl.replace(/^libsql:\/\//, 'https://')

  const stmt =
    args.length > 0
      ? {
          sql,
          args: args.map((v) =>
            v === null
              ? { type: 'null' }
              : typeof v === 'number'
              ? { type: Number.isInteger(v) ? 'integer' : 'float', value: String(v) }
              : { type: 'text', value: String(v) }
          ),
        }
      : { sql }

  const abort = AbortSignal.timeout(10_000) // 10s server-side timeout

  const res = await fetch(`${baseUrl}/v2/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [{ type: 'execute', stmt }, { type: 'close' }],
    }),
    signal: abort,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Turso HTTP ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  const first = data?.results?.[0]

  if (first?.type === 'error') {
    throw new Error(`Turso error: ${first.error?.message ?? JSON.stringify(first.error)}`)
  }

  const resultSet: TursoResultSet = first?.response?.result
  if (!resultSet) return []

  return resultToObjects(resultSet)
}

/** Convenience: run multiple queries in one HTTP round-trip */
export async function tursoQueryBatch(
  queries: Array<{ sql: string; args?: Array<string | number | null> }>
): Promise<Record<string, unknown>[][]> {
  const rawUrl = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!rawUrl) throw new Error('TURSO_DATABASE_URL not set')

  const baseUrl = rawUrl.replace(/^libsql:\/\//, 'https://')

  const requests = [
    ...queries.map(({ sql, args = [] }) => ({
      type: 'execute',
      stmt:
        args.length > 0
          ? {
              sql,
              args: args.map((v) =>
                v === null
                  ? { type: 'null' }
                  : typeof v === 'number'
                  ? { type: Number.isInteger(v) ? 'integer' : 'float', value: String(v) }
                  : { type: 'text', value: String(v) }
              ),
            }
          : { sql },
    })),
    { type: 'close' },
  ]

  const abort = AbortSignal.timeout(10_000) // 10s server-side timeout

  const res = await fetch(`${baseUrl}/v2/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
    signal: abort,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Turso HTTP ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()

  return queries.map((_, i) => {
    const item = data?.results?.[i]
    if (item?.type === 'error') {
      throw new Error(`Turso error q${i}: ${item.error?.message}`)
    }
    const resultSet: TursoResultSet = item?.response?.result
    if (!resultSet) return []
    return resultToObjects(resultSet)
  })
}
