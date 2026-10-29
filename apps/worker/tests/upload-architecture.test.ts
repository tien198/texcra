import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { test } from 'node:test'
import {
  createObjectKeyPlan,
  decodeImageMetadata,
  DEFAULT_VARIANTS,
  encodeImageMetadata,
  VARIANT_IDS,
} from 'shared/image-processing'
import type {
  ProcessImageMetadata,
  ProcessImageResult,
} from 'shared/image-processing'
import type {
  AcquireLeaseInput,
  LeaseTicket,
} from '../src/durable-objects/coordinator-shard.do'
import { AuthorizationMiddleware } from '../src/middleware/auth.middleware'
import {
  handleImageUpload,
  IDEMPOTENCY_KEY_HEADER,
  LEASE_TICKET_HEADER,
} from '../src/routes/api/upload'
import type { UploadRouteBindings } from '../src/routes/api/upload'
import {
  boundedImageStream,
  readImageJson,
} from '../src/server/image-http'
import { resultToUploadResponse } from '../src/server/media'
import type { WorkflowStepRunner } from '../src/workflows/image-upload.workflow'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'cloudflare:workers') {
      return {
        shortCircuit: true,
        url: 'data:text/javascript,export class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } } export class WorkflowEntrypoint { constructor(ctx, env) { this.ctx = ctx; this.env = env; } } export class WorkerEntrypoint { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }',
      }
    }
    return nextResolve(specifier, context)
  },
})

const { executeSagaSteps } = await import(
  '../src/workflows/image-upload.workflow'
)
const { CoordinatorShardDO } = await import(
  '../src/durable-objects/coordinator-shard.do'
)
const { ContainerSidecarDO } = await import(
  '../src/durable-objects/container-sidecar.do'
)

const uploadId = 'a8a73f4f-8d65-4b3a-a456-426614174000'
const draftId = 'draft-article-42'
const publicBase = 'https://images.example.com'

function createSampleProcessMetadata(id = uploadId): ProcessImageMetadata {
  return {
    uploadId: id,
    filename: 'photo.png',
    mimeType: 'image/png',
    filesize: 4,
    objectKeys: createObjectKeyPlan(id, 'image/png'),
  }
}

function createSampleProcessResult(id = uploadId): ProcessImageResult {
  const keys = createObjectKeyPlan(id, 'image/png')
  return {
    uploadId: id,
    original: {
      r2Key: keys.original,
      filename: keys.original.split('/').at(-1)!,
      mimeType: 'image/png',
      filesize: 4,
      width: 1600,
      height: 900,
    },
    focalX: 50,
    focalY: 50,
    variants: Object.fromEntries(
      VARIANT_IDS.map((variant) => [
        variant,
        {
          id: variant,
          format: 'webp',
          r2Key: keys.variants[variant],
          filename: keys.variants[variant].split('/').at(-1)!,
          mimeType: 'image/webp',
          filesize: 2,
          width: DEFAULT_VARIANTS[variant].width,
          height: DEFAULT_VARIANTS[variant].height,
        },
      ]),
    ) as ProcessImageResult['variants'],
  }
}

function createSampleTicket(shardName = 'coordinator-shard-0'): LeaseTicket {
  return {
    ticketId: '11111111-1111-4111-8111-111111111111',
    attemptId: '22222222-2222-4222-8222-222222222222',
    idempotencyKey: uploadId,
    uploadId,
    draftId,
    semanticHash: 'a'.repeat(64),
    shardName,
    sidecarName: 'container-sidecar-0',
    expiresAt: Date.now() + 60_000,
  }
}

