import { DurableObject } from 'cloudflare:workers'
import {
  decodeImageMetadata,
  ImageProcessingError,
  IMAGE_PROCESSING_LIMITS,
  parseProcessImageMetadata,
} from 'shared/image-processing'
import { ImageJobCoordinator } from './image-job-coordinator'
import { imageErrorResponse } from './image-http'

export class ImageProcessorContainer extends DurableObject<Env> {
  private readonly coordinator: ImageJobCoordinator
  private readonly restore: Promise<void>

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.restore = ctx.container?.running
      ? ctx.container.setInactivityTimeout(IMAGE_PROCESSING_LIMITS.inactivityMs)
      : Promise.resolve()
    ctx.waitUntil(
      this.restore.catch((error: unknown) => {
        console.error('image_container_restore_failed', error)
      }),
    )
    this.coordinator = new ImageJobCoordinator(ctx, env)
  }

  async fetch(request: Request): Promise<Response> {
    let uploadId: string | undefined
    try {
      if (
        request.method !== 'POST' ||
        new URL(request.url).pathname !== '/process' ||
        !request.body
      )
        throw new ImageProcessingError(
          'INVALID_INPUT',
          'An image processing request is required.',
        )
      const metadata = parseProcessImageMetadata(
        decodeImageMetadata(request.headers.get('x-image-metadata') ?? ''),
      )
      uploadId = metadata.uploadId
      await this.restore
      const response = await this.coordinator.run(
        metadata,
        request.body,
        request.signal,
      )
      return Response.json(response, {
        headers: { 'Cache-Control': 'no-store' },
      })
    } catch (error) {
      return imageErrorResponse(error, uploadId)
    }
  }

  beginObjectWrite(
    attemptId: string,
    key: string,
    size: number,
    mimeType: string,
  ): string {
    return this.coordinator.beginWrite(attemptId, key, size, mimeType)
  }

  finishObjectWrite(
    attemptId: string,
    key: string,
    token: string,
    success: boolean,
  ): void {
    this.coordinator.finishWrite(attemptId, key, token, success)
  }

  async alarm(): Promise<void> {
    await this.coordinator.alarm()
  }
}
