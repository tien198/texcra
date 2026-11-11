import type { UploadErrorResponse } from 'shared/image-processing'

export class ImageUploadError extends Error {
  constructor(
    public readonly response: UploadErrorResponse,
    public readonly status: number,
  ) {
    super(response.error.message)
    this.name = 'ImageUploadError'
  }
}
