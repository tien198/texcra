import { createMiddleware } from '@tanstack/react-start'
import {
  authorize as defaultAuthorize
  
  
} from './authorize'
import type {AuthContext, AuthorizeFn} from './authorize';
import { defaultUnauthorizedResponse } from './unauthorized.response'

export type { AuthContext, AuthorizeFn }
export { defaultUnauthorizedResponse }

export interface AuthMiddlewareOptions {
  /** Custom authorize function. Defaults to default authorize(). */
  readonly authorize?: AuthorizeFn
  /** Builds the response returned when the caller is not authenticated. Defaults to 401 JSON. */
  readonly onUnauthorized?: (request: Request) => Response
  /** Builds the response returned when the authorizer itself throws. Defaults to rethrowing. */
  readonly onError?: (error: unknown, request: Request) => Response
}

/** TanStack Start request middleware: rejects unauthenticated callers, otherwise exposes `context.auth`. */
export function createAuthMiddleware({
  authorize = defaultAuthorize,
  onUnauthorized = defaultUnauthorizedResponse,
  onError,
}: AuthMiddlewareOptions = {}) {
  return createMiddleware().server(async ({ request, next }) => {
    let auth: AuthContext
    try {
      auth = await authorize(request)
    } catch (error) {
      if (!onError) throw error
      return onError(error, request)
    }
    if (!auth.authenticated) return onUnauthorized(request)
    return next({ context: { auth } })
  })
}

/** Default shared request middleware instance. */
export const authMiddleware = createAuthMiddleware()
