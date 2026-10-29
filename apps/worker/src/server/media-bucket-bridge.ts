import { WorkerEntrypoint } from 'cloudflare:workers'
import {
  ImageProcessingError,
  IMAGE_PROCESSING_LIMITS,
} from 'shared/image-processing'
import { imageErrorResponse } from './image-http'

export interface MediaBridgeProps {
  ownerId: string
  attemptId: string
  uploadId: string
  allowedKeys: string[]
}

export class MediaBucketBridge extends WorkerEntrypoint<Env, MediaBridgeProps> {
  async fetch(request: Request): Promise<Response> {
    const props = this.ctx.props
    try {
      const url = new URL(request.url)
      const key = url.pathname.slice(1)
      if (
        request.method !== 'PUT' ||
        url.hostname !== 'r2.internal' ||
        url.search ||
        !props.allowedKeys.includes(key) ||
        !request.body
      ) {
        throw new ImageProcessingError(
          'FORBIDDEN',
          'The object write is not permitted.',
        )
      }
      const rawLength = request.headers.get('Content-Length') ?? ''
      if (!/^\d+$/.test(rawLength))
        throw new ImageProcessingError(
          'INVALID_INPUT',
          'A known object byte length is required.',
        )
      const length = Number(rawLength)
      const contentType = request.headers.get('Content-Type') ?? ''
      const owner = this.env.CONTAINER_SIDECAR.get(
        this.env.CONTAINER_SIDECAR.idFromString(props.ownerId),
      )
      const token = await owner.beginObjectWrite(
        props.attemptId,
        key,
        length,
        contentType,
      )
      const controller = new AbortController()
      const abort = () => controller.abort(request.signal.reason)
      request.signal.addEventListener('abort', abort, { once: true })
      if (request.signal.aborted) abort()
      const timer = setTimeout(
        () => controller.abort(new Error('Object upload deadline exceeded')),
        IMAGE_PROCESSING_LIMITS.processingMs,
      )
      let written = false
      try {
        // R2 requires a known stream length. FixedLengthStream also rejects short or oversized bodies.
        const fixed = new FixedLengthStream(length)
        const pipeline = request.body.pipeTo(fixed.writable, {
          signal: controller.signal,
        })
        const put = this.env.MEDIA_BUCKET.put(key, fixed.readable, {
          httpMetadata: {
            contentType,
            cacheControl: 'public, max-age=31536000, immutable',
          },
          customMetadata: { uploadId: props.uploadId },
        }).then(() => {
          written = true
        })
        try {
          await Promise.all([pipeline, put])
        } catch (error) {
          controller.abort(error)
          await Promise.allSettled([pipeline, put])
          throw error
        }
        return new Response(null, { status: 201 })
      } finally {
        clearTimeout(timer)
        request.signal.removeEventListener('abort', abort)
        // A missing acknowledgement deliberately fences the slot; cleanup must not race this write.
        await owner.finishObjectWrite(props.attemptId, key, token, written)
      }
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'image_storage_failure',
          uploadId: props.uploadId,
          error: error instanceof Error ? error.message : 'unknown',
        }),
      )
      return imageErrorResponse(
        error instanceof ImageProcessingError
          ? error
          : new ImageProcessingError(
              'STORAGE_FAILED',
              'The image object could not be stored.',
            ),
        props.uploadId,
      )
    }
  }
}
