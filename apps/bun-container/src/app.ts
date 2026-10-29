import { Elysia, NotFound } from 'elysia'
import { ImageProcessingError } from 'shared/image-processing'
import { APP_CONFIG } from './config'
import { createErrorResponse, validateProcessRequest } from './errors'
import { processor } from './processor'

export const app = new Elysia({
  name: 'bun-container',
  abortSignal: false,
  serve: {
    hostname: APP_CONFIG.server.hostname,
    port: APP_CONFIG.server.port,
    maxRequestBodySize: APP_CONFIG.server.maxRequestBodySize,
    // Bun defaults to 10 seconds, shorter than a legitimate native image encode.
    idleTimeout: APP_CONFIG.server.idleTimeout,
  },
})
  .state('admission', {
    active: false,
    uploadId: null as string | null,
  })
  .decorate('processor', processor)
  .onError(({ error }) => {
    if (error instanceof NotFound) {
      return new Response('Not found', { status: 404 })
    }
    return createErrorResponse(error)
  })
  .get('/healthz', ({ store }) => ({
    ok: true,
    busy: store.admission.active,
    uploadId: store.admission.uploadId,
  }))
  .post(
    '/process',
    { parse: 'none' },
    async ({ request, server, store, processor: imageProcessor }) => {
      // Check admission before touching the incoming body. Never queue requests.
      if (store.admission.active) {
        return createErrorResponse(
          new ImageProcessingError('PROCESSOR_BUSY', 'Image processor is busy'),
        )
      }

      let uploadId: string | undefined
      let timer: ReturnType<typeof setTimeout> | undefined
      const controller = new AbortController()
      const onAbort = () => controller.abort(request.signal.reason)

      try {
        const { metadata, body } = validateProcessRequest(request)
        uploadId = metadata.uploadId

        store.admission.active = true
        store.admission.uploadId = uploadId
        request.signal.addEventListener('abort', onAbort, { once: true })
        if (request.signal.aborted) onAbort()
        server?.timeout(request, APP_CONFIG.server.requestTimeoutSeconds)

        timer = setTimeout(
          () =>
            controller.abort(
              new ImageProcessingError(
                'PROCESSING_TIMEOUT',
                'Image processing exceeded its deadline',
              ),
            ),
          APP_CONFIG.server.processingMs,
        )

        const result = await imageProcessor.processImage(
          body,
          metadata,
          controller.signal,
        )
        controller.signal.throwIfAborted()
        return result
      } catch (error) {
        const failure = controller.signal.aborted
          ? controller.signal.reason
          : error
        console.error(
          JSON.stringify({
            uploadId,
            stage: 'process',
            code:
              failure instanceof ImageProcessingError
                ? failure.code
                : 'INTERNAL_ERROR',
          }),
        )
        return createErrorResponse(failure, uploadId)
      } finally {
        if (timer !== undefined) clearTimeout(timer)
        request.signal.removeEventListener('abort', onAbort)
        // Awaited processor cleanup precedes admission release, including aborts.
        store.admission.active = false
        store.admission.uploadId = null
      }
    },
  )

export type App = typeof app
