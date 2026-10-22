import { createWriteStream } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import sharp from 'sharp'
import type { Metadata, Sharp } from 'sharp'
import {
  DEFAULT_VARIANTS,
  IMAGE_PROCESSING_LIMITS,
  ImageProcessingError,
  VARIANT_IDS,
  parseProcessImageMetadata,
} from 'shared/image-processing'
import type {
  IImageProcessor,
  IImageStorage,
  ImageMimeType,
  ProcessImageMetadata,
  ProcessImageResult,
  ProcessedVariants,
  StoredImageMetadata,
} from 'shared/image-processing'
import {
  coverRectangle,
  croppedFocal,
  cropRectangle,
  rotatedFocal,
} from './geometry'

/** Yield chunks from a Web ReadableStream to an AsyncIterable without collecting chunks. */
export async function* webStreamToAsyncIterable(
  stream: ReadableStream<Uint8Array>,
) {
  const reader = stream.getReader()
  let completed = false
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) {
        completed = true
        break
      }
      if (value.byteLength > 0) yield value
    }
  } finally {
    try {
      if (!completed) {
        await reader.cancel()
      }
    } catch {
      // Ignore cancellation failure during cleanup
    } finally {
      reader.releaseLock()
    }
  }
}

// Bound native parallelism and libvips cache independently of the HTTP busy guard.
sharp.concurrency(1)
sharp.cache({ memory: 32, files: 8, items: 32 })

const inputOptions = {
  failOn: 'warning' as const,
  limitInputPixels: IMAGE_PROCESSING_LIMITS.maxInputPixels,
  sequentialRead: true,
}
const internalOptions = {
  ...inputOptions,
  limitInputPixels: IMAGE_PROCESSING_LIMITS.maxInputPixels * 2,
}

function detectedMime(metadata: Metadata): ImageMimeType {
  if (metadata.format === 'jpeg') return 'image/jpeg'
  if (metadata.format === 'png') return 'image/png'
  if (metadata.format === 'webp') return 'image/webp'
  if (metadata.format === 'heif' && metadata.compression === 'av1')
    return 'image/avif'
  throw new ImageProcessingError(
    'UNSUPPORTED_FORMAT',
    'Only JPEG, PNG, WebP and AVIF are supported',
  )
}

/** No chunks are collected: backpressure extends from disk to the request stream. */
async function spool(
  body: ReadableStream<Uint8Array>,
  path: string,
  expected: number,
  signal: AbortSignal,
) {
  let bytes = 0
  const count = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.byteLength
      if (bytes > IMAGE_PROCESSING_LIMITS.maxInputBytes) {
        callback(
          new ImageProcessingError(
            'UPLOAD_TOO_LARGE',
            'Image exceeds the 20 MiB input limit',
          ),
        )
      } else if (bytes > expected) {
        callback(
          new ImageProcessingError(
            'INVALID_INPUT',
            'Upload length differs from metadata',
          ),
        )
      } else {
        callback(null, chunk)
      }
    },
  })
  await pipeline(
    Readable.from(webStreamToAsyncIterable(body)),
    count,
    createWriteStream(path, { flags: 'wx' }),
    { signal },
  )
  if (bytes !== expected)
    throw new ImageProcessingError(
      'INVALID_INPUT',
      'Upload length differs from metadata',
    )
  return bytes
}

/** Wait for native work to finish before deleting files or releasing admission. */
async function encode(image: Sharp, path: string, signal: AbortSignal) {
  signal.throwIfAborted()
  const info = await image
    .timeout({
      seconds: Math.ceil(IMAGE_PROCESSING_LIMITS.processingMs / 1000),
    })
    .toFile(path)
  signal.throwIfAborted()
  return info
}

export class SharpImageProcessor implements IImageProcessor {
  private busy = false

  constructor(
    private readonly storage: IImageStorage,
    private readonly temporaryRoot = tmpdir(),
  ) {}

