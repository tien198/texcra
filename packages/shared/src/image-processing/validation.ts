import { IMAGE_PROCESSING_LIMITS } from './constants'
import { createObjectKeyPlan } from './object-keys'
import {
  containsControlCharacters,
  exactObject,
  hasField,
  invalid,
  readByteCount,
  readDimensions,
  readFilename,
  readFinite,
  readMimeType,
  readPositiveInteger,
  readUuid,
  requireEqual,
} from './primitives'
import type {
  CropData,
  FocalPoint,
  ObjectKeyPlan,
  ProcessedVariant,
  ProcessedVariants,
  ProcessImageMetadata,
  ProcessImageResult,
  PublicImageMetadata,
  PublicVariants,
  StoredImageMetadata,
  UploadErrorCode,
  UploadErrorResponse,
  UploadImageResponse,
  UploadMetadata,
  VariantId,
} from './types'
import { DEFAULT_VARIANTS, VARIANT_IDS } from './variants'

const UPLOAD_FIELDS = ['uploadId', 'filename', 'mimeType', 'filesize'] as const
const UPLOAD_OPTIONS = ['crop', 'focalPoint'] as const
const IMAGE_FIELDS = [
  'filename',
  'mimeType',
  'filesize',
  'width',
  'height',
] as const
const VARIANT_FIELDS = ['id', 'format'] as const

function parseCrop(input: unknown): CropData {
  const crop = exactObject(
    input,
    ['x', 'y', 'width', 'height', 'unit'],
    ['rotation'],
    'crop',
  )
  if (crop.unit !== 'px' && crop.unit !== '%') {
    return invalid('crop.unit must be px or %.')
  }
  const maximum = crop.unit === '%' ? 100 : Infinity
  const x = readFinite(crop.x, 'crop.x', 0, maximum)
  const y = readFinite(crop.y, 'crop.y', 0, maximum)
  const width = readFinite(crop.width, 'crop.width', 0, maximum)
  const height = readFinite(crop.height, 'crop.height', 0, maximum)
  if (width === 0 || height === 0) {
    return invalid('Crop width and height must be positive.')
  }
  if (crop.unit === '%' && (x + width > 100 || y + height > 100)) {
    return invalid('The percentage crop must fit within the source image.')
  }
  const result: CropData = { x, y, width, height, unit: crop.unit }
  if (hasField(crop, 'rotation')) {
    result.rotation = readFinite(crop.rotation, 'crop.rotation')
  }
  return result
}

function parseFocalPoint(input: unknown): FocalPoint {
  const point = exactObject(input, ['x', 'y'], [], 'focalPoint')
  return {
    x: readFinite(point.x, 'focalPoint.x', 0, 100),
    y: readFinite(point.y, 'focalPoint.y', 0, 100),
  }
}

function readUploadFields(object: Record<string, unknown>): UploadMetadata {
  const result: UploadMetadata = {
    uploadId: readUuid(object.uploadId, 'uploadId'),
    filename: readFilename(object.filename, 'filename'),
    mimeType: readMimeType(object.mimeType, 'mimeType'),
    filesize: readByteCount(
      object.filesize,
      'filesize',
      IMAGE_PROCESSING_LIMITS.maxInputBytes,
    ),
  }
  if (hasField(object, 'crop')) {
    result.crop = parseCrop(object.crop)
  }
  if (hasField(object, 'focalPoint')) {
    result.focalPoint = parseFocalPoint(object.focalPoint)
  }
  return result
}

export function parseUploadMetadata(input: unknown): UploadMetadata {
  return readUploadFields(exactObject(input, UPLOAD_FIELDS, UPLOAD_OPTIONS))
}

function parseObjectKeys(
  input: unknown,
  expected: ObjectKeyPlan,
): ObjectKeyPlan {
  const keys = exactObject(input, ['original', 'variants'], [], 'objectKeys')
  const variants = exactObject(
    keys.variants,
    VARIANT_IDS,
    [],
    'objectKeys.variants',
  )
  requireEqual(keys.original, expected.original, 'objectKeys.original')
  for (const id of VARIANT_IDS) {
    requireEqual(
      variants[id],
      expected.variants[id],
      `objectKeys.variants.${id}`,
    )
  }
  return expected
}

export function parseProcessImageMetadata(
  input: unknown,
): ProcessImageMetadata {
  const object = exactObject(
    input,
    [...UPLOAD_FIELDS, 'objectKeys'],
    UPLOAD_OPTIONS,
  )
  const metadata = readUploadFields(object)
  return {
    ...metadata,
    objectKeys: parseObjectKeys(
      object.objectKeys,
      createObjectKeyPlan(metadata.uploadId, metadata.mimeType),
    ),
  }
}

