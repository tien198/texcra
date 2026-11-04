
/** Standard JSON response for unauthenticated callers. */
export function defaultUnauthorizedResponse(_request: Request): Response {
  return new Response(
    JSON.stringify({
      error: 'UNAUTHORIZED',
      message: 'Authentication required.',
    }),
    {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}