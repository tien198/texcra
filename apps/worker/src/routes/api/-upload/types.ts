import type {
  UploadImageResponse,
  UploadMetadata,
} from 'shared/image-processing'
import type { Rfc8785Canonicalizer } from '#/core/idempotency/rfc8785-canonicalizer'
import type { IShardRouter } from '#/core/ports/shard-router.port'
import type {
  AcquireLeaseInput,
  AcquireLeaseResult,
} from '#/durable-objects/coordinator-shard.do'
import type { AuthorizationMiddleware } from '#/middleware/auth.middleware'
import type { ImageUploadWorkflowParams } from '#/workflows/image-upload.workflow'

export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key'
export const LEASE_TICKET_HEADER = 'x-lease-ticket'

export interface CoordinatorShardStub {
  acquireLease: (input: AcquireLeaseInput) => Promise<AcquireLeaseResult>
  completeLease: (
    ticketId: string,
    attemptId: string,
    response: UploadImageResponse,
    sidecarWarm?: boolean,
  ) => Promise<void>
  failLease: (
    ticketId: string,
    attemptId: string,
    recoveredResponse?: UploadImageResponse | null,
    sidecarWarm?: boolean,
  ) => Promise<void>
}

export interface ContainerSidecarStub {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

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

export interface UploadRouteBindings {
  COORDINATOR_SHARD: {
    getByName: (name: string) => CoordinatorShardStub
  }
  CONTAINER_SIDECAR: {
    getByName: (name: string) => ContainerSidecarStub
  }
  IMAGE_UPLOAD_WORKFLOW: {
    create: (options: {
      id: string
      params: ImageUploadWorkflowParams
    }) => Promise<WorkflowInstanceStub>
  }
  MEDIA_PUBLIC_BASE_URL: string
}

export interface IncomingUploadMetadata {
  readonly metadata: UploadMetadata
  readonly draft_id: string
}

export interface HandleImageUploadDependencies {
  readonly auth?: AuthorizationMiddleware
  readonly canonicalizer?: Rfc8785Canonicalizer
  readonly shardRouter?: IShardRouter
  readonly workflowPollIntervalMs?: number
}
