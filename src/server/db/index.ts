import type { AnyD1Database } from 'drizzle-orm/d1'
import { drizzle } from 'drizzle-orm/d1'
import { defineRelations } from 'drizzle-orm'

import * as schema from './schema/index'

export const relations = defineRelations(schema)

/**
 * Obtain a Drizzle database instance connected to Cloudflare D1.
 *
 * In Cloudflare Workers runtime (or local Miniflare), the D1 binding 'DB' is available
 * via request context, globalThis.DB, or can be passed explicitly: `getDb(env.DB)`.
 */
export function getDb(d1?: AnyD1Database) {
  if (d1) {
    return drizzle(d1, { relations })
  }

  // Check TanStack Start / Nitro request event context
  try {
    const req = {} as any
    const requestD1 =
      (
        req as unknown as {
          context?: { cloudflare?: { env?: { DB?: AnyD1Database } } }
        }
      ).context?.cloudflare?.env?.DB ??
      (req as unknown as { env?: { DB?: AnyD1Database } }).env?.DB
    if (requestD1) {
      return drizzle(requestD1, { relations })
    }
  } catch {
    // Outside request context or StartEvent not available in AsyncLocalStorage
  }

  // Check global scope (Worker global or Miniflare binding)
  const globalD1 =
    (globalThis as unknown as { DB?: AnyD1Database }).DB ??
    (globalThis as unknown as { __env__?: { DB?: AnyD1Database } }).__env__?.DB
  if (globalD1) {
    return drizzle(globalD1, { relations })
  }

  // Check process.env fallback
  const envD1 = (process.env as unknown as { DB?: AnyD1Database }).DB
  if (envD1) {
    return drizzle(envD1, { relations })
  }

  throw new Error(
    'D1 Database binding "DB" not found. Please provide an explicit D1 database instance or configure the "DB" binding in wrangler.toml.',
  )
}

export type Database = ReturnType<typeof getDb>
export * from './schema/index'
export { schema }
