import {
  ImageProcessingError,
  IMAGE_PROCESSING_LIMITS,
} from 'shared/image-processing'
import type {
  UploadErrorCode,
  UploadErrorResponse,
} from 'shared/image-processing'

const errorStatus: Record<UploadErrorCode, number> = {
  INVALID_INPUT: 400,
  UNSUPPORTED_FORMAT: 415,
  UPLOAD_TOO_LARGE: 413,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  PROCESSOR_BUSY: 503,
  CONTAINER_START_FAILED: 503,
  PROCESSING_TIMEOUT: 504,
  STORAGE_FAILED: 502,
  PERSISTENCE_FAILED: 503,
  INTERNAL_ERROR: 500,
}

export function imageErrorResponse(
  error: unknown,
  uploadId?: string,
): Response {
  const known = error instanceof ImageProcessingError
  const code = known ? error.code : 'INTERNAL_ERROR'
  const status = errorStatus[code]
  const payload: UploadErrorResponse = {
    ...(uploadId ? { uploadId } : {}),
    error: {
      code,
      message: known
        ? error.message
        : 'The image upload could not be completed.',
      retryable: status >= 500,
    },
  }
  return Response.json(payload, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...(status === 503 ? { 'Retry-After': '5' } : {}),
    },
  })
}

/** Pull only when the downstream consumer is ready; never accumulate image chunks. */
export function boundedImageStream(
  source: ReadableStream<Uint8Array>,
  expectedBytes: number,
): ReadableStream<Uint8Array> {
  const reader = source.getReader()
  let bytes = 0
  return new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        try {
          const chunk = await reader.read()
          if (chunk.done) {
            if (bytes !== expectedBytes)
              throw new ImageProcessingError(
                'INVALID_INPUT',
                'The image byte count does not match its metadata.',
              )
            controller.close()
            reader.releaseLock()
            return
          }
          bytes += chunk.value.byteLength
          if (
            bytes > IMAGE_PROCESSING_LIMITS.maxInputBytes ||
            bytes > expectedBytes
          ) {
            throw new ImageProcessingError(
              'UPLOAD_TOO_LARGE',
              'The image exceeds the declared upload size.',
            )
          }
          controller.enqueue(chunk.value)
        } catch (error) {
          await reader.cancel(error).catch(() => undefined)
          controller.error(error)
        }
      },
      async cancel(reason) {
        await reader.cancel(reason)
      },
    },
    { highWaterMark: 0 },
  )
}

/** Only small JSON control responses are buffered, with a hard byte ceiling. */
export async function readImageJson(
  response: Response,
  maxBytes = 64 * 1024,
): Promise<unknown> {
  if (!response.body)
    throw new ImageProcessingError(
      'INTERNAL_ERROR',
      'The processor returned an empty response.',
    )
  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let bytes = 0
  let text = ''
  try {
    for (;;) {
      const chunk = await reader.read()
      if (chunk.done) break
      bytes += chunk.value.byteLength
      if (bytes > maxBytes)
        throw new ImageProcessingError(
          'INTERNAL_ERROR',
          'The processor response was too large.',
        )
      text += decoder.decode(chunk.value, { stream: true })
    }
    text += decoder.decode()
    return JSON.parse(text)
  } catch (error) {
    await reader.cancel(error).catch(() => undefined)
    throw error
  } finally {
    reader.releaseLock()
  }
}

export function validateMediaOrigin(value: string): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new ImageProcessingError(
      'INTERNAL_ERROR',
      'The public media origin has not been configured.',
    )
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw new ImageProcessingError(
      'INTERNAL_ERROR',
      'The public media origin is invalid.',
    )
  }
  return url.origin
}