test('handleImageUpload orchestrates RFC 8785 semantic sharding, lease ticket handoff, streaming to sidecar, and synchronous workflow completion', async () => {
  const expectedResult = createSampleProcessResult()
  const expectedResponse = resultToUploadResponse(
    expectedResult,
    12,
    publicBase,
  )
  let capturedAcquireInput: AcquireLeaseInput | undefined
  let capturedSidecarHeaders: Headers | undefined
  let capturedSidecarBody = ''
  let workflowCreatedId = ''

  const env: UploadRouteBindings = {
    MEDIA_PUBLIC_BASE_URL: publicBase,
    COORDINATOR_SHARD: {
      getByName: (name) => ({
        acquireLease: async (input) => {
          capturedAcquireInput = input
          return {
            status: 'LEASED',
            ticket: { ...createSampleTicket(name), semanticHash: input.semanticHash },
          }
        },
        completeLease: async () => undefined,
        failLease: async () => undefined,
      }),
    },
    CONTAINER_SIDECAR: {
      getByName: (sidecarName) => {
        assert.equal(sidecarName, 'container-sidecar-0')
        return {
          fetch: async (_url, init) => {
            capturedSidecarHeaders = new Headers(init?.headers)
            capturedSidecarBody = await new Response(init?.body).text()
            return Response.json(expectedResult)
          },
        }
      },
    },
    IMAGE_UPLOAD_WORKFLOW: {
      create: async ({ id, params }) => {
        workflowCreatedId = id
        assert.equal(params.result.uploadId, uploadId)
        return {
          id,
          status: async () => ({
            status: 'complete',
            output: expectedResponse,
          }),
        }
      },
    },
  }

  const request = new Request('https://texcra.example.com/api/upload', {
    method: 'POST',
    headers: {
      Origin: 'https://texcra.example.com',
      'Content-Type': 'image/png',
      'Content-Length': '4',
      [IDEMPOTENCY_KEY_HEADER]: uploadId,
      'x-image-metadata': encodeImageMetadata({
        uploadId,
        draft_id: draftId,
        filename: 'photo.png',
        mimeType: 'image/png',
        filesize: 4,
      }),
    },
    body: 'abcd',
  })

  const response = await handleImageUpload(request, env, {
    workflowPollIntervalMs: 1,
  })
  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.deepEqual(payload, expectedResponse)

  assert.ok(capturedAcquireInput)
  assert.equal(capturedAcquireInput.idempotencyKey, uploadId)
  assert.equal(capturedAcquireInput.draftId, draftId)
  assert.match(capturedAcquireInput.semanticHash, /^[0-9a-f]{64}$/)

  // Verify draft_id was stripped from ProcessImageMetadata forwarded to the container sidecar
  assert.ok(capturedSidecarHeaders)
  const rawMetadataHeader = capturedSidecarHeaders.get('x-image-metadata')
  assert.ok(rawMetadataHeader)
  const forwardedMetadata = decodeImageMetadata(
    rawMetadataHeader,
  ) as Record<string, unknown>
  assert.equal('draft_id' in forwardedMetadata, false)
  assert.ok(capturedSidecarHeaders.get(LEASE_TICKET_HEADER))
  assert.equal(capturedSidecarBody, 'abcd')
  assert.equal(
    workflowCreatedId,
    'upload-11111111-1111-4111-8111-111111111111',
  )
})

test('handleImageUpload short-circuits immediately when CoordinatorShardDO returns COMPLETED idempotent response', async () => {
  const expectedResult = createSampleProcessResult()
  const expectedResponse = resultToUploadResponse(expectedResult, 9, publicBase)
  let sidecarCalled = false

  const env: UploadRouteBindings = {
    MEDIA_PUBLIC_BASE_URL: publicBase,
    COORDINATOR_SHARD: {
      getByName: () => ({
        acquireLease: async () => ({
          status: 'COMPLETED',
          response: expectedResponse,
        }),
        completeLease: async () => undefined,
        failLease: async () => undefined,
      }),
    },
    CONTAINER_SIDECAR: {
      getByName: () => ({
        fetch: async () => {
          sidecarCalled = true
          return new Response(null, { status: 500 })
        },
      }),
    },
    IMAGE_UPLOAD_WORKFLOW: {
      create: async () => {
        throw new Error('Workflow should not be created on idempotent replay')
      },
    },
  }

  const request = new Request('https://texcra.example.com/api/upload', {
    method: 'POST',
    headers: {
      Origin: 'https://texcra.example.com',
      'Content-Type': 'image/png',
      'Content-Length': '4',
      [IDEMPOTENCY_KEY_HEADER]: uploadId,
      'x-image-metadata': encodeImageMetadata({
        uploadId,
        draft_id: draftId,
        filename: 'photo.png',
        mimeType: 'image/png',
        filesize: 4,
      }),
    },
    body: 'abcd',
  })

  const response = await handleImageUpload(request, env)
  assert.equal(response.status, 200)
  assert.equal(sidecarCalled, false)
  assert.deepEqual(await response.json(), expectedResponse)
})

