import { IMAGE_PROCESSING_LIMITS } from './constants'
import { ImageProcessingError } from './errors'

function checkHeaderSize(value: string): void {
  if (
    value.length > IMAGE_PROCESSING_LIMITS.maxMetadataBytes ||
    new TextEncoder().encode(value).byteLength >
      IMAGE_PROCESSING_LIMITS.maxMetadataBytes
  ) {
    throw new ImageProcessingError(
      'INVALID_INPUT',
      'The x-image-metadata header must not exceed 4096 encoded bytes.',
    )
  }
}

/** Encode JSON as a UTF-8-safe HTTP header value; shape validation is separate. */
export function encodeImageMetadata(value: unknown): string {
  let encoded: string
  try {
    const json = JSON.stringify(value)
    if (typeof json !== 'string') {
      throw new Error('Metadata is not JSON serializable.')
    }
    encoded = encodeURIComponent(json)
  } catch {
    throw new ImageProcessingError(
      'INVALID_INPUT',
      'Image metadata must be JSON serializable.',
    )
  }
  checkHeaderSize(encoded)
  return encoded
}

/** Decode the header, then use the appropriate parser to validate its shape. */
export function decodeImageMetadata(value: string | null | undefined): unknown {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ImageProcessingError(
      'INVALID_INPUT',
      'The x-image-metadata header is required.',
    )
  }
  checkHeaderSize(value)
  try {
    return JSON.parse(decodeURIComponent(value)) as unknown
  } catch {
    throw new ImageProcessingError(
      'INVALID_INPUT',
      'The x-image-metadata header must contain valid encoded JSON.',
    )
  }
}
