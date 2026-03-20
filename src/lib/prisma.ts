import type { PrismaClient } from '@prisma/client'

let _client: PrismaClient | undefined

function getClient(): PrismaClient {
  if (_client) return _client

  if (process.env.TURSO_DATABASE_URL) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient } = require('@prisma/client')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSQL } = require('@prisma/adapter-libsql')

    // Force HTTP mode (https://) : chaque requête est un POST indépendant,
    // pas de WebSocket persistant qui peut se déconnecter silencieusement.
    // Cela permet aussi d'appliquer un vrai timeout par requête via fetch.
    const httpUrl = process.env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, 'https://')

    const libsql = createClient({
      url: httpUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
      // Timeout de 12s par requête — évite les blocages infinis
      fetch: (url: string, init?: RequestInit) => {
        const ctrl = new AbortController()
        const tid = setTimeout(() => ctrl.abort(), 12_000)
        return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(tid))
      },
    })

    const adapter = new PrismaLibSQL(libsql)
    _client = new PrismaClient({ adapter })
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient } = require('@prisma/client')
    _client = new PrismaClient()
  }

  return _client!
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_: PrismaClient, prop: string | symbol) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
