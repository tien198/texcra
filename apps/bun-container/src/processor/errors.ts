import { ImageProcessingError } from 'shared/image-processing'
import { APP_CONFIG } from '../config'

const BYTES_PER_MIB = 1024 * 1024

/** Trim trailing zeros: 20 -> "20", 2.5 -> "2.5", 1/3 -> "0.33". */
const formatNumber = (value: number) => String(Number(value.toFixed(2)))

export const formatMiB = (bytes: number) =>
  `${formatNumber(bytes / BYTES_PER_MIB)} MiB`

export const formatMegapixels = (pixels: number) =>
  `${formatNumber(pixels / 1_000_000)} megapixel`

export const formatSeconds = (ms: number) => `${formatNumber(ms / 1000)} seconds`

export const inputTooLargeError = (
  limit = APP_CONFIG.processor.maxInputBytes,
) =>
  new ImageProcessingError(
    'UPLOAD_TOO_LARGE',
    `Image exceeds the ${formatMiB(limit)} input limit`,
  )

export const pixelLimitError = (limit = APP_CONFIG.processor.maxInputPixels) =>
  new ImageProcessingError(
    'UPLOAD_TOO_LARGE',
    `Image exceeds the ${formatMegapixels(limit)} limit`,
  )

export const outputTooLargeError = () =>
  new ImageProcessingError(
    'UPLOAD_TOO_LARGE',
    'Encoded output exceeds the object size limit',
  )

/** Takes the deadline actually armed, so the message always matches the timer. */
export const processingTimeoutError = (timeoutMs: number) =>
  new ImageProcessingError(
    'PROCESSING_TIMEOUT',
    `Image processing exceeded ${formatSeconds(timeoutMs)}`,
  )

export const lengthMismatchError = () =>
  new ImageProcessingError(
    'INVALID_INPUT',
    'Upload length differs from metadata',
  )

export const mimeMismatchError = () =>
  new ImageProcessingError(
    'INVALID_INPUT',
    'Declared MIME type does not match image content',
  )

export const unsupportedFormatError = () =>
  new ImageProcessingError(
    'UNSUPPORTED_FORMAT',
    'Only JPEG, PNG, WebP and AVIF are supported',
  )

export const animatedImageError = () =>
  new ImageProcessingError(
    'UNSUPPORTED_FORMAT',
    'Animated and multipage images are not supported',
  )

/** Map any failure to the error surfaced to callers; aborts win over the original error. */
export function toProcessingError(
  error: unknown,
  signal: AbortSignal,
): unknown {
  if (signal.aborted) {
    return (
      signal.reason ??
      new DOMException('The operation was aborted.', 'AbortError')
    )
  }
  if (error instanceof ImageProcessingError) return error
  if (error instanceof Error && /pixel limit/i.test(error.message)) {
    return pixelLimitError()
  }
  return new ImageProcessingError(
    'INVALID_INPUT',
    'Image could not be decoded or processed',
  )
}