test('handleImageUpload releases lease via failLease when ContainerSidecarDO fails and enforces auth middleware', async () => {
  let failedLeaseTicketId: string | undefined

  const env: UploadRouteBindings = {
    MEDIA_PUBLIC_BASE_URL: publicBase,
    COORDINATOR_SHARD: {
      getByName: (name) => ({
        acquireLease: async () => ({
          status: 'LEASED',
          ticket: createSampleTicket(name),
        }),
        completeLease: async () => undefined,
        failLease: async (ticketId) => {
          failedLeaseTicketId = ticketId
        },
      }),
    },
    CONTAINER_SIDECAR: {
      getByName: () => ({
        fetch: async () =>
          Response.json(
            {
              uploadId,
              error: {
                code: 'PROCESSOR_BUSY',
                message: 'Container busy.',
                retryable: true,
              },
            },
            { status: 503 },
          ),
      }),
    },
    IMAGE_UPLOAD_WORKFLOW: {
      create: async () => {
        throw new Error('Should not be reached')
      },
    },
  }

  const makeRequest = () =>
    new Request('https://texcra.example.com/api/upload', {
      method: 'POST',
      headers: {
        Origin: 'https://texcra.example.com',
        'Content-Type': 'image/png',
        'Content-Length': '4',
        'x-image-metadata': encodeImageMetadata({
          uploadId,
          draft_id: draftId,
          filename: 'photo.png',
          mimeType: 'image/png',
          filesize: 4,
        }),
      },
      body: 'abcd',
    })

  const busyResponse = await handleImageUpload(makeRequest(), env)
  assert.equal(busyResponse.status, 503)
  assert.equal(
    failedLeaseTicketId,
    '11111111-1111-4111-8111-111111111111',
  )

  // Verify custom AuthorizationMiddleware denial
  class DenyAuthMiddleware extends AuthorizationMiddleware {
    public override async authorize() {
      return { authenticated: false }
    }
  }
  const unauthorized = await handleImageUpload(makeRequest(), env, {
    auth: new DenyAuthMiddleware(),
  })
  assert.equal(unauthorized.status, 401)
})

test('executeSagaSteps compensates by deleting 8 R2 objects and failing lease when R2 verification fails and D1 has no committed row', async () => {
  const metadata = createSampleProcessMetadata()
  const result = createSampleProcessResult()
  const ticket = createSampleTicket()
  const deletedBatches: string[][] = []
  let releasedAttemptId = ''
  let failedTicketId = ''

  const stepRunner: WorkflowStepRunner = {
    do: async (
      _name: string,
      configOrCallback: unknown,
      maybeCallback?: unknown,
    ) => {
      const fn = (
        typeof configOrCallback === 'function'
          ? configOrCallback
          : maybeCallback
      ) as () => Promise<any>
      return await fn()
    },
  }

  await assert.rejects(
    executeSagaSteps(
      {
        MEDIA_PUBLIC_BASE_URL: publicBase,
        MEDIA_BUCKET: {
          head: async () => null, // Simulate missing R2 object
          delete: async (keys: string | string[]) => {
            deletedBatches.push(Array.isArray(keys) ? keys : [keys])
          },
        } as unknown as R2Bucket,
        DB: {
          prepare: () => ({
            bind: () => ({
              raw: async () => [],
            }),
          }),
        } as unknown as D1Database,
        CONTAINER_SIDECAR: {
          getByName: () => ({
            releaseSlot: async (attemptId: string) => {
              releasedAttemptId = attemptId
              return { isWarm: true }
            },
          }),
        } as unknown as Env['CONTAINER_SIDECAR'],
        COORDINATOR_SHARD: {
          getByName: () => ({
            completeLease: async () => undefined,
            failLease: async (ticketId: string) => {
              failedTicketId = ticketId
            },
          }),
        } as unknown as Env['COORDINATOR_SHARD'],
      },
      { ticket, metadata, result },
      stepRunner,
    ),
  )

  assert.equal(deletedBatches.length, 1)
  assert.equal(deletedBatches[0].length, 8)
  assert.equal(releasedAttemptId, ticket.attemptId)
  assert.equal(failedTicketId, ticket.ticketId)
})

