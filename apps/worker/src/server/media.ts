import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { media } from 'shared'
import { parseUploadImageResponse } from 'shared/image-processing'
import type {
  ProcessImageResult,
  StoredImageMetadata,
  UploadImageResponse,
  VariantId,
} from 'shared/image-processing'

type MediaRow = typeof media.$inferSelect

function hasControlOrBackslash(part: string): boolean {
  if (part.includes('\\')) return true
  for (let i = 0; i < part.length; i++) {
    const code = part.charCodeAt(i)
    if (code <= 31 || code === 127) return true
  }
  return false
}

function publicUrl(key: string, publicBase: string): string {
  const base = new URL(publicBase)
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new Error('Invalid media public base URL')
  }
  const parts = key.split('/')
  if (parts.some((part) => !part || part === '.' || part === '..' || hasControlOrBackslash(part))) {
    throw new Error('Invalid media object key')
  }
  return `${base.href.replace(/\/$/, '')}/${parts.map(encodeURIComponent).join('/')}`
}

function publicImage(image: StoredImageMetadata, publicBase: string) {
  return {
    filename: image.filename,
    mimeType: image.mimeType,
    filesize: image.filesize,
    width: image.width,
    height: image.height,
    url: publicUrl(image.r2Key, publicBase),
  }
}

export function resultToUploadResponse(
  result: ProcessImageResult,
  mediaId: number,
  publicBase: string,
): UploadImageResponse {
  const variant = (id: VariantId) => ({
    ...publicImage(result.variants[id], publicBase),
    id: result.variants[id].id,
    format: result.variants[id].format,
  })
  if (Object.keys(result.variants).length !== 7) throw new Error('Expected seven image variants')
  return parseUploadImageResponse({
    ...publicImage(result.original, publicBase),
    mediaId,
    uploadId: result.uploadId,
    thumbnailURL: publicUrl(result.variants.thumbnail.r2Key, publicBase),
    focalX: result.focalX,
    focalY: result.focalY,
    variants: {
      thumbnail: variant('thumbnail'), square: variant('square'), small: variant('small'),
      medium: variant('medium'), large: variant('large'), xlarge: variant('xlarge'), og: variant('og'),
    },
  })
}

export function toMediaValues(result: ProcessImageResult, publicBase: string) {
  // Validate the complete response before writing; the actual ID comes from D1.
  const response = resultToUploadResponse(result, 1, publicBase)
  const { thumbnail, square, small, medium, large, xlarge, og } = response.variants
  // The existing numeric() columns use Drizzle's string representation.
  return {
    url: response.url,
    thumbnailURL: response.thumbnailURL,
    filename: response.filename,
    mimeType: response.mimeType,
    filesize: String(response.filesize),
    width: String(response.width),
    height: String(response.height),
    focalX: String(response.focalX),
    focalY: String(response.focalY),
    sizesThumbnailUrl: thumbnail.url,
    sizesThumbnailWidth: String(thumbnail.width),
    sizesThumbnailHeight: String(thumbnail.height),
    sizesThumbnailMimeType: thumbnail.mimeType,
    sizesThumbnailFilesize: String(thumbnail.filesize),
    sizesThumbnailFilename: thumbnail.filename,
    sizesSquareUrl: square.url,
    sizesSquareWidth: String(square.width),
    sizesSquareHeight: String(square.height),
    sizesSquareMimeType: square.mimeType,
    sizesSquareFilesize: String(square.filesize),
    sizesSquareFilename: square.filename,
    sizesSmallUrl: small.url,
    sizesSmallWidth: String(small.width),
    sizesSmallHeight: String(small.height),
    sizesSmallMimeType: small.mimeType,
    sizesSmallFilesize: String(small.filesize),
    sizesSmallFilename: small.filename,
    sizesMediumUrl: medium.url,
    sizesMediumWidth: String(medium.width),
    sizesMediumHeight: String(medium.height),
    sizesMediumMimeType: medium.mimeType,
    sizesMediumFilesize: String(medium.filesize),
    sizesMediumFilename: medium.filename,
    sizesLargeUrl: large.url,
    sizesLargeWidth: String(large.width),
    sizesLargeHeight: String(large.height),
    sizesLargeMimeType: large.mimeType,
    sizesLargeFilesize: String(large.filesize),
    sizesLargeFilename: large.filename,
    sizesXlargeUrl: xlarge.url,
    sizesXlargeWidth: String(xlarge.width),
    sizesXlargeHeight: String(xlarge.height),
    sizesXlargeMimeType: xlarge.mimeType,
    sizesXlargeFilesize: String(xlarge.filesize),
    sizesXlargeFilename: xlarge.filename,
    sizesOgUrl: og.url,
    sizesOgWidth: String(og.width),
    sizesOgHeight: String(og.height),
    sizesOgMimeType: og.mimeType,
    sizesOgFilesize: String(og.filesize),
    sizesOgFilename: og.filename,
  } satisfies typeof media.$inferInsert
}

