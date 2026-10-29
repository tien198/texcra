import {
  decodeImageMetadata,
  ImageProcessingError,
  parseUploadMetadata,
} from 'shared/image-processing'
import type { IncomingUploadMetadata } from './types'

function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code <= 31 || code === 127) return true
  }
  return false
}

export function validateIdentifier(value: unknown, label: string): string {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0 ||
    value.length > 256 ||
    value.trim() !== value ||
    hasControlChars(value)
  ) {
    throw new ImageProcessingError(
      'INVALID_INPUT',
      `${label} must be a non-empty string without control characters.`,
    )
  }
  return value
}

export function parseIncomingUploadMetadata(
  rawHeader: string,
): IncomingUploadMetadata {
  const decoded = decodeImageMetadata(rawHeader)
  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    Array.isArray(decoded)
  ) {
    throw new ImageProcessingError(
      'INVALID_INPUT',
      'Upload metadata must be a JSON object.',
    )
  }
  const record = { ...(decoded as Record<string, unknown>) }
  const rawDraftId = record.draft_id
  delete record.draft_id

  const metadata = parseUploadMetadata(record)
  const draft_id =
    rawDraftId !== undefined
      ? validateIdentifier(rawDraftId, 'draft_id')
      : metadata.uploadId

  return { metadata, draft_id }
}
