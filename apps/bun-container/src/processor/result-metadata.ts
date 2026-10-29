import { basename } from 'node:path'
import type { OutputInfo } from 'sharp'
import type {
  ProcessedVariant,
  StoredImageMetadata,
  VariantId,
} from 'shared/image-processing'
import type { SourceInfo } from './inspect'

/** Metadata for the uploaded source bytes, using the verified (oriented) dimensions. */
export function toOriginalMetadata(
  r2Key: string,
  source: SourceInfo,
  filesize: number,
): StoredImageMetadata {
  return {
    r2Key,
    filename: basename(r2Key),
    mimeType: source.mimeType,
    filesize,
    width: source.width,
    height: source.height,
  }
}

/** Metadata for one encoded WebP variant, taken from the real encoder output. */
export function toVariantMetadata(
  id: VariantId,
  r2Key: string,
  info: OutputInfo,
): ProcessedVariant {
  return {
    id,
    format: 'webp',
    mimeType: 'image/webp',
    r2Key,
    filename: basename(r2Key),
    filesize: info.size,
    width: info.width,
    height: info.height,
  }
}
