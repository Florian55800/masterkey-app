import type { PrismaClient } from '@prisma/client'

const QUERY_TIMEOUT_MS = 8_000

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

    const libsql = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
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

// Enveloppe chaque méthode Prisma avec un timeout de 8s.
// Si Turso ne répond pas, la requête échoue proprement au lieu de bloquer indéfiniment.
export const prisma = new Proxy({} as PrismaClient, {
  get(_: PrismaClient, prop: string | symbol) {
    const client = getClient()
    const delegate = (client as unknown as Record<string | symbol, unknown>)[prop]

    if (typeof delegate !== 'object' || delegate === null) return delegate

    return new Proxy(delegate as object, {
      get(target, method) {
        const fn = (target as Record<string | symbol, unknown>)[method]
        if (typeof fn !== 'function') return fn
        return function (...args: unknown[]) {
          const result = (fn as (...a: unknown[]) => unknown).apply(target, args)
          if (result && typeof (result as Promise<unknown>).then === 'function') {
            return Promise.race([
              result as Promise<unknown>,
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error(`Turso timeout après ${QUERY_TIMEOUT_MS / 1000}s`)),
                  QUERY_TIMEOUT_MS
                )
              ),
            ])
          }
          return result
        }
      },
    })
  },
})
