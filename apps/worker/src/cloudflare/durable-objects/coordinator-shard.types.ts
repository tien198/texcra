import { IMAGE_PROCESSING_LIMITS } from 'shared/image-processing'
import type {
  ProcessImageMetadata,
  UploadImageResponse,
  UploadMetadata,
} from 'shared/image-processing'
import type { IBinPacker } from '#/modules/media/domain/ports/bin-packer.port'
import type { IMediaRepository } from '#/modules/media/domain/ports/media-repository.port'
import type { CoordinatorShardStorage } from './coordinator-shard.storage'

export const SHARED_SIDECAR_POOL_NAMES = [
  'container-sidecar-0',
  'container-sidecar-1',
  'container-sidecar-2',
  'container-sidecar-3',
  'container-sidecar-4',
] as const

export const LEASE_TTL_MS =
  IMAGE_PROCESSING_LIMITS.startupMs +
  IMAGE_PROCESSING_LIMITS.processingMs +
  15_000

export interface LeaseTicket {
  readonly ticketId: string
  readonly attemptId: string
  readonly idempotencyKey: string
  readonly uploadId: string
  readonly draftId?: string
  readonly semanticHash: string
  readonly shardName: string
  readonly sidecarName: string
  readonly expiresAt: number
}

export interface AcquireLeaseInput {
  readonly idempotencyKey: string
  readonly uploadId?: string
  readonly draftId?: string
  readonly semanticHash: string
  readonly shardName: string
  readonly metadata: UploadMetadata
}

export type AcquireLeaseResult =
  | { readonly status: 'COMPLETED'; readonly response: UploadImageResponse }
  | {
      readonly status: 'LEASED'
      readonly ticket: LeaseTicket
      readonly metadata: ProcessImageMetadata
    }

export interface IdempotencyRow extends Record<string, SqlStorageValue> {
  idempotency_key: string
  semantic_hash: string
  upload_id: string
  draft_id: string | null
  metadata_json: string
  status: 'LEASED' | 'COMPLETED' | 'FAILED'
  ticket_json: string | null
  response_json: string | null
  expires_at: number | null
  updated_at: number
}

export interface SidecarPoolRow extends Record<string, SqlStorageValue> {
  node_id: string
  active_load: number
  max_capacity: number
  is_warm: number
  updated_at: number
}

export interface CoordinatorLeaseDeps {
  readonly storage: CoordinatorShardStorage
  readonly binPacker: IBinPacker
  readonly getMediaRepo: () => IMediaRepository
  readonly sidecarNamespace: Env['CONTAINER_SIDECAR']
  readonly scheduleNextExpiryAlarm: () => Promise<void>
}
