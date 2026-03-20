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

    // HTTP mode (https://) : pas de WebSocket persistant qui se déconnecte
    // silencieusement. Chaque requête = POST HTTP indépendant.
    const url = process.env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, 'https://')

    const libsql = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN })
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
