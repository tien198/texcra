// import type { AnyD1Database } from 'drizzle-orm/d1'
import { drizzle } from 'drizzle-orm/d1'
import { relations } from 'shared'
import { env } from 'cloudflare:workers'
/**
 * Obtain a Drizzle database instance connected to Cloudflare D1.
 *
 * In Cloudflare Workers runtime (or local Miniflare), the D1 binding 'DB' is available
 * via request context, globalThis.DB, or can be passed explicitly: `getDb(env.DB)`.
 */
export function getDb() {
  return drizzle(env.DB, { relations })
}
export type Database = ReturnType<typeof getDb>
