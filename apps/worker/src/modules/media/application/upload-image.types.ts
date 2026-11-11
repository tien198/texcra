import type { UploadMetadata } from 'shared/image-processing'
import type { Rfc8785Canonicalizer } from '../domain/services/rfc8785-canonicalizer'
import type { IShardRouter } from '../domain/ports/shard-router.port'

export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key'
export const LEASE_TICKET_HEADER = 'x-lease-ticket'

export type UploadRouteBindings = Partial<Env>

export interface WorkflowInstanceStub {
  id: string
  status: () => Promise<{
    status:
      | 'queued'
      | 'running'
      | 'paused'
      | 'errored'
      | 'terminated'
      | 'complete'
      | 'waiting'
      | 'waitingForPause'
      | 'rollingBack'
      | 'unknown'
    error?: { name?: string; message: string } | string
    output?: unknown
  }>
}

export interface IncomingUploadMetadata {
  readonly metadata: UploadMetadata
  readonly draft_id?: string
}

export interface HandleImageUploadDependencies {
  readonly canonicalizer?: Rfc8785Canonicalizer
  readonly shardRouter?: IShardRouter
  readonly workflowPollIntervalMs?: number
}
