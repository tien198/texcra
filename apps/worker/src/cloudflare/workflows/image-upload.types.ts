import type { WorkflowStep } from 'cloudflare:workers'
import type {
  ProcessImageMetadata,
  ProcessImageResult,
} from 'shared/image-processing'
import type { LeaseTicket } from '#/cloudflare/durable-objects/coordinator-shard.types'

export interface ImageUploadWorkflowParams {
  readonly ticket: LeaseTicket
  readonly metadata: ProcessImageMetadata
  readonly result: ProcessImageResult
}

export type WorkflowStepRunner = Pick<WorkflowStep, 'do'>

export interface SagaEnvironment {
  readonly MEDIA_BUCKET: R2Bucket
  readonly DB: D1Database
  readonly MEDIA_PUBLIC_BASE_URL: string
  readonly CONTAINER_SIDECAR: Env['CONTAINER_SIDECAR']
  readonly COORDINATOR_SHARD: Env['COORDINATOR_SHARD']
}
