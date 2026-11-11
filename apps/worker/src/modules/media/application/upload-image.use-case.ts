import {
  encodeImageMetadata,
  ImageProcessingError,
  IMAGE_PROCESSING_LIMITS,
  parseProcessImageResult,
  parseUploadErrorResponse,
  parseUploadImageResponse,
} from 'shared/image-processing'
import type {
  ProcessImageResult,
  UploadImageResponse,
} from 'shared/image-processing'
import { SemanticShardRouterAdapter } from '../domain/services/semantic-shard-router'
import { Rfc8785Canonicalizer } from '../domain/services/rfc8785-canonicalizer'
import type { IShardRouter } from '../domain/ports/shard-router.port'
import {
  BoundedByteStream,
  BoundedJsonReader,
  ImageHttpResponder,
} from '../http'
import { MediaUrlResolver } from '../infrastructure/media-url.resolver'
import {
  parseIncomingUploadMetadata,
  validateIdentifier,
} from './upload-metadata.parser'
import {
  IDEMPOTENCY_KEY_HEADER,
  LEASE_TICKET_HEADER,
} from './upload-image.types'
import type {
  HandleImageUploadDependencies,
  UploadRouteBindings,
  WorkflowInstanceStub,
} from './upload-image.types'

const defaultCanonicalizer = new Rfc8785Canonicalizer()
const defaultShardRouter: IShardRouter = new SemanticShardRouterAdapter(
  5,
  'coordinator-shard',
)

async function awaitWorkflowCompletion(
  instance: WorkflowInstanceStub,
  signal: AbortSignal,
  pollIntervalMs = 25,
): Promise<UploadImageResponse> {
  const deadline = Date.now() + IMAGE_PROCESSING_LIMITS.processingMs
  for (;;) {
    signal.throwIfAborted()
    const state = await instance.status()
    if (state.status === 'complete') {
      return parseUploadImageResponse(state.output)
    }
    if (state.status === 'errored' || state.status === 'terminated') {
      const message =
        typeof state.error === 'string'
          ? state.error
          : (state.error?.message ?? 'The image upload workflow failed.')
      throw new ImageProcessingError('PERSISTENCE_FAILED', message)
    }
    if (Date.now() >= deadline) {
      throw new ImageProcessingError(
        'PROCESSING_TIMEOUT',
        'The image upload workflow timed out.',
      )
    }
    // Polling delay while awaiting Cloudflare Workflow step completion
    await new Promise<void>((resolve) => setTimeout(resolve, pollIntervalMs))
  }
}