test('boundedImageStream and readImageJson enforce exact byte boundaries', async () => {
  const source = new Response('abcd').body!
  const text = await new Response(boundedImageStream(source, 4)).text()
  assert.equal(text, 'abcd')

  await assert.rejects(
    new Response(boundedImageStream(new Response('abc').body!, 4)).text(),
  )
  await assert.rejects(
    readImageJson(new Response(JSON.stringify({ data: 'x'.repeat(200) })), 32),
  )
})

test('ContainerSidecarDO enforces slot reservation and R2 write-lease fencing', () => {
  const kv = new Map<string, string>()
  const sql = {
    exec: (query: string, ...params: unknown[]) => {
      if (query.startsWith('SELECT value FROM sidecar_state')) {
        const val = kv.get(String(params[0]))
        return { toArray: () => (val ? [{ value: val }] : []) }
      }
      if (query.startsWith('INSERT INTO sidecar_state')) {
        kv.set(String(params[0]), String(params[1]))
        return { toArray: () => [] }
      }
      if (query.startsWith('DELETE FROM sidecar_state')) {
        kv.delete(String(params[0]))
        return { toArray: () => [] }
      }
      return { toArray: () => [] }
    },
  } as unknown as SqlStorage

  const ctx = {
    id: { toString: () => 'sidecar-do-id' },
    storage: {
      sql,
      setAlarm: async () => undefined,
      deleteAlarm: async () => undefined,
    },
    container: {
      running: true,
      setInactivityTimeout: async () => undefined,
    },
    waitUntil: () => undefined,
  } as unknown as DurableObjectState

  const sidecar = new ContainerSidecarDO(ctx, {} as Env)
  const metadata = createSampleProcessMetadata()
  const ticket = createSampleTicket()

  const firstReserve = sidecar.tryReserveSlot(ticket, metadata)
  assert.deepEqual(firstReserve, {
    reserved: true,
    isWarm: true,
    activeLoad: 1,
  })

  // Second reservation while slot is active must fail
  const secondReserve = sidecar.tryReserveSlot(
    { ...ticket, ticketId: 'other-ticket', attemptId: 'other-attempt' },
    metadata,
  )
  assert.equal(secondReserve.reserved, false)

  // Transition active job to processing and test R2 write fencing
  const stateJson = kv.get('active')
  assert.ok(stateJson)
  const parsedState = JSON.parse(stateJson) as Record<string, unknown>
  kv.set('active', JSON.stringify({ ...parsedState, stage: 'processing' }))

  const token = sidecar.beginObjectWrite(
    ticket.attemptId,
    metadata.objectKeys.original,
    metadata.filesize,
    metadata.mimeType,
  )
  assert.match(token, /^[0-9a-f-]{36}$/)

  // Duplicate write to the same key must be rejected
  assert.throws(() =>
    sidecar.beginObjectWrite(
      ticket.attemptId,
      metadata.objectKeys.original,
      metadata.filesize,
      metadata.mimeType,
    ),
  )

  sidecar.finishObjectWrite(
    ticket.attemptId,
    metadata.objectKeys.original,
    token,
    true,
  )

  const release = sidecar.releaseSlot(ticket.attemptId)
  assert.equal(release.isWarm, true)
  assert.equal(kv.has('active'), false)
})