  async processImage(
    imageStream: ReadableStream<Uint8Array>,
    input: ProcessImageMetadata,
    signal?: AbortSignal,
  ): Promise<ProcessImageResult> {
    if (this.busy)
      throw new ImageProcessingError(
        'PROCESSOR_BUSY',
        'Image processor is busy',
      )
    this.busy = true
    const controller = new AbortController()
    const onAbort = () => controller.abort(signal?.reason)
    signal?.addEventListener('abort', onAbort, { once: true })
    if (signal?.aborted) onAbort()
    const deadline = setTimeout(
      () =>
        controller.abort(
          new ImageProcessingError(
            'PROCESSING_TIMEOUT',
            'Image processing exceeded 120 seconds',
          ),
        ),
      IMAGE_PROCESSING_LIMITS.processingMs,
    )
    const jobSignal = controller.signal
    let directory: string | undefined
    try {
      jobSignal.throwIfAborted()
      const metadata = parseProcessImageMetadata(input)
      directory = await mkdtemp(join(this.temporaryRoot, 'texcra-image-'))
      const source = join(directory, 'source')
      const bytes = await spool(
        imageStream,
        source,
        metadata.filesize,
        jobSignal,
      )
      const imageMetadata = await sharp(source, inputOptions).metadata()
      jobSignal.throwIfAborted()
      const mimeType = detectedMime(imageMetadata)
      if (mimeType !== metadata.mimeType)
        throw new ImageProcessingError(
          'INVALID_INPUT',
          'Declared MIME type does not match image content',
        )
      if (
        (imageMetadata.pages ?? 1) !== 1 ||
        (imageMetadata.delay?.length ?? 0) > 1
      ) {
        throw new ImageProcessingError(
          'UNSUPPORTED_FORMAT',
          'Animated and multipage images are not supported',
        )
      }
      if (
        !imageMetadata.width ||
        !imageMetadata.height ||
        imageMetadata.width * imageMetadata.height >
          IMAGE_PROCESSING_LIMITS.maxInputPixels
      ) {
        throw new ImageProcessingError(
          'UPLOAD_TOO_LARGE',
          'Image exceeds the 40 megapixel limit',
        )
      }
      const swapped = (imageMetadata.orientation ?? 1) >= 5
      const width = swapped ? imageMetadata.height : imageMetadata.width
      const height = swapped ? imageMetadata.width : imageMetadata.height
      const sourceFocal = metadata.focalPoint ?? { x: 50, y: 50 }
      const crop = cropRectangle(width, height, metadata.crop)
      let focal = croppedFocal(width, height, crop, sourceFocal)
      // Separate file stages make EXIF -> crop -> rotation ordering unambiguous.
      // Tiled, uncompressed TIFF keeps lossless pixels on disk between operations.
      const orientedPath = join(directory, 'oriented.tiff')
      await encode(
        sharp(source, inputOptions)
          .autoOrient()
          .tiff({ compression: 'none', tile: true }),
        orientedPath,
        jobSignal,
      )
      const rotation = (((metadata.crop?.rotation ?? 0) % 360) + 360) % 360
      const workingPath = join(directory, 'working.tiff')
      const working = await encode(
        sharp(orientedPath, internalOptions)
          .extract(crop)
          .rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .tiff({ compression: 'none', tile: true }),
        workingPath,
        jobSignal,
      )
      focal = rotatedFocal(
        focal,
        crop.width,
        crop.height,
        working.width,
        working.height,
        rotation,
      )
      await rm(orientedPath)
      const original: StoredImageMetadata = {
        r2Key: metadata.objectKeys.original,
        filename: basename(metadata.objectKeys.original),
        mimeType,
        filesize: bytes,
        width,
        height,
      }
      // Upload the exact source bytes, preserving its EXIF and original encoding.
      await this.uploadFile(source, original, jobSignal)
      const variants = {} as ProcessedVariants
      for (const id of VARIANT_IDS) {
        jobSignal.throwIfAborted()
        const config = DEFAULT_VARIANTS[id]
        let image = sharp(workingPath, internalOptions)
        if (config.fit === 'cover')
          image = image.extract(
            coverRectangle(working.width, working.height, focal, config),
          )
        const output = join(directory, `${id}.webp`)
        const info = await encode(
          image
            .resize({
              width: config.width,
              height: config.height,
              fit: 'inside',
              withoutEnlargement: true,
            })
            .webp({ quality: config.quality }),
          output,
          jobSignal,
        )
        if (info.size > IMAGE_PROCESSING_LIMITS.maxOutputBytes)
          throw new ImageProcessingError(
            'UPLOAD_TOO_LARGE',
            'Encoded output exceeds the object size limit',
          )
        const variant = {
          id,
          format: 'webp' as const,
          mimeType: 'image/webp' as const,
          r2Key: metadata.objectKeys.variants[id],
          filename: basename(metadata.objectKeys.variants[id]),
          filesize: info.size,
          width: info.width,
          height: info.height,
        }
        // The canonical ID loop creates all seven constrained entries exactly once.
        Object.assign(variants, { [id]: variant })
        await this.uploadFile(output, variant, jobSignal)
        await rm(output)
      }
      return {
        uploadId: metadata.uploadId,
        original,
        focalX: sourceFocal.x,
        focalY: sourceFocal.y,
        variants,
      }
    } catch (error) {
      if (jobSignal.aborted) {
        throw (
          jobSignal.reason ??
          new DOMException('The operation was aborted.', 'AbortError')
        )
      }
      if (error instanceof ImageProcessingError) throw error
      if (error instanceof Error && /pixel limit/i.test(error.message))
        throw new ImageProcessingError(
          'UPLOAD_TOO_LARGE',
          'Image exceeds the 40 megapixel limit',
        )
      throw new ImageProcessingError(
        'INVALID_INPUT',
        'Image could not be decoded or processed',
      )
    } finally {
      clearTimeout(deadline)
      signal?.removeEventListener('abort', onAbort)
      try {
        if (directory) await rm(directory, { recursive: true, force: true })
      } finally {
        this.busy = false
      }
    }
  }

  private async uploadFile(
    path: string,
    metadata: StoredImageMetadata,
    signal: AbortSignal,
  ) {
    signal.throwIfAborted()
    const body = Bun.file(path).stream()
    await this.storage.putObject(
      {
        r2Key: metadata.r2Key,
        body,
        contentType: metadata.mimeType,
        contentLength: metadata.filesize,
      },
      signal,
    )
    signal.throwIfAborted()
  }
}
