import { IMAGE_PROCESSING_LIMITS } from './constants'
import { ImageProcessingError } from './errors'
import type { ImageMimeType } from './types'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CONTENT_HASH_PATTERN = /^[0-9a-f]{64}$/
const UNSAFE_FILENAME_PATTERN = /[/\\<>:"|?*]/u
const MAX_FILENAME_BYTES = 255
const UTF8_ENCODER = new TextEncoder()

function exceedsUtf8Bytes(value: string, maxBytes: number): boolean {
  // Fast-fail O(1) guard: every UTF-16 code unit encodes to at least 1 UTF-8 byte.
  if (value.length > maxBytes) {
    return true
  }
  return UTF8_ENCODER.encode(value).byteLength > maxBytes
}

export function containsControlCharacters(
  value: string,
  includeSpace = false,
): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0)
    if (code <= (includeSpace ? 32 : 31) || (code >= 127 && code <= 159)) {
      return true
    }
  }
  return false
}

export function invalid(message: string): never {
  throw new ImageProcessingError('INVALID_INPUT', message)
}

export function exactObject(
  input: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
  label = 'metadata',
): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return invalid(`${label} must be an object.`)
  }
  const prototype: unknown = Object.getPrototypeOf(input)
  if (prototype !== Object.prototype && prototype !== null) {
    return invalid(`${label} must contain plain JSON data.`)
  }
  for (const key of Reflect.ownKeys(input)) {
    if (
      typeof key !== 'string' ||
      (!required.includes(key) && !optional.includes(key))
    ) {
      return invalid(`${label} contains an unexpected field.`)
    }
    const descriptor = Object.getOwnPropertyDescriptor(input, key)
    if (!descriptor?.enumerable || !('value' in descriptor)) {
      return invalid(`${label} must contain plain JSON data.`)
    }
  }
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) {
      return invalid(`${label}.${key} is required.`)
    }
  }
  return input as Record<string, unknown>
}

export function hasField(
  object: Record<string, unknown>,
  key: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(object, key)
}

export function readUuid(input: unknown, label: string): string {
  if (typeof input !== 'string' || !UUID_PATTERN.test(input)) {
    return invalid(`${label} must be a valid UUID.`)
  }
  return input
}

export function readContentHash(input: unknown, label: string): string {
  if (typeof input !== 'string' || !CONTENT_HASH_PATTERN.test(input)) {
    return invalid(
      `${label} must be a 64-character lowercase SHA-256 hex digest.`,
    )
  }
  return input
}

export function readFilename(input: unknown, label: string): string {
  if (
    typeof input !== 'string' ||
    input.length === 0 ||
    exceedsUtf8Bytes(input, MAX_FILENAME_BYTES) ||
    input.trim() !== input ||
    input === '.' ||
    input === '..' ||
    containsControlCharacters(input) ||
    UNSAFE_FILENAME_PATTERN.test(input)
  ) {
    return invalid(`${label} must be a safe filename of at most 255 bytes.`)
  }
  return input
}

export function readMimeType(input: unknown, label: string): ImageMimeType {
  switch (input) {
    case 'image/jpeg':
    case 'image/png':
    case 'image/webp':
    case 'image/avif':
      return input
    default:
      throw new ImageProcessingError(
        'UNSUPPORTED_FORMAT',
        `${label} must be JPEG, PNG, WebP, or AVIF.`,
      )
  }
}

export function readFinite(
  input: unknown,
  label: string,
  minimum = -Infinity,
  maximum = Infinity,
): number {
  if (
    typeof input !== 'number' ||
    !Number.isFinite(input) ||
    input < minimum ||
    input > maximum
  ) {
    return invalid(`${label} must be a finite number within its allowed range.`)
  }
  return input
}

export function readPositiveInteger(input: unknown, label: string): number {
  if (typeof input !== 'number' || !Number.isSafeInteger(input) || input <= 0) {
    return invalid(`${label} must be a positive safe integer.`)
  }
  return input
}

export function readByteCount(
  input: unknown,
  label: string,
  maximum: number,
): number {
  const value = readPositiveInteger(input, label)
  if (value > maximum) {
    throw new ImageProcessingError(
      'UPLOAD_TOO_LARGE',
      `${label} exceeds the permitted image size.`,
    )
  }
  return value
}

export function readDimensions(
  widthInput: unknown,
  heightInput: unknown,
  label: string,
): { width: number; height: number } {
  const width = readPositiveInteger(widthInput, `${label}.width`)
  const height = readPositiveInteger(heightInput, `${label}.height`)
  if (width > IMAGE_PROCESSING_LIMITS.maxInputPixels / height) {
    throw new ImageProcessingError(
      'UPLOAD_TOO_LARGE',
      `${label} exceeds the permitted pixel count.`,
    )
  }
  return { width, height }
}

export function requireEqual(
  input: unknown,
  expected: unknown,
  label: string,
): void {
  if (input !== expected) {
    invalid(`${label} does not match the upload contract.`)
  }
}
