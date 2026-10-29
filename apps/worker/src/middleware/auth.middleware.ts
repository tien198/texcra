export interface AuthContext {
  readonly authenticated: boolean
  readonly principalId?: string
}

export class AuthorizationMiddleware {
  public async authorize(_request: Request): Promise<AuthContext> {
    return { authenticated: true }
  }
}

export const authMiddleware = new AuthorizationMiddleware()
