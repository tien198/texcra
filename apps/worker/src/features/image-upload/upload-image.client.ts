import {
  encodeImageMetadata,
  parseUploadMetadata,
  parseUploadImageResponse,
  parseUploadErrorResponse,
} from 'shared/image-processing'
import type { UploadImageResponse } from 'shared/image-processing'
import { ImageUploadError } from './image-upload.error'
import type { UploadImageOptions } from './image-upload.types'
import { computeFileHash } from './utils'

export { computeFileHash }
export { ImageUploadError }
export type { UploadImageOptions }

/** Called from browser events; the File is the raw request body. */
export async function uploadImage(
  file: File,
  options: UploadImageOptions = {},
): Promise<UploadImageResponse> {
  const contentHash = options.contentHash ?? (await computeFileHash(file))
  const metadata = parseUploadMetadata({
    ...(options.uploadId !== undefined ? { uploadId: options.uploadId } : {}),
    filename: file.name,
    mimeType: file.type,
    filesize: file.size,
    contentHash,
    ...(options.crop ? { crop: options.crop } : {}),
    ...(options.focalPoint ? { focalPoint: options.focalPoint } : {}),
  })
  const idempotencyKey =
    options.idempotencyKey ?? options.uploadId ?? crypto.randomUUID()

  const response = await fetch('/api/upload', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': metadata.mimeType,
      'Idempotency-Key': idempotencyKey,
      'x-image-metadata': encodeImageMetadata({
        ...metadata,
        ...(options.draft_id !== undefined
          ? { draft_id: options.draft_id }
          : {}),
      }),
    },
    body: file,
    signal: options.signal,
  })
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new Error('The upload server returned an invalid response.')
  }
  if (!response.ok) {
    throw new ImageUploadError(
      parseUploadErrorResponse(payload),
      response.status,
    )
  }
  return parseUploadImageResponse(payload)
}
