import { drizzle } from 'drizzle-orm/d1'
import { relations } from 'shared'
import { getRequest } from '@tanstack/react-start/server'
import { getCloudflareBindings } from './server/runtime-bindings'
/**
 * Obtain a Drizzle database instance connected to Cloudflare D1.
 *
 * In Cloudflare Workers runtime (or local Miniflare), the D1 binding 'DB' is available
 * through Nitro's request context, or can be passed explicitly: `getDb(env.DB)`.
 * A future Node.js deployment can provide its own database adapter here.
 */
export function getDb(binding?: D1Database) {
  const database = binding ?? getCloudflareBindings(getRequest())?.DB
  if (!database)
    throw new Error(
      'The database binding is not configured for this deployment.',
    )
  return drizzle(database, { relations })
}
export type Database = ReturnType<typeof getDb>