test('CoordinatorShardDO prevents conflicting idempotency keys and allocates from the shared 5-sidecar pool', async () => {
  const idempotencyMap = new Map<string, Record<string, unknown>>()
  const poolMap = new Map<string, Record<string, unknown>>()

  const sql = {
    exec: (query: string, ...params: unknown[]) => {
      const normalized = query.trim()
      if (
        normalized.startsWith('INSERT INTO sidecar_pool') &&
        params.length === 2
      ) {
        const nodeId = String(params[0])
        if (!poolMap.has(nodeId)) {
          poolMap.set(nodeId, {
            node_id: nodeId,
            active_load: 0,
            max_capacity: 1,
            is_warm: nodeId === 'container-sidecar-2' ? 1 : 0,
            updated_at: params[1],
          })
        }
        return { toArray: () => [] }
      }
      if (normalized.startsWith('SELECT * FROM sidecar_pool')) {
        return { toArray: () => Array.from(poolMap.values()) }
      }
      if (normalized.startsWith('UPDATE sidecar_pool')) {
        if (params.length === 4) {
          const nodeId = String(params[3])
          const existing = poolMap.get(nodeId)
          if (existing) {
            poolMap.set(nodeId, {
              ...existing,
              active_load: params[0],
              is_warm: params[1],
              updated_at: params[2],
            })
          }
        }
        return { toArray: () => [] }
      }
      if (
        normalized.startsWith(
          'SELECT * FROM idempotency_records WHERE idempotency_key = ?',
        )
      ) {
        const row = idempotencyMap.get(String(params[0]))
        return { toArray: () => (row ? [row] : []) }
      }
      if (
        normalized.startsWith(
          'SELECT * FROM idempotency_records WHERE semantic_hash = ?',
        )
      ) {
        const found = Array.from(idempotencyMap.values()).find(
          (r) => r.semantic_hash === params[0],
        )
        return { toArray: () => (found ? [found] : []) }
      }
      if (normalized.startsWith('INSERT INTO idempotency_records')) {
        const key = String(params[0])
        idempotencyMap.set(key, {
          idempotency_key: key,
          semantic_hash: params[1],
          upload_id: params[2],
          draft_id: params[3],
          metadata_json: params[4],
          status: 'LEASED',
          ticket_json: params[5],
          response_json: null,
          expires_at: params[6],
          updated_at: params[7],
        })
        return { toArray: () => [] }
      }
      if (normalized.startsWith('SELECT MIN(expires_at)')) {
        return { toArray: () => [{ next_expiry: null }] }
      }
      return { toArray: () => [] }
    },
  } as unknown as SqlStorage

  const ctx = {
    storage: {
      sql,
      setAlarm: async () => undefined,
      deleteAlarm: async () => undefined,
    },
  } as unknown as DurableObjectState

  const env = {
    MEDIA_PUBLIC_BASE_URL: publicBase,
    DB: {
      prepare: () => ({
        bind: () => ({
          raw: async () => [],
        }),
      }),
    } as unknown as D1Database,
    CONTAINER_SIDECAR: {
      getByName: () => ({
        tryReserveSlot: async () => ({
          reserved: true,
          isWarm: true,
          activeLoad: 1,
        }),
      }),
    },
  } as unknown as Env

  const shard = new CoordinatorShardDO(ctx, env)
  const metadata = createSampleProcessMetadata()

  const leaseOutcome = await shard.acquireLease({
    idempotencyKey: uploadId,
    uploadId,
    draftId,
    semanticHash: 'c'.repeat(64),
    shardName: 'coordinator-shard-0',
    metadata,
  })

  assert.equal(leaseOutcome.status, 'LEASED')
  // container-sidecar-2 was marked warm in the pool, so FillFirstBinPackerAdapter selects it first!
  assert.equal(leaseOutcome.ticket.sidecarName, 'container-sidecar-2')

  // Reusing the same idempotencyKey with a different semanticHash must throw INVALID_INPUT
  await assert.rejects(
    shard.acquireLease({
      idempotencyKey: uploadId,
      uploadId,
      draftId: 'different-draft',
      semanticHash: 'd'.repeat(64),
      shardName: 'coordinator-shard-0',
      metadata,
    }),
    /idempotency key was already used/,
  )
})
