import { readMimeType, readUuid } from './primitives'
import type { ImageMimeType, ObjectKeyPlan } from './types'

const ORIGINAL_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
} as const satisfies Record<ImageMimeType, string>

export function createObjectKeyPlan(
  uploadId: string,
  mimeType: ImageMimeType,
): ObjectKeyPlan {
  const id = readUuid(uploadId, 'uploadId')
  const format = readMimeType(mimeType, 'mimeType')
  const prefix = `media/${id}/${id}`
  return {
    original: `${prefix}-original.${ORIGINAL_EXTENSIONS[format]}`,
    variants: {
      thumbnail: `${prefix}-thumbnail.webp`,
      square: `${prefix}-square.webp`,
      small: `${prefix}-small.webp`,
      medium: `${prefix}-medium.webp`,
      large: `${prefix}-large.webp`,
      xlarge: `${prefix}-xlarge.webp`,
      og: `${prefix}-og.webp`,
    },
  }
}
