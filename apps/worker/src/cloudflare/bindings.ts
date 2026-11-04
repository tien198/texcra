import type { ServerRequest } from 'nitro/types'

/** Nitro attaches platform bindings per request; Node.js requests have no Cloudflare binding. */
export function getCloudflareBindings(request: ServerRequest): Env | undefined {
  return request.runtime?.cloudflare?.env
}
