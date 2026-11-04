import assert from 'node:assert/strict'
import test from 'node:test'
import {
  authMiddleware,
  createAuthMiddleware,
  defaultUnauthorizedResponse,
  authorize,
} from '#/modules/auth'

async function executeMiddleware(
  mw: ReturnType<typeof createAuthMiddleware>,
  request: Request,
) {
  let nextCalled = false
  let nextArgs: unknown
  const serverFn = mw.options.server
  assert.ok(serverFn, 'server middleware function must be defined')

  const result = await serverFn({
    request,
    pathname: '/test',
    context: undefined,
    handlerType: 'router',
    next: (async (args?: unknown) => {
      nextCalled = true
      nextArgs = args
      return {
        request,
        pathname: '/test',
        context: {},
        response: new Response(null, { status: 200 }),
      }
    }) as never,
  } as never)

  return { result, nextCalled, nextArgs }
}

test('authorize() placeholder function returns authenticated: true', async () => {
  const req = new Request('https://texcra.example.com/test')
  const auth = await authorize(req)
  assert.deepEqual(auth, { authenticated: true })
})

test('defaultUnauthorizedResponse() returns 401 JSON Response', async () => {
  const req = new Request('https://texcra.example.com/test')
  const res = defaultUnauthorizedResponse(req)
  assert.equal(res.status, 401)
  assert.equal(res.headers.get('Content-Type'), 'application/json')
  const body = await res.json<{ error: string }>()
  assert.equal(body.error, 'UNAUTHORIZED')
})

test('createAuthMiddleware() default instance passes context.auth to next()', async () => {
  const req = new Request('https://texcra.example.com/test')
  const { nextCalled, nextArgs } = await executeMiddleware(authMiddleware, req)

  assert.equal(nextCalled, true)
  assert.deepEqual(nextArgs, {
    context: {
      auth: { authenticated: true },
    },
  })
})

test('createAuthMiddleware() returns default 401 when authorize returns authenticated: false', async () => {
  const customMw = createAuthMiddleware({
    authorize: async () => ({ authenticated: false }),
  })
  const req = new Request('https://texcra.example.com/test')
  const { result, nextCalled } = await executeMiddleware(customMw, req)

  assert.equal(nextCalled, false)
  const res = result as Response
  assert.ok(res instanceof Response)
  assert.equal(res.status, 401)
  assert.equal(res.headers.get('Content-Type'), 'application/json')
  const body = await res.json<{ error: string; message: string }>()
  assert.equal(body.error, 'UNAUTHORIZED')
})

test('createAuthMiddleware() uses custom onUnauthorized callback when provided', async () => {
  const customMw = createAuthMiddleware({
    authorize: async () => ({ authenticated: false }),
    onUnauthorized: () => new Response('Custom Forbidden', { status: 403 }),
  })
  const req = new Request('https://texcra.example.com/test')
  const { result, nextCalled } = await executeMiddleware(customMw, req)

  assert.equal(nextCalled, false)
  const res = result as Response
  assert.ok(res instanceof Response)
  assert.equal(res.status, 403)
  assert.equal(await res.text(), 'Custom Forbidden')
})

test('createAuthMiddleware() uses onError callback when authorize throws', async () => {
  const customMw = createAuthMiddleware({
    authorize: async () => {
      throw new Error('Auth service unreachable')
    },
    onError: (err) =>
      new Response(JSON.stringify({ error: (err as Error).message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }),
  })
  const req = new Request('https://texcra.example.com/test')
  const { result, nextCalled } = await executeMiddleware(customMw, req)

  assert.equal(nextCalled, false)
  const res = result as Response
  assert.ok(res instanceof Response)
  assert.equal(res.status, 502)
  const body = await res.json<{ error: string }>()
  assert.equal(body.error, 'Auth service unreachable')
})

test('createAuthMiddleware() rethrows when authorize throws and onError is omitted', async () => {
  const customMw = createAuthMiddleware({
    authorize: async () => {
      throw new Error('Uncaught failure')
    },
  })
  const req = new Request('https://texcra.example.com/test')
  await assert.rejects(
    async () => {
      await executeMiddleware(customMw, req)
    },
    { message: 'Uncaught failure' },
  )
})
