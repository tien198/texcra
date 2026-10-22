import type { UploadErrorCode } from './types'

export class ImageProcessingError extends Error {
  readonly code: UploadErrorCode

  constructor(code: UploadErrorCode, message: string) {
    super(message)
    this.name = 'ImageProcessingError'
    this.code = code
  }
}
