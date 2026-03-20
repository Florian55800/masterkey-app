import type { PrismaClient } from '@prisma/client'

// ── Remote client (immediate, always available) ──────────────────────────────
let _remoteClient: PrismaClient | undefined

function getRemoteClient(): PrismaClient {
  if (_remoteClient) return _remoteClient

  if (process.env.TURSO_DATABASE_URL) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient } = require('@prisma/client')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSQL } = require('@prisma/adapter-libsql')
    const libsql = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    const adapter = new PrismaLibSQL(libsql)
    _remoteClient = new PrismaClient({ adapter })
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient } = require('@prisma/client')
    _remoteClient = new PrismaClient()
  }

  return _remoteClient!
}

// ── Embedded replica (background init — instant reads once ready) ─────────────
let _replicaClient: PrismaClient | undefined

async function initEmbeddedReplica(): Promise<void> {
  if (!process.env.TURSO_DATABASE_URL) return
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient } = require('@prisma/client')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSQL } = require('@prisma/adapter-libsql')

    const libsql = createClient({
      url: 'file:/tmp/turso-replica.db',
      syncUrl: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
      syncInterval: 30, // sync every 30 seconds
    })

    await libsql.sync() // initial pull from Turso → local file
    const adapter = new PrismaLibSQL(libsql)
    _replicaClient = new PrismaClient({ adapter })
    console.log('[prisma] Embedded replica ready — reads are now local ⚡')
  } catch (err) {
    console.warn('[prisma] Embedded replica init failed, using remote:', err)
  }
}

// Start replica init in background — do NOT await here
initEmbeddedReplica()

// ── Export: use replica if ready, else remote ─────────────────────────────────
export const prisma = new Proxy({} as PrismaClient, {
  get(_: PrismaClient, prop: string | symbol) {
    const client = _replicaClient ?? getRemoteClient()
    return (client as unknown as Record<string | symbol, unknown>)[prop]
  },
})