export async function handleImageUpload(
  request: Request,
  env?: UploadRouteBindings,
  deps: HandleImageUploadDependencies = {},
): Promise<Response> {
  let uploadId: string | undefined
  const canonicalizer = deps.canonicalizer ?? defaultCanonicalizer
  const shardRouter = deps.shardRouter ?? defaultShardRouter

  try {
    if (
      !env?.COORDINATOR_SHARD ||
      !env.CONTAINER_SIDECAR ||
      !env.IMAGE_UPLOAD_WORKFLOW
    ) {
      throw new ImageProcessingError(
        'CONTAINER_START_FAILED',
        'Image processing is not configured for this deployment.',
      )
    }

    const origin = request.headers.get('Origin')
    if (
      (origin && origin !== new URL(request.url).origin) ||
      request.headers.get('Sec-Fetch-Site') === 'cross-site'
    ) {
      throw new ImageProcessingError(
        'FORBIDDEN',
        'Cross-origin image uploads are not allowed.',
      )
    }

    MediaUrlResolver.validateOrigin(env.MEDIA_PUBLIC_BASE_URL ?? '')

    if (request.method !== 'POST' || !request.body) {
      throw new ImageProcessingError(
        'INVALID_INPUT',
        'An image body is required.',
      )
    }

    const { metadata, draft_id } = parseIncomingUploadMetadata(
      request.headers.get('x-image-metadata') ?? '',
    )
    uploadId = metadata.uploadId

    const rawIdempotencyHeader = request.headers.get(IDEMPOTENCY_KEY_HEADER)
    const idempotencyKey =
      rawIdempotencyHeader !== null
        ? validateIdentifier(rawIdempotencyHeader, IDEMPOTENCY_KEY_HEADER)
        : (metadata.uploadId ?? crypto.randomUUID())

    const contentType = request.headers
      .get('Content-Type')
      ?.split(';', 1)[0]
      ?.trim()
    if (
      contentType !== metadata.mimeType &&
      contentType !== 'application/octet-stream'
    ) {
      throw new ImageProcessingError(
        'UNSUPPORTED_FORMAT',
        'The upload content type does not match its metadata.',
      )
    }

    const declaredLength = request.headers.get('Content-Length')
    if (metadata.filesize > IMAGE_PROCESSING_LIMITS.maxInputBytes) {
      throw new ImageProcessingError(
        'UPLOAD_TOO_LARGE',
        'The maximum image upload size is 20 MiB.',
      )
    }
    if (
      declaredLength !== null &&
      (!/^\d+$/.test(declaredLength) ||
        Number(declaredLength) !== metadata.filesize)
    ) {
      throw new ImageProcessingError(
        'INVALID_INPUT',
        'The upload content length does not match its metadata.',
      )
    }

    const semanticHash = await canonicalizer.computeSemanticHash({
      ...(draft_id !== undefined ? { draft_id } : {}),
      filename: metadata.filename,
      mimeType: metadata.mimeType,
      filesize: metadata.filesize,
      ...(metadata.contentHash !== undefined
        ? { contentHash: metadata.contentHash }
        : {}),
      ...(metadata.crop ? { crop: metadata.crop } : {}),
      ...(metadata.focalPoint ? { focalPoint: metadata.focalPoint } : {}),
    })

    const shardName = shardRouter.resolveShardName(semanticHash)
    const coordinator = env.COORDINATOR_SHARD.getByName(shardName)

    const leaseOutcome = await coordinator.acquireLease({
      idempotencyKey,
      uploadId: metadata.uploadId,
      draftId: draft_id,
      semanticHash,
      shardName,
      metadata,
    })

    if (leaseOutcome.status === 'COMPLETED') {
      await request.body.cancel().catch(() => undefined)
      return ImageHttpResponder.getInstance().toJsonResponse(
        leaseOutcome.response,
      )
    }

    const { ticket, metadata: processMetadata } = leaseOutcome
    uploadId = ticket.uploadId
    const sidecar = env.CONTAINER_SIDECAR.getByName(ticket.sidecarName)
    let processedResult: ProcessImageResult
    try {
      // Forward only the image contract and fenced lease ticket; browser cookies and authorization stay at the edge.
      const sidecarResponse = await sidecar.fetch(
        'http://container-sidecar/process',
        {
          method: 'POST',
          headers: {
            'Content-Type': metadata.mimeType,
            'x-image-metadata': encodeImageMetadata(processMetadata),
            [LEASE_TICKET_HEADER]: JSON.stringify(ticket),
          },
          body: BoundedByteStream.getInstance().wrap(
            request.body,
            metadata.filesize,
          ),
          signal: request.signal,
        },
      )
      const sidecarPayload =
        await BoundedJsonReader.getInstance().read(sidecarResponse)
      if (!sidecarResponse.ok) {
        const failure = parseUploadErrorResponse(sidecarPayload)
        throw new ImageProcessingError(
          failure.error.code,
          failure.error.message,
        )
      }
      processedResult = parseProcessImageResult(sidecarPayload, processMetadata)
    } catch (error) {
      await coordinator
        .failLease(ticket.ticketId, ticket.attemptId, null, false)
        .catch(() => undefined)
      throw error
    }

    const workflowInstance = await env.IMAGE_UPLOAD_WORKFLOW.create({
      id: `upload-${ticket.ticketId}`,
      params: {
        ticket,
        metadata: processMetadata,
        result: processedResult,
      },
    })

    const uploadResponse = await awaitWorkflowCompletion(
      workflowInstance,
      request.signal,
      deps.workflowPollIntervalMs,
    )

    return ImageHttpResponder.getInstance().toJsonResponse(uploadResponse)
  } catch (error) {
    return ImageHttpResponder.getInstance().toErrorResponse(error, uploadId)
  }
}
