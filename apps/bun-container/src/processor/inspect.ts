import type { Metadata } from 'sharp'
import type { ImageMimeType } from 'shared/image-processing'
import { APP_CONFIG } from '../config'
import {
  animatedImageError,
  mimeMismatchError,
  pixelLimitError,
  unsupportedFormatError,
} from './errors'
import { sharp } from './sharp-runtime'

export interface SourceInfo {
  mimeType: ImageMimeType
  /** Dimensions after EXIF orientation is applied. */
  width: number
  height: number
}

/** Verify the spooled file really is the declared, single-frame, in-limit image. */
export async function inspectSource(
  path: string,
  declaredMime: ImageMimeType,
  signal: AbortSignal,
): Promise<SourceInfo> {
  const metadata = await sharp(path, APP_CONFIG.sharp.inputOptions).metadata()
  signal.throwIfAborted()
  const mimeType = detectMime(metadata)
  if (mimeType !== declaredMime) throw mimeMismatchError()
  assertSingleFrame(metadata)
  const { width, height } = assertWithinPixelLimit(metadata)
  return { mimeType, ...orientedSize(width, height, metadata.orientation) }
}

export function detectMime(metadata: Metadata): ImageMimeType {
  if (metadata.format === 'jpeg') return 'image/jpeg'
  if (metadata.format === 'png') return 'image/png'
  if (metadata.format === 'webp') return 'image/webp'
  if (metadata.format === 'heif' && metadata.compression === 'av1')
    return 'image/avif'
  throw unsupportedFormatError()
}

function assertSingleFrame(metadata: Metadata): void {
  if ((metadata.pages ?? 1) !== 1 || (metadata.delay?.length ?? 0) > 1) {
    throw animatedImageError()
  }
}

export function assertWithinPixelLimit(
  metadata: Metadata,
  maxPixels = APP_CONFIG.processor.maxInputPixels,
): { width: number; height: number } {
  const { width, height } = metadata
  if (!width || !height || width * height > maxPixels) {
    throw pixelLimitError(maxPixels)
  }
  return { width, height }
}

/** EXIF orientations 5-8 transpose the image, swapping its axes. */
export function orientedSize(width: number, height: number, orientation = 1) {
  return orientation >= 5
    ? { width: height, height: width }
    : { width, height }
}