function requiredNumber(value: string | number | null): number {
  if (value === null || value === '') throw new Error('Incomplete media metadata')
  const result = Number(value)
  if (!Number.isFinite(result)) throw new Error('Invalid media number')
  return result
}

/** Recover the committed public response without inferring object keys from filenames. */
export function mediaToUploadResponse(row: MediaRow, uploadId: string, publicBase: string): UploadImageResponse {
  const base = new URL(publicBase)
  function url(value: string | null): string {
    if (!value) throw new Error('Incomplete media URL')
    const parsed = new URL(value)
    if (parsed.origin !== base.origin || !parsed.pathname.startsWith(`${base.pathname.replace(/\/$/, '')}/`)) {
      throw new Error('Media URL does not belong to the configured public base')
    }
    return value
  }
  function variant(id: VariantId, value: string | null, filename: string | null, mimeType: string | null, width: string | null, height: string | null, filesize: string | null) {
    return { id, format: 'webp', url: url(value), filename, mimeType, width: requiredNumber(width), height: requiredNumber(height), filesize: requiredNumber(filesize) }
  }
  return parseUploadImageResponse({
    mediaId: row.id, uploadId, url: url(row.url), thumbnailURL: url(row.thumbnailURL),
    filename: row.filename, mimeType: row.mimeType, filesize: requiredNumber(row.filesize),
    width: requiredNumber(row.width), height: requiredNumber(row.height),
    focalX: requiredNumber(row.focalX), focalY: requiredNumber(row.focalY),
    variants: {
      thumbnail: variant('thumbnail', row.sizesThumbnailUrl, row.sizesThumbnailFilename, row.sizesThumbnailMimeType, row.sizesThumbnailWidth, row.sizesThumbnailHeight, row.sizesThumbnailFilesize),
      square: variant('square', row.sizesSquareUrl, row.sizesSquareFilename, row.sizesSquareMimeType, row.sizesSquareWidth, row.sizesSquareHeight, row.sizesSquareFilesize),
      small: variant('small', row.sizesSmallUrl, row.sizesSmallFilename, row.sizesSmallMimeType, row.sizesSmallWidth, row.sizesSmallHeight, row.sizesSmallFilesize),
      medium: variant('medium', row.sizesMediumUrl, row.sizesMediumFilename, row.sizesMediumMimeType, row.sizesMediumWidth, row.sizesMediumHeight, row.sizesMediumFilesize),
      large: variant('large', row.sizesLargeUrl, row.sizesLargeFilename, row.sizesLargeMimeType, row.sizesLargeWidth, row.sizesLargeHeight, row.sizesLargeFilesize),
      xlarge: variant('xlarge', row.sizesXlargeUrl, row.sizesXlargeFilename, row.sizesXlargeMimeType, row.sizesXlargeWidth, row.sizesXlargeHeight, row.sizesXlargeFilesize),
      og: variant('og', row.sizesOgUrl, row.sizesOgFilename, row.sizesOgMimeType, row.sizesOgWidth, row.sizesOgHeight, row.sizesOgFilesize),
    },
  })
}

export async function findMediaByOriginalFilename(
  binding: D1Database, filename: string, uploadId: string, publicBase: string,
): Promise<UploadImageResponse | null> {
  const row = await drizzle(binding).select().from(media).where(eq(media.filename, filename)).get()
  return row ? mediaToUploadResponse(row, uploadId, publicBase) : null
}

export async function persistMedia(
  binding: D1Database, result: ProcessImageResult, publicBase: string,
): Promise<UploadImageResponse> {
  const values = toMediaValues(result, publicBase)
  // Never replace a committed row: a retry recovers by the unique original filename.
  const inserted = (await drizzle(binding).insert(media).values(values)
    .onConflictDoNothing({ target: media.filename }).returning({ id: media.id }).get()) as { id: number } | undefined
  if (inserted) return resultToUploadResponse(result, inserted.id, publicBase)
  const existing = await findMediaByOriginalFilename(binding, result.original.filename, result.uploadId, publicBase)
  if (!existing) throw new Error('Media commit could not be recovered')
  return existing
}
