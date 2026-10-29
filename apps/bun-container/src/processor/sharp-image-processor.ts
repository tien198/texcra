import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import {
  DEFAULT_VARIANTS,
  ImageProcessingError,
  VARIANT_IDS,
  parseProcessImageMetadata,
} from 'shared/image-processing'
import type {
  IImageProcessor,
  IImageStorage,
  ProcessImageMetadata,
  ProcessImageResult,
  ProcessedVariants,
  StoredImageMetadata,
  VariantId,
} from 'shared/image-processing'
import { APP_CONFIG } from '../config'
import { storage as defaultStorage } from '../storage'
import { toProcessingError } from './errors'
import { inspectSource } from './inspect'
import { createJobSignal } from './job-signal'
import { toOriginalMetadata, toVariantMetadata } from './result-metadata'
import { spoolToFile } from './spool'
import { prepareWorkingImage, renderVariant } from './transform'
import type { WorkingImage } from './transform'

export class SharpImageProcessor implements IImageProcessor {
  private busy = false

  constructor(
    private readonly storage: IImageStorage = defaultStorage,
    private readonly temporaryRoot = APP_CONFIG.processor.temporaryRoot,
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
    const job = createJobSignal(signal, APP_CONFIG.processor.processingMs)
    let directory: string | undefined
    try {
      job.signal.throwIfAborted()
      const metadata = parseProcessImageMetadata(input)
      directory = await mkdtemp(
        join(this.temporaryRoot, APP_CONFIG.processor.temporaryPrefix),
      )
      // Awaited so rejections reach the catch below for error normalization.
      return await this.run(imageStream, metadata, directory, job.signal)
    } catch (error) {
      throw toProcessingError(error, job.signal)
    } finally {
      job.dispose()
      try {
        if (directory) await rm(directory, { recursive: true, force: true })
      } finally {
        this.busy = false
      }
    }
  }

  private async run(
    stream: ReadableStream<Uint8Array>,
    metadata: ProcessImageMetadata,
    directory: string,
    signal: AbortSignal,
  ): Promise<ProcessImageResult> {
    const sourcePath = join(directory, 'source')
    const bytes = await spoolToFile(
      stream,
      sourcePath,
      metadata.filesize,
      signal,
    )
    const source = await inspectSource(sourcePath, metadata.mimeType, signal)
    const focalPoint =
      metadata.focalPoint ?? APP_CONFIG.processor.defaultFocalPoint
    const working = await prepareWorkingImage({
      sourcePath,
      directory,
      size: source,
      crop: metadata.crop,
      focalPoint,
      signal,
    })
    const original = toOriginalMetadata(
      metadata.objectKeys.original,
      source,
      bytes,
    )
    // Upload the exact source bytes, preserving its EXIF and original encoding.
    await this.uploadFile(sourcePath, original, signal)
    const variants = await this.renderVariants(
      working,
      metadata.objectKeys.variants,
      directory,
      signal,
    )
    return {
      uploadId: metadata.uploadId,
      original,
      focalX: focalPoint.x,
      focalY: focalPoint.y,
      variants,
    }
  }

  private async renderVariants(
    working: WorkingImage,
    keys: Record<VariantId, string>,
    directory: string,
    signal: AbortSignal,
  ): Promise<ProcessedVariants> {
    const variants = {} as ProcessedVariants
    for (const id of VARIANT_IDS) {
      signal.throwIfAborted()
      const output = join(directory, `${id}.webp`)
      const info = await renderVariant(
        working,
        DEFAULT_VARIANTS[id],
        output,
        signal,
      )
      const variant = toVariantMetadata(id, keys[id], info)
      // The canonical ID loop creates all seven constrained entries exactly once.
      Object.assign(variants, { [id]: variant })
      await this.uploadFile(output, variant, signal)
      await rm(output)
    }
    return variants
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

