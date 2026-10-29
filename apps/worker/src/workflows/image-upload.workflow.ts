import { WorkflowEntrypoint } from 'cloudflare:workers'
import type { WorkflowEvent, WorkflowStep } from 'cloudflare:workers'
import { ImageProcessingError } from 'shared/image-processing'
import type {
  ProcessImageMetadata,
  ProcessImageResult,
  UploadImageResponse,
} from 'shared/image-processing'
import type { LeaseTicket } from '#/durable-objects/coordinator-shard.do'
import { validateMediaOrigin } from '#/server/image-http'
import { findMediaByOriginalFilename, persistMedia } from '#/server/media'

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

export async function executeSagaSteps(
  env: SagaEnvironment,
  payload: ImageUploadWorkflowParams,
  step: WorkflowStepRunner,
): Promise<UploadImageResponse> {
  const { ticket, metadata, result } = payload

  try {
    await step.do(
      'verify-r2-objects',
      {
        retries: {
          limit: 2,
          delay: '1 second',
          backoff: 'exponential',
        },
      },
      async () => {
        const items = [result.original, ...Object.values(result.variants)]
        for (const item of items) {
          const head = await env.MEDIA_BUCKET.head(item.r2Key)
          if (head === null || head.size !== item.filesize) {
            throw new ImageProcessingError(
              'STORAGE_FAILED',
              `Missing or mismatched R2 object: ${item.r2Key}`,
            )
          }
        }
      },
    )

    const response = await step.do(
      'persist-d1-metadata',
      {
        retries: {
          limit: 3,
          delay: '1 second',
          backoff: 'exponential',
        },
      },
      async () => {
        const publicBase = validateMediaOrigin(env.MEDIA_PUBLIC_BASE_URL)
        return await persistMedia(env.DB, result, publicBase)
      },
    )

    await step.do(
      'finalize-lease-and-idempotency',
      {
        retries: {
          limit: 3,
          delay: '1 second',
          backoff: 'exponential',
        },
      },
      async () => {
        const sidecar = env.CONTAINER_SIDECAR.getByName(ticket.sidecarName)
        const { isWarm } = await sidecar.releaseSlot(ticket.attemptId)
        const shard = env.COORDINATOR_SHARD.getByName(ticket.shardName)
        await shard.completeLease(
          ticket.ticketId,
          ticket.attemptId,
          response,
          isWarm,
        )
      },
    )

    return response
  } catch (error) {
    await step.do(
      'compensate-r2-and-release-lease',
      {
        retries: {
          limit: 3,
          delay: '1 second',
          backoff: 'exponential',
        },
      },
      async () => {
        const originalFilename = metadata.objectKeys.original.split('/').at(-1)!
        const committed = await findMediaByOriginalFilename(
          env.DB,
          originalFilename,
          metadata.uploadId,
          validateMediaOrigin(env.MEDIA_PUBLIC_BASE_URL),
        ).catch(() => null)

        if (!committed) {
          await env.MEDIA_BUCKET.delete([
            metadata.objectKeys.original,
            ...Object.values(metadata.objectKeys.variants),
          ])
        }

        const sidecar = env.CONTAINER_SIDECAR.getByName(ticket.sidecarName)
        const { isWarm } = await sidecar.releaseSlot(ticket.attemptId)
        const shard = env.COORDINATOR_SHARD.getByName(ticket.shardName)
        await shard.failLease(
          ticket.ticketId,
          ticket.attemptId,
          committed,
          isWarm,
        )
      },
    )
    throw error
  }
}

export class ImageUploadWorkflow extends WorkflowEntrypoint<
  Env,
  ImageUploadWorkflowParams
> {
  override async run(
    event: Readonly<WorkflowEvent<ImageUploadWorkflowParams>>,
    step: WorkflowStep,
  ): Promise<UploadImageResponse> {
    return await executeSagaSteps(this.env, event.payload, step)
  }
}
