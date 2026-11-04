import type { media } from 'shared'
import { parseUploadImageResponse } from 'shared/image-processing'
import type {
  ProcessImageResult,
  UploadImageResponse,
  VariantId,
} from 'shared/image-processing'
import { MediaUrlResolver } from './media-url.resolver'

export type MediaRow = typeof media.$inferSelect
export type MediaInsert = typeof media.$inferInsert

export class MediaRecordMapper {
  private static readonly instances = new Map<string, MediaRecordMapper>()

  private readonly urlResolver: MediaUrlResolver

  public constructor(urlResolver: MediaUrlResolver | string) {
    this.urlResolver =
      typeof urlResolver === 'string'
        ? MediaUrlResolver.getInstance(urlResolver)
        : urlResolver
  }

  public static getInstance(publicBase: string): MediaRecordMapper {
    let instance = MediaRecordMapper.instances.get(publicBase)
    if (!instance) {
      instance = new MediaRecordMapper(MediaUrlResolver.getInstance(publicBase))
      MediaRecordMapper.instances.set(publicBase, instance)
    }
    return instance
  }

  public toUploadResponse(
    result: ProcessImageResult,
    mediaId: number,
  ): UploadImageResponse {
    if (Object.keys(result.variants).length !== 7) {
      throw new Error('Expected seven image variants')
    }
    return parseUploadImageResponse({
      ...this.urlResolver.toPublicImage(result.original),
      mediaId,
      uploadId: result.uploadId,
      thumbnailURL: this.urlResolver.resolveObjectUrl(
        result.variants.thumbnail.r2Key,
      ),
      focalX: result.focalX,
      focalY: result.focalY,
      variants: {
        thumbnail: this.mapResultVariant(result, 'thumbnail'),
        square: this.mapResultVariant(result, 'square'),
        small: this.mapResultVariant(result, 'small'),
        medium: this.mapResultVariant(result, 'medium'),
        large: this.mapResultVariant(result, 'large'),
        xlarge: this.mapResultVariant(result, 'xlarge'),
        og: this.mapResultVariant(result, 'og'),
      },
    })
  }

  public toInsertValues(result: ProcessImageResult): MediaInsert {
    // Validate the complete response before writing; the actual ID comes from D1.
    const response = this.toUploadResponse(result, 1)
    const { thumbnail, square, small, medium, large, xlarge, og } =
      response.variants

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
    } satisfies MediaInsert
  }

  /** Recover the committed public response without inferring object keys from filenames. */
  public fromRowToUploadResponse(
    row: MediaRow,
    uploadId: string,
  ): UploadImageResponse {
    return parseUploadImageResponse({
      mediaId: row.id,
      uploadId,
      url: this.urlResolver.assertOwnedUrl(row.url),
      thumbnailURL: this.urlResolver.assertOwnedUrl(row.thumbnailURL),
      filename: row.filename,
      mimeType: row.mimeType,
      filesize: this.requireNumber(row.filesize),
      width: this.requireNumber(row.width),
      height: this.requireNumber(row.height),
      focalX: this.requireNumber(row.focalX),
      focalY: this.requireNumber(row.focalY),
      variants: {
        thumbnail: this.mapRowVariant(
          'thumbnail',
          row.sizesThumbnailUrl,
          row.sizesThumbnailFilename,
          row.sizesThumbnailMimeType,
          row.sizesThumbnailWidth,
          row.sizesThumbnailHeight,
          row.sizesThumbnailFilesize,
        ),
        square: this.mapRowVariant(
          'square',
          row.sizesSquareUrl,
          row.sizesSquareFilename,
          row.sizesSquareMimeType,
          row.sizesSquareWidth,
          row.sizesSquareHeight,
          row.sizesSquareFilesize,
        ),
        small: this.mapRowVariant(
          'small',
          row.sizesSmallUrl,
          row.sizesSmallFilename,
          row.sizesSmallMimeType,
          row.sizesSmallWidth,
          row.sizesSmallHeight,
          row.sizesSmallFilesize,
        ),
        medium: this.mapRowVariant(
          'medium',
          row.sizesMediumUrl,
          row.sizesMediumFilename,
          row.sizesMediumMimeType,
          row.sizesMediumWidth,
          row.sizesMediumHeight,
          row.sizesMediumFilesize,
        ),
        large: this.mapRowVariant(
          'large',
          row.sizesLargeUrl,
          row.sizesLargeFilename,
          row.sizesLargeMimeType,
          row.sizesLargeWidth,
          row.sizesLargeHeight,
          row.sizesLargeFilesize,
        ),
        xlarge: this.mapRowVariant(
          'xlarge',
          row.sizesXlargeUrl,
          row.sizesXlargeFilename,
          row.sizesXlargeMimeType,
          row.sizesXlargeWidth,
          row.sizesXlargeHeight,
          row.sizesXlargeFilesize,
        ),
        og: this.mapRowVariant(
          'og',
          row.sizesOgUrl,
          row.sizesOgFilename,
          row.sizesOgMimeType,
          row.sizesOgWidth,
          row.sizesOgHeight,
          row.sizesOgFilesize,
        ),
      },
    })
  }

  private mapResultVariant(result: ProcessImageResult, id: VariantId) {
    const source = result.variants[id]
    return {
      ...this.urlResolver.toPublicImage(source),
      id: source.id,
      format: source.format,
    }
  }

  private mapRowVariant(
    id: VariantId,
    url: string | null,
    filename: string | null,
    mimeType: string | null,
    width: string | null,
    height: string | null,
    filesize: string | null,
  ) {
    return {
      id,
      format: 'webp' as const,
      url: this.urlResolver.assertOwnedUrl(url),
      filename,
      mimeType,
      width: this.requireNumber(width),
      height: this.requireNumber(height),
      filesize: this.requireNumber(filesize),
    }
  }

  private requireNumber(value: string | number | null): number {
    if (value === null || value === '') {
      throw new Error('Incomplete media metadata')
    }
    const result = Number(value)
    if (!Number.isFinite(result)) {
      throw new Error('Invalid media number')
    }
    return result
  }
}