function readImageFields(
  object: Record<string, unknown>,
  maximumBytes: number,
  label: string,
): Omit<StoredImageMetadata, 'r2Key'> {
  return {
    filename: readFilename(object.filename, `${label}.filename`),
    mimeType: readMimeType(object.mimeType, `${label}.mimeType`),
    filesize: readByteCount(object.filesize, `${label}.filesize`, maximumBytes),
    ...readDimensions(object.width, object.height, label),
  }
}

function keyFilename(key: string): string {
  return key.slice(key.lastIndexOf('/') + 1)
}

function parseOriginal(
  input: unknown,
  expected: ProcessImageMetadata,
): StoredImageMetadata {
  const object = exactObject(input, ['r2Key', ...IMAGE_FIELDS], [], 'original')
  const original = readImageFields(
    object,
    IMAGE_PROCESSING_LIMITS.maxInputBytes,
    'original',
  )
  requireEqual(object.r2Key, expected.objectKeys.original, 'original.r2Key')
  requireEqual(
    original.filename,
    keyFilename(expected.objectKeys.original),
    'original.filename',
  )
  requireEqual(original.mimeType, expected.mimeType, 'original.mimeType')
  requireEqual(original.filesize, expected.filesize, 'original.filesize')
  return { r2Key: expected.objectKeys.original, ...original }
}

function readVariantFields<TVariant extends VariantId>(
  object: Record<string, unknown>,
  id: TVariant,
  key: string,
): Omit<ProcessedVariant<TVariant>, 'r2Key'> {
  const label = `variants.${id}`
  const image = readImageFields(
    object,
    IMAGE_PROCESSING_LIMITS.maxOutputBytes,
    label,
  )
  requireEqual(object.id, id, `${label}.id`)
  requireEqual(object.format, 'webp', `${label}.format`)
  requireEqual(image.mimeType, 'image/webp', `${label}.mimeType`)
  requireEqual(image.filename, keyFilename(key), `${label}.filename`)
  if (
    image.width > DEFAULT_VARIANTS[id].width ||
    image.height > DEFAULT_VARIANTS[id].height
  ) {
    return invalid(`${label} exceeds the configured dimensions.`)
  }
  return { ...image, id, format: 'webp', mimeType: 'image/webp' }
}

function parseStoredVariant<TVariant extends VariantId>(
  input: unknown,
  id: TVariant,
  key: string,
): ProcessedVariant<TVariant> {
  const object = exactObject(
    input,
    ['r2Key', ...IMAGE_FIELDS, ...VARIANT_FIELDS],
    [],
    `variants.${id}`,
  )
  requireEqual(object.r2Key, key, `variants.${id}.r2Key`)
  return { r2Key: key, ...readVariantFields(object, id, key) }
}

function parseStoredVariants(
  input: unknown,
  keys: ObjectKeyPlan['variants'],
): ProcessedVariants {
  const variants = exactObject(input, VARIANT_IDS, [], 'variants')
  return {
    thumbnail: parseStoredVariant(
      variants.thumbnail,
      'thumbnail',
      keys.thumbnail,
    ),
    square: parseStoredVariant(variants.square, 'square', keys.square),
    small: parseStoredVariant(variants.small, 'small', keys.small),
    medium: parseStoredVariant(variants.medium, 'medium', keys.medium),
    large: parseStoredVariant(variants.large, 'large', keys.large),
    xlarge: parseStoredVariant(variants.xlarge, 'xlarge', keys.xlarge),
    og: parseStoredVariant(variants.og, 'og', keys.og),
  }
}

export function parseProcessImageResult(
  input: unknown,
  expected: ProcessImageMetadata,
): ProcessImageResult {
  const metadata = parseProcessImageMetadata(expected)
  const object = exactObject(
    input,
    ['uploadId', 'original', 'focalX', 'focalY', 'variants'],
    [],
    'result',
  )
  const uploadId = readUuid(object.uploadId, 'uploadId')
  const focalX = readFinite(object.focalX, 'focalX', 0, 100)
  const focalY = readFinite(object.focalY, 'focalY', 0, 100)
  requireEqual(uploadId, metadata.uploadId, 'uploadId')
  requireEqual(focalX, metadata.focalPoint?.x ?? 50, 'focalX')
  requireEqual(focalY, metadata.focalPoint?.y ?? 50, 'focalY')
  return {
    uploadId,
    original: parseOriginal(object.original, metadata),
    focalX,
    focalY,
    variants: parseStoredVariants(
      object.variants,
      metadata.objectKeys.variants,
    ),
  }
}

