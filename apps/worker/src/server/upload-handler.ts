import {
  createObjectKeyPlan,
  decodeImageMetadata,
  encodeImageMetadata,
  ImageProcessingError,
  IMAGE_PROCESSING_LIMITS,
  parseUploadMetadata,
} from 'shared/image-processing'
import { authorizeImageUpload } from './upload-authorization'
import {
  boundedImageStream,
  imageErrorResponse,
  validateMediaOrigin,
} from './image-http'

export function processorSlot(uploadId: string): string {
  let hash = 2166136261
  for (const char of uploadId)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return `image-processor-${(hash >>> 0) % 5}`
}

export interface ImageUploadBindings {
  IMAGE_PROCESSOR: {
    getByName: (name: string) => {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    }
  }
  MEDIA_PUBLIC_BASE_URL: string
}

export async function handleImageUpload(
  request: Request,
  env?: ImageUploadBindings,
): Promise<Response> {
  let uploadId: string | undefined
  try {
    authorizeImageUpload(request)
    if (!env?.IMAGE_PROCESSOR)
      throw new ImageProcessingError(
        'CONTAINER_START_FAILED',
        'Image processing is not configured for this deployment.',
      )
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
    validateMediaOrigin(env.MEDIA_PUBLIC_BASE_URL)
    if (request.method !== 'POST' || !request.body)
      throw new ImageProcessingError(
        'INVALID_INPUT',
        'An image body is required.',
      )
    const metadata = parseUploadMetadata(
      decodeImageMetadata(request.headers.get('x-image-metadata') ?? ''),
    )
    uploadId = metadata.uploadId
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
    if (metadata.filesize > IMAGE_PROCESSING_LIMITS.maxInputBytes)
      throw new ImageProcessingError(
        'UPLOAD_TOO_LARGE',
        'The maximum image upload size is 20 MiB.',
      )
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
    const internalMetadata = {
      ...metadata,
      objectKeys: createObjectKeyPlan(metadata.uploadId, metadata.mimeType),
    }
    const stub = env.IMAGE_PROCESSOR.getByName(processorSlot(metadata.uploadId))
    // Forward only the image contract; browser cookies and authorization stay at this boundary.
    return await stub.fetch('http://image-processor/process', {
      method: 'POST',
      headers: {
        'Content-Type': metadata.mimeType,
        'x-image-metadata': encodeImageMetadata(internalMetadata),
      },
      body: boundedImageStream(request.body, metadata.filesize),
      signal: request.signal,
    })
  } catch (error) {
    return imageErrorResponse(error, uploadId)
  }
}
