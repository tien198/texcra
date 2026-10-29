import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import type { OutputInfo, Sharp } from 'sharp'
import type {
  CropData,
  FocalPoint,
  VariantConfig,
} from 'shared/image-processing'
import { APP_CONFIG } from '../config'
import {
  coverRectangle,
  croppedFocal,
  cropRectangle,
  rotatedFocal,
} from '../geometry'
import { outputTooLargeError } from './errors'
import { sharp } from './sharp-runtime'

export interface WorkingImage {
  path: string
  width: number
  height: number
  /** Focal point mapped into working-image coordinates. */
  focal: FocalPoint
}

/** Wait for native work to finish before deleting files or releasing admission. */
export async function encode(image: Sharp, path: string, signal: AbortSignal) {
  signal.throwIfAborted()
  const info = await image
    .timeout({
      seconds: APP_CONFIG.sharp.encodeTimeoutSeconds,
    })
    .toFile(path)
  signal.throwIfAborted()
  return info
}

/** Clockwise degrees normalized into [0, 360). */
export const normalizeRotation = (degrees = 0) => ((degrees % 360) + 360) % 360

/**
 * Separate file stages make EXIF -> crop -> rotation ordering unambiguous.
 * Tiled, uncompressed TIFF keeps lossless pixels on disk between operations.
 */
export async function prepareWorkingImage(options: {
  sourcePath: string
  directory: string
  /** Source dimensions after EXIF orientation. */
  size: { width: number; height: number }
  crop?: CropData
  focalPoint: FocalPoint
  signal: AbortSignal
}): Promise<WorkingImage> {
  const { sourcePath, directory, size, crop: cropData, signal } = options
  const crop = cropRectangle(size.width, size.height, cropData)
  const croppedSourceFocal = croppedFocal(
    size.width,
    size.height,
    crop,
    options.focalPoint,
  )

  const orientedPath = join(directory, 'oriented.tiff')
  await encode(
    sharp(sourcePath, APP_CONFIG.sharp.inputOptions)
      .autoOrient()
      .tiff(APP_CONFIG.sharp.tiffOptions),
    orientedPath,
    signal,
  )

  const rotation = normalizeRotation(cropData?.rotation)
  const workingPath = join(directory, 'working.tiff')
  const working = await encode(
    sharp(orientedPath, APP_CONFIG.sharp.internalOptions)
      .extract(crop)
      .rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .tiff(APP_CONFIG.sharp.tiffOptions),
    workingPath,
    signal,
  )
  await rm(orientedPath)

  return {
    path: workingPath,
    width: working.width,
    height: working.height,
    focal: rotatedFocal(
      croppedSourceFocal,
      crop.width,
      crop.height,
      working.width,
      working.height,
      rotation,
    ),
  }
}

/** Render one variant to `output`; enforces the per-object size limit. */
export async function renderVariant(
  working: WorkingImage,
  config: VariantConfig,
  output: string,
  signal: AbortSignal,
): Promise<OutputInfo> {
  let image = sharp(working.path, APP_CONFIG.sharp.internalOptions)
  if (config.fit === 'cover') {
    image = image.extract(
      coverRectangle(working.width, working.height, working.focal, config),
    )
  }
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
    signal,
  )
  if (info.size > APP_CONFIG.processor.maxOutputBytes) {
    throw outputTooLargeError()
  }
  return info
}