function readPublicUrl(input: unknown, key: string, label: string): string {
  if (
    typeof input !== 'string' ||
    input.length === 0 ||
    input.length > 4096 ||
    input.trim() !== input ||
    containsControlCharacters(input, true)
  ) {
    return invalid(`${label} must be an absolute public image URL.`)
  }
  let url: URL
  try {
    url = new URL(input)
  } catch {
    return invalid(`${label} must be an absolute public image URL.`)
  }
  if (
    (url.protocol !== 'https:' && url.protocol !== 'http:') ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.pathname.endsWith(`/${key}`) ||
    url.href !== input
  ) {
    return invalid(`${label} must reference the expected public image key.`)
  }
  return input
}

function parsePublicVariant<TVariant extends VariantId>(
  input: unknown,
  id: TVariant,
  key: string,
  base: string,
): Omit<ProcessedVariant<TVariant>, 'r2Key'> & { url: string } {
  const object = exactObject(
    input,
    ['url', ...IMAGE_FIELDS, ...VARIANT_FIELDS],
    [],
    `variants.${id}`,
  )
  const url = readPublicUrl(object.url, key, `variants.${id}.url`)
  requireEqual(url, `${base}${key}`, `variants.${id}.url`)
  return { ...readVariantFields(object, id, key), url }
}

function parsePublicVariants(
  input: unknown,
  keys: ObjectKeyPlan['variants'],
  base: string,
): PublicVariants {
  const variants = exactObject(input, VARIANT_IDS, [], 'variants')
  return {
    thumbnail: parsePublicVariant(
      variants.thumbnail,
      'thumbnail',
      keys.thumbnail,
      base,
    ),
    square: parsePublicVariant(variants.square, 'square', keys.square, base),
    small: parsePublicVariant(variants.small, 'small', keys.small, base),
    medium: parsePublicVariant(variants.medium, 'medium', keys.medium, base),
    large: parsePublicVariant(variants.large, 'large', keys.large, base),
    xlarge: parsePublicVariant(variants.xlarge, 'xlarge', keys.xlarge, base),
    og: parsePublicVariant(variants.og, 'og', keys.og, base),
  }
}

export function parseUploadImageResponse(input: unknown): UploadImageResponse {
  const object = exactObject(
    input,
    [
      ...IMAGE_FIELDS,
      'url',
      'mediaId',
      'uploadId',
      'thumbnailURL',
      'focalX',
      'focalY',
      'variants',
    ],
    [],
    'response',
  )
  const uploadId = readUuid(object.uploadId, 'uploadId')
  const image = readImageFields(
    object,
    IMAGE_PROCESSING_LIMITS.maxInputBytes,
    'original',
  )
  const keys = createObjectKeyPlan(uploadId, image.mimeType)
  requireEqual(image.filename, keyFilename(keys.original), 'filename')
  const url = readPublicUrl(object.url, keys.original, 'url')
  const original: PublicImageMetadata = { ...image, url }
  const variants = parsePublicVariants(
    object.variants,
    keys.variants,
    url.slice(0, -keys.original.length),
  )
  requireEqual(object.thumbnailURL, variants.thumbnail.url, 'thumbnailURL')
  return {
    ...original,
    mediaId: readPositiveInteger(object.mediaId, 'mediaId'),
    uploadId,
    thumbnailURL: variants.thumbnail.url,
    focalX: readFinite(object.focalX, 'focalX', 0, 100),
    focalY: readFinite(object.focalY, 'focalY', 0, 100),
    variants,
  }
}

function readErrorCode(input: unknown): UploadErrorCode {
  switch (input) {
    case 'INVALID_INPUT':
    case 'UNSUPPORTED_FORMAT':
    case 'UPLOAD_TOO_LARGE':
    case 'UNAUTHORIZED':
    case 'FORBIDDEN':
    case 'PROCESSOR_BUSY':
    case 'CONTAINER_START_FAILED':
    case 'PROCESSING_TIMEOUT':
    case 'STORAGE_FAILED':
    case 'PERSISTENCE_FAILED':
    case 'INTERNAL_ERROR':
      return input
    default:
      return invalid('error.code is not recognized.')
  }
}

export function parseUploadErrorResponse(input: unknown): UploadErrorResponse {
  const object = exactObject(input, ['error'], ['uploadId'], 'response')
  const error = exactObject(
    object.error,
    ['code', 'message', 'retryable'],
    [],
    'error',
  )
  if (
    typeof error.message !== 'string' ||
    error.message.trim().length === 0 ||
    error.message.length > 1024 ||
    containsControlCharacters(error.message)
  ) {
    return invalid('error.message must be a short, nonempty message.')
  }
  if (typeof error.retryable !== 'boolean') {
    return invalid('error.retryable must be a boolean.')
  }
  const response: UploadErrorResponse = {
    error: {
      code: readErrorCode(error.code),
      message: error.message,
      retryable: error.retryable,
    },
  }
  if (hasField(object, 'uploadId')) {
    response.uploadId = readUuid(object.uploadId, 'uploadId')
  }
  return response
}
