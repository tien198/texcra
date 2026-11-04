import { ImageProcessingError } from 'shared/image-processing'
import type {
  UploadErrorCode,
  UploadErrorResponse,
} from 'shared/image-processing'

const ERROR_STATUS_MAP: Readonly<Record<UploadErrorCode, number>> = {
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

export class ImageHttpResponder {
  private static instance?: ImageHttpResponder

  public static getInstance(): ImageHttpResponder {
    ImageHttpResponder.instance ??= new ImageHttpResponder()
    return ImageHttpResponder.instance
  }

  public toJsonResponse(payload: unknown, status = 200): Response {
    return Response.json(payload, {
      status,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  public toErrorResponse(error: unknown, uploadId?: string): Response {
    const known = error instanceof ImageProcessingError
    const code: UploadErrorCode = known ? error.code : 'INTERNAL_ERROR'
    const status = ERROR_STATUS_MAP[code]
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
}
