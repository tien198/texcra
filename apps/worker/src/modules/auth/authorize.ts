export interface AuthContext {
  readonly authenticated: boolean
  readonly principalId?: string
}

export type AuthorizeFn = (request: Request) => Promise<AuthContext>

/** Placeholder authorizer: allows every request until real sessions are wired. */
export async function authorize(_request: Request): Promise<AuthContext> {
  return { authenticated: true }
}
