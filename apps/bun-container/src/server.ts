import {
  decodeImageMetadata,
  IMAGE_METADATA_HEADER,
  IMAGE_PROCESSING_LIMITS,
  ImageProcessingError,
  parseProcessImageMetadata,
} from 'shared/image-processing'
import type {
  IImageProcessor,
  UploadErrorCode,
  UploadErrorResponse,
} from 'shared/image-processing'
import { SharpImageProcessor } from './processor'
import { R2BridgeStorage } from './storage'

const statuses: Record<UploadErrorCode, number> = {
  INVALID_INPUT: 400,
  UNSUPPORTED_FORMAT: 415,
  UPLOAD_TOO_LARGE: 413,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  PROCESSOR_BUSY: 503,
  CONTAINER_START_FAILED: 503,
  PROCESSING_TIMEOUT: 504,
  STORAGE_FAILED: 502,
  PERSISTENCE_FAILED: 500,
  INTERNAL_ERROR: 500,
}

function errorResponse(error: unknown, uploadId?: string) {
  const known = error instanceof ImageProcessingError
  const code = known ? error.code : 'INTERNAL_ERROR'
  const retryable = [
    'PROCESSOR_BUSY',
    'CONTAINER_START_FAILED',
    'PROCESSING_TIMEOUT',
    'STORAGE_FAILED',
    'INTERNAL_ERROR',
  ].includes(code)
  const body: UploadErrorResponse = {
    ...(uploadId ? { uploadId } : {}),
    error: {
      code,
      message: known ? error.message : 'Image processing failed',
      retryable,
    },
  }
  return Response.json(body, {
    status: statuses[code],
    headers: retryable ? { 'retry-after': '2' } : undefined,
  })
}

export interface ImageServerOptions {
  port?: number
  hostname?: string
  processor?: IImageProcessor
  /** Shorter injected deadlines make cancellation tests deterministic. */
  processingMs?: number
}

export function startImageServer(options: ImageServerOptions = {}) {
  const processor =
    options.processor ?? new SharpImageProcessor(new R2BridgeStorage())
  const processingMs =
    options.processingMs ?? IMAGE_PROCESSING_LIMITS.processingMs
  let activeUploadId: string | undefined
  let active = false
  return Bun.serve({
    hostname: options.hostname ?? '0.0.0.0',
    port: options.port ?? Number(process.env.PORT ?? 3001),
    maxRequestBodySize: IMAGE_PROCESSING_LIMITS.maxInputBytes,
    // Bun defaults to 10 seconds, shorter than a legitimate native image encode.
    idleTimeout: 130,
    async fetch(request, server) {
      const path = new URL(request.url).pathname
      if (request.method === 'GET' && path === '/healthz') {
        return Response.json({
          ok: true,
          busy: active,
          uploadId: activeUploadId ?? null,
        })
      }
      if (request.method !== 'POST' || path !== '/process') {
        return new Response('Not found', { status: 404 })
      }
      // Check admission before touching the incoming body. Never queue requests.
      if (active)
        return errorResponse(
          new ImageProcessingError('PROCESSOR_BUSY', 'Image processor is busy'),
        )
      let uploadId: string | undefined
      let timer: ReturnType<typeof setTimeout> | undefined
      const controller = new AbortController()
      const onAbort = () => controller.abort(request.signal.reason)
      try {
        const metadata = parseProcessImageMetadata(
          decodeImageMetadata(request.headers.get(IMAGE_METADATA_HEADER)),
        )
        uploadId = metadata.uploadId
        if (!request.body)
          throw new ImageProcessingError(
            'INVALID_INPUT',
            'Image body is required',
          )
        if (request.headers.get('content-type') !== metadata.mimeType) {
          throw new ImageProcessingError(
            'INVALID_INPUT',
            'Content-Type differs from image metadata',
          )
        }
        const declaredLength = request.headers.get('content-length')
        if (
          declaredLength !== null &&
          (!/^\d+$/.test(declaredLength) ||
            Number(declaredLength) !== metadata.filesize)
        ) {
          throw new ImageProcessingError(
            'INVALID_INPUT',
            'Content-Length differs from image metadata',
          )
        }
        active = true
        activeUploadId = uploadId
        request.signal.addEventListener('abort', onAbort, { once: true })
        if (request.signal.aborted) onAbort()
        server.timeout(request, 130)
        timer = setTimeout(
          () =>
            controller.abort(
              new ImageProcessingError(
                'PROCESSING_TIMEOUT',
                'Image processing exceeded its deadline',
              ),
            ),
          processingMs,
        )
        const result = await processor.processImage(
          request.body,
          metadata,
          controller.signal,
        )
        controller.signal.throwIfAborted()
        return Response.json(result)
      } catch (error) {
        const failure = controller.signal.aborted
          ? controller.signal.reason
          : error
        console.error(
          JSON.stringify({
            uploadId,
            stage: 'process',
            code:
              failure instanceof ImageProcessingError
                ? failure.code
                : 'INTERNAL_ERROR',
          }),
        )
        return errorResponse(failure, uploadId)
      } finally {
        if (timer !== undefined) clearTimeout(timer)
        request.signal.removeEventListener('abort', onAbort)
        // Awaited processor cleanup precedes admission release, including aborts.
        active = false
        activeUploadId = undefined
      }
    },
    error(error) {
      return errorResponse(error)
    },
  })
}

if (import.meta.main) {
  const server = startImageServer()
  console.log(`Image processor listening on ${server.hostname}:${server.port}`)
}
