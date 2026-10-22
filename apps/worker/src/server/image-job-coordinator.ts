import {
  encodeImageMetadata,
  ImageProcessingError,
  IMAGE_PROCESSING_LIMITS,
  parseProcessImageResult,
  parseUploadErrorResponse,
} from 'shared/image-processing'
import type {
  ProcessImageMetadata,
  ProcessImageResult,
  UploadImageResponse,
} from 'shared/image-processing'
import { SqliteImageJobStore } from './image-job-store'
import { readImageJson, validateMediaOrigin } from './image-http'
import { findMediaByOriginalFilename, persistMedia } from './media'
import type { ImageJob } from './image-job-types'

const sameMetadata = (
  left: ProcessImageMetadata,
  right: ProcessImageMetadata,
) => JSON.stringify(left) === JSON.stringify(right)

const keysOf = (metadata: ProcessImageMetadata) => [
  metadata.objectKeys.original,
  ...Object.values(metadata.objectKeys.variants),
]

/** The journal is durable; running only serializes the current object's invocations. */
export class ImageJobCoordinator {
  private running = false
  private readonly store: SqliteImageJobStore

  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: Env,
  ) {
    this.store = new SqliteImageJobStore(ctx.storage.sql)
  }

  async run(
    metadata: ProcessImageMetadata,
    body: ReadableStream<Uint8Array>,
    signal: AbortSignal,
  ): Promise<UploadImageResponse> {
    if (this.running)
      throw new ImageProcessingError(
        'PROCESSOR_BUSY',
        'This image processor is busy. Retry this upload shortly.',
      )
    this.running = true
    try {
      await this.recover()
      const completed = this.store.getCompleted(metadata.uploadId)
      if (completed) {
        if (!sameMetadata(completed.metadata, metadata))
          throw new ImageProcessingError(
            'INVALID_INPUT',
            'The upload ID was already used with different metadata.',
          )
        return completed.response
      }
      const existing = await this.findCommitted(metadata)
      if (existing) {
        this.store.putCompleted(metadata.uploadId, {
          metadata,
          response: existing,
        })
        return existing
      }
      signal.throwIfAborted()
      const job: ImageJob = {
        metadata,
        attemptId: crypto.randomUUID(),
        stage: 'processing',
        pending: {},
        written: {},
        retries: 0,
      }
      this.store.putActive(job)
      await this.setAlarm(
        Date.now() +
          IMAGE_PROCESSING_LIMITS.startupMs +
          IMAGE_PROCESSING_LIMITS.processingMs +
          5_000,
      )
      try {
        const result = parseProcessImageResult(
          await this.process(job, body, signal),
          metadata,
        )
        const active = this.store.getActive()
        if (!active || active.attemptId !== job.attemptId)
          throw new ImageProcessingError(
            'INTERNAL_ERROR',
            'The image job state was lost.',
          )
        this.validateReceipts(active, result)
        this.store.putActive({ ...active, stage: 'persisting', result })
        return await this.commit(this.store.getActive()!)
      } catch (error) {
        // The outer catch records one retry per failed recovery attempt.
        await this.recover()
        const recovered = this.store.getCompleted(metadata.uploadId)
        if (recovered) return recovered.response
        throw error
      }
    } catch (error) {
      if (this.store.getActive()) await this.retryLater(error)
      throw error
    } finally {
      this.running = false
    }
  }

  /** Each R2 write registers before IO and acknowledges completion before the slot is reused. */
  beginWrite(
    attemptId: string,
    key: string,
    size: number,
    mimeType: string,
  ): string {
    const job = this.store.getActive()
    if (
      !job ||
      job.stage !== 'processing' ||
      job.attemptId !== attemptId ||
      !keysOf(job.metadata).includes(key)
    ) {
      throw new ImageProcessingError(
        'FORBIDDEN',
        'This object write is no longer authorized.',
      )
    }
    const original = key === job.metadata.objectKeys.original
    const limit = original
      ? job.metadata.filesize
      : IMAGE_PROCESSING_LIMITS.maxOutputBytes
    if (
      !Number.isSafeInteger(size) ||
      size <= 0 ||
      size > limit ||
      (original && size !== job.metadata.filesize) ||
      mimeType !== (original ? job.metadata.mimeType : 'image/webp')
    ) {
      throw new ImageProcessingError(
        'INVALID_INPUT',
        'The object metadata is invalid.',
      )
    }
    if (job.pending[key] || job.written[key])
      throw new ImageProcessingError(
        'FORBIDDEN',
        'This object has already been submitted.',
      )
    const token = crypto.randomUUID()
    job.pending[key] = { token, size, mimeType }
    this.store.putActive(job)
    return token
  }

  finishWrite(
    attemptId: string,
    key: string,
    token: string,
    success: boolean,
  ): void {
    const job = this.store.getActive()
    if (
      !job ||
      job.attemptId !== attemptId ||
      job.pending[key]?.token !== token
    )
      return
    if (success) job.written[key] = job.pending[key]
    delete job.pending[key]
    this.store.putActive(job)
  }

  async alarm(): Promise<void> {
    if (this.running) {
      await this.setAlarm(Date.now() + 5_000)
      return
    }
    this.running = true
    try {
      await this.recover()
    } catch (error) {
      await this.retryLater(error)
    } finally {
      this.running = false
    }
  }

  private validateReceipts(job: ImageJob, result: ProcessImageResult): void {
    if (Object.keys(job.pending).length)
      throw new ImageProcessingError(
        'STORAGE_FAILED',
        'Some image writes are still in progress.',
      )
    for (const object of [result.original, ...Object.values(result.variants)]) {
      const receipt = job.written[object.r2Key]
      if (
        !receipt ||
        receipt.size !== object.filesize ||
        receipt.mimeType !== object.mimeType
      ) {
        throw new ImageProcessingError(
          'STORAGE_FAILED',
          'The image result does not match its completed object writes.',
        )
      }
    }
  }

  private async finish(
    job: ImageJob,
    response: UploadImageResponse,
  ): Promise<UploadImageResponse> {
    this.store.putCompleted(job.metadata.uploadId, {
      metadata: job.metadata,
      response,
    })
    this.store.clearActive()
    await this.setAlarm(null)
    return response
  }

  private async commit(job: ImageJob): Promise<UploadImageResponse> {
    if (!job.result)
      throw new ImageProcessingError(
        'PERSISTENCE_FAILED',
        'The completed image metadata is unavailable.',
      )
    try {
      return await this.finish(job, await this.persist(job.result))
    } catch (error) {
      // An insert can succeed even when its response is lost; never delete these objects.
      const existing = await this.findCommitted(job.metadata)
      if (existing) return this.finish(job, existing)
      throw error
    }
  }

  private async recover(): Promise<void> {
    let job = this.store.getActive()
    if (!job) return
    if (job.stage === 'persisting') {
      const existing = await this.findCommitted(job.metadata)
      if (existing) {
        await this.finish(job, existing)
        return
      }
      await this.commit(job)
      return
    }
    // Revoke write admission before stopping the container, including after DO reconstruction.
    job = { ...job, stage: 'cleanup' }
    this.store.putActive(job)
    await this.stop()
    job = this.store.getActive()!
    if (Object.keys(job.pending).length) {
      throw new ImageProcessingError(
        'PROCESSOR_BUSY',
        'The previous upload is finishing its storage cleanup.',
      )
    }
    const existing = await this.findCommitted(job.metadata)
    if (existing) {
      await this.finish(job, existing)
      return
    }
    await this.removeObjects(job.metadata)
    this.store.clearActive()
    await this.setAlarm(null)
  }

  private async retryLater(error: unknown): Promise<void> {
    const job = this.store.getActive()
    if (!job) return
    job.retries += 1
    this.store.putActive(job)
    this.report(error, job)
    // Preserve the journal and keep the slot fenced if cleanup cannot be proven complete.
    await this.setAlarm(
      job.retries <= 8
        ? Date.now() + Math.min(60_000, 1000 * 2 ** job.retries)
        : null,
    )
  }

  protected async process(
    job: ImageJob,
    body: ReadableStream<Uint8Array>,
    requestSignal: AbortSignal,
  ): Promise<unknown> {
    const container = this.ctx.container
    if (!container)
      throw new ImageProcessingError(
        'CONTAINER_START_FAILED',
        'The image container is not configured.',
      )
    const controller = new AbortController()
    const abort = () => controller.abort(requestSignal.reason)
    requestSignal.addEventListener('abort', abort, { once: true })
    if (requestSignal.aborted) abort()
    let stage: 'startup' | 'processing' = 'startup'
    const isStarting = () => stage === 'startup'
    let timeout: ReturnType<typeof setTimeout> | undefined
    let rejectDeadline: (error: Error) => void = () => undefined
    const deadline = new Promise<never>((_resolve, reject) => {
      rejectDeadline = reject
    })
    const setDeadline = (milliseconds: number) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        const error = new ImageProcessingError(
          stage === 'startup' ? 'CONTAINER_START_FAILED' : 'PROCESSING_TIMEOUT',
          stage === 'startup'
            ? 'The image container did not become ready.'
            : 'The image processing deadline was exceeded.',
        )
        controller.abort(error)
        rejectDeadline(error)
      }, milliseconds)
    }
    try {
      controller.signal.throwIfAborted()
      if (!container.running) container.start({ enableInternet: false })
      const exited = container.monitor().then<never>(() => {
        throw new ImageProcessingError(
          'CONTAINER_START_FAILED',
          'The image container stopped unexpectedly.',
        )
      })
      setDeadline(IMAGE_PROCESSING_LIMITS.startupMs)
      const operation = async () => {
        await container.setInactivityTimeout(
          IMAGE_PROCESSING_LIMITS.inactivityMs,
        )
        await container.interceptOutboundHttp(
          'r2.internal',
          this.ctx.exports.MediaBucketBridge({
            props: {
              ownerId: this.ctx.id.toString(),
              attemptId: job.attemptId,
              uploadId: job.metadata.uploadId,
              allowedKeys: [
                job.metadata.objectKeys.original,
                ...Object.values(job.metadata.objectKeys.variants),
              ],
            },
          }),
        )
        const port = container.getTcpPort(3001)
        for (;;) {
          controller.signal.throwIfAborted()
          try {
            const health = await port.fetch('http://container/healthz', {
              signal: AbortSignal.any([
                controller.signal,
                AbortSignal.timeout(1000),
              ]),
            })
            const ready = health.ok
            await health.body?.cancel()
            if (ready) break
          } catch {
            controller.signal.throwIfAborted()
          }
          // Back off between real readiness probes while the container starts.
          await new Promise<void>((resolve) => setTimeout(resolve, 100))
        }
        stage = 'processing'
        setDeadline(IMAGE_PROCESSING_LIMITS.processingMs)
        const response = await port.fetch('http://container/process', {
          method: 'POST',
          headers: {
            'Content-Type': job.metadata.mimeType,
            'x-image-metadata': encodeImageMetadata(job.metadata),
          },
          body,
          signal: controller.signal,
        })
        const result = await readImageJson(response)
        if (!response.ok) {
          const failure = parseUploadErrorResponse(result)
          throw new ImageProcessingError(
            failure.error.code,
            failure.error.message,
          )
        }
        return result
      }
      return await Promise.race([operation(), exited, deadline])
    } catch (error) {
      controller.abort(error)
      if (error instanceof ImageProcessingError) throw error
      throw new ImageProcessingError(
        isStarting() ? 'CONTAINER_START_FAILED' : 'INTERNAL_ERROR',
        isStarting()
          ? 'The image container could not be started.'
          : 'The image processing request was interrupted.',
      )
    } finally {
      clearTimeout(timeout)
      requestSignal.removeEventListener('abort', abort)
    }
  }

  protected async stop(): Promise<void> {
    if (this.ctx.container?.running) await this.ctx.container.destroy()
  }

  protected async findCommitted(
    metadata: ProcessImageMetadata,
  ): Promise<UploadImageResponse | null> {
    try {
      return await findMediaByOriginalFilename(
        this.env.DB,
        metadata.objectKeys.original.split('/').at(-1)!,
        metadata.uploadId,
        validateMediaOrigin(this.env.MEDIA_PUBLIC_BASE_URL),
      )
    } catch {
      throw new ImageProcessingError(
        'PERSISTENCE_FAILED',
        'The upload commit could not be verified.',
      )
    }
  }

  protected async persist(
    result: ProcessImageResult,
  ): Promise<UploadImageResponse> {
    try {
      return await persistMedia(
        this.env.DB,
        result,
        validateMediaOrigin(this.env.MEDIA_PUBLIC_BASE_URL),
      )
    } catch {
      throw new ImageProcessingError(
        'PERSISTENCE_FAILED',
        'The completed image metadata could not be saved.',
      )
    }
  }

  protected async removeObjects(metadata: ProcessImageMetadata): Promise<void> {
    await this.env.MEDIA_BUCKET.delete(keysOf(metadata))
  }

  protected async setAlarm(time: number | null): Promise<void> {
    if (time === null) await this.ctx.storage.deleteAlarm()
    else await this.ctx.storage.setAlarm(time)
  }

  protected report(error: unknown, job: ImageJob): void {
    console.error(
      JSON.stringify({
        event: 'image_job_recovery',
        uploadId: job.metadata.uploadId,
        stage: job.stage,
        retries: job.retries,
        error: error instanceof Error ? error.message : 'unknown',
      }),
    )
  }
}
