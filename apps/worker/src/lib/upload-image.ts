import {
  encodeImageMetadata,
  parseUploadMetadata,
  parseUploadImageResponse,
  parseUploadErrorResponse,
} from 'shared/image-processing'
import type {
  CropData,
  FocalPoint,
  UploadErrorResponse,
  UploadImageResponse,
} from 'shared/image-processing'

export interface UploadImageOptions {
  /** Reuse only when retrying the same file and processing options. */
  uploadId?: string
  crop?: CropData
  focalPoint?: FocalPoint
  signal?: AbortSignal
}

export class ImageUploadError extends Error {
  constructor(
    public readonly response: UploadErrorResponse,
    public readonly status: number,
  ) {
    super(response.error.message)
    this.name = 'ImageUploadError'
  }
}

/** Called from browser events; the File is the raw request body. */
export async function uploadImage(
  file: File,
  options: UploadImageOptions = {},
): Promise<UploadImageResponse> {
  const metadata = parseUploadMetadata({
    uploadId: options.uploadId ?? crypto.randomUUID(),
    filename: file.name,
    mimeType: file.type,
    filesize: file.size,
    ...(options.crop ? { crop: options.crop } : {}),
    ...(options.focalPoint ? { focalPoint: options.focalPoint } : {}),
  })
  const response = await fetch('/api/upload', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': metadata.mimeType,
      'x-image-metadata': encodeImageMetadata(metadata),
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
    throw new ImageUploadError(parseUploadErrorResponse(payload), response.status)
  }
  const result = parseUploadImageResponse(payload)
  if (result.uploadId !== metadata.uploadId) {
    throw new Error('The upload response does not match this upload.')
  }
  return result
}
