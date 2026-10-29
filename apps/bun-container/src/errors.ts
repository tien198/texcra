import {
  decodeImageMetadata,
  ImageProcessingError,
  parseProcessImageMetadata,
} from 'shared/image-processing'
import type {
  ProcessImageMetadata,
  UploadErrorResponse,
} from 'shared/image-processing'
import { APP_CONFIG } from './config'

export function createErrorResponse(
  error: unknown,
  uploadId?: string,
): Response {
  const known = error instanceof ImageProcessingError
  const code = known ? error.code : 'INTERNAL_ERROR'
  const retryable = APP_CONFIG.errors.retryableCodes.has(code)
  const body: UploadErrorResponse = {
    ...(uploadId ? { uploadId } : {}),
    error: {
      code,
      message: known ? error.message : 'Image processing failed',
      retryable,
    },
  }
  return Response.json(body, {
    status: APP_CONFIG.errors.statuses[code],
    headers: retryable
      ? { 'retry-after': APP_CONFIG.server.retryAfterSeconds }
      : undefined,
  })
}

export function validateProcessRequest(request: Request): {
  metadata: ProcessImageMetadata
  body: ReadableStream<Uint8Array>
} {
  const metadata = parseProcessImageMetadata(
    decodeImageMetadata(request.headers.get(APP_CONFIG.server.metadataHeader)),
  )
  if (!request.body) {
    throw new ImageProcessingError('INVALID_INPUT', 'Image body is required')
  }
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
  return { metadata, body: request.body }
}
