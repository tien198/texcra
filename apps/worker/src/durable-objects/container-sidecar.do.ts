import { DurableObject } from 'cloudflare:workers'
import {
  decodeImageMetadata,
  encodeImageMetadata,
  ImageProcessingError,
  IMAGE_PROCESSING_LIMITS,
  parseProcessImageMetadata,
  parseProcessImageResult,
  parseUploadErrorResponse,
} from 'shared/image-processing'
import type {
  ProcessImageMetadata,
  ProcessImageResult,
} from 'shared/image-processing'
import type { LeaseTicket } from './coordinator-shard.do'
import {
  imageErrorResponse,
  readImageJson,
  validateMediaOrigin,
} from '#/server/image-http'
import { findMediaByOriginalFilename } from '#/server/media'

export const LEASE_TICKET_HEADER = 'x-lease-ticket'

export interface ImageWriteReceipt {
  readonly token: string
  readonly size: number
  readonly mimeType: string
}

interface SidecarActiveJob {
  ticket: LeaseTicket
  metadata: ProcessImageMetadata
  stage: 'reserved' | 'processing' | 'cleaning'
  pending: Partial<Record<string, ImageWriteReceipt>>
  written: Partial<Record<string, ImageWriteReceipt>>
}

const keysOf = (metadata: ProcessImageMetadata): string[] => [
  metadata.objectKeys.original,
  ...Object.values(metadata.objectKeys.variants),
]

export class ContainerSidecarDO extends DurableObject<Env> {
  private running = false
  private readonly sql: SqlStorage
  private readonly restore: Promise<void>

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.sql = ctx.storage.sql
    this.sql.exec(
      'CREATE TABLE IF NOT EXISTS sidecar_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
    )
    this.restore = ctx.container?.running
      ? ctx.container.setInactivityTimeout(IMAGE_PROCESSING_LIMITS.inactivityMs)
      : Promise.resolve()
    ctx.waitUntil(
      this.restore.catch((error: unknown) => {
        console.error('sidecar_container_restore_failed', error)
      }),
    )
  }

  public tryReserveSlot(
    ticket: LeaseTicket,
    metadata: ProcessImageMetadata,
  ): { reserved: boolean; isWarm: boolean; activeLoad: number } {
    const now = Date.now()
    const active = this.getActiveJob()
    const isWarm = Boolean(this.ctx.container?.running)

    if (this.running || (active && active.ticket.expiresAt > now)) {
      return {
        reserved: false,
        isWarm,
        activeLoad: 1,
      }
    }

    if (active) {
      this.clearActiveJob()
    }

    const job: SidecarActiveJob = {
      ticket,
      metadata,
      stage: 'reserved',
      pending: {},
      written: {},
    }
    this.putActiveJob(job)
    this.ctx.waitUntil(this.ctx.storage.setAlarm(ticket.expiresAt))

    return {
      reserved: true,
      isWarm,
      activeLoad: 1,
    }
  }

  public releaseSlot(attemptId: string): { isWarm: boolean } {
    const active = this.getActiveJob()
    if (active && active.ticket.attemptId === attemptId) {
      this.clearActiveJob()
      this.ctx.waitUntil(this.ctx.storage.deleteAlarm())
    }
    return {
      isWarm: Boolean(this.ctx.container?.running),
    }
  }

  public beginObjectWrite(
    attemptId: string,
    key: string,
    size: number,
    mimeType: string,
  ): string {
    const job = this.getActiveJob()
    if (
      !job ||
      job.stage !== 'processing' ||
      job.ticket.attemptId !== attemptId ||
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
    if (job.pending[key] || job.written[key]) {
      throw new ImageProcessingError(
        'FORBIDDEN',
        'This object has already been submitted.',
      )
    }
    const token = crypto.randomUUID()
    job.pending[key] = { token, size, mimeType }
    this.putActiveJob(job)
    return token
  }

  public finishObjectWrite(
    attemptId: string,
    key: string,
    token: string,
    success: boolean,
  ): void {
    const job = this.getActiveJob()
    if (
      !job ||
      job.ticket.attemptId !== attemptId ||
      job.pending[key]?.token !== token
    ) {
      return
    }
    if (success) job.written[key] = job.pending[key]
    delete job.pending[key]
    this.putActiveJob(job)
  }

  override async fetch(request: Request): Promise<Response> {
    let uploadId: string | undefined
    try {
      if (
        request.method !== 'POST' ||
        new URL(request.url).pathname !== '/process' ||
        !request.body
      ) {
        throw new ImageProcessingError(
          'INVALID_INPUT',
          'An image processing request is required.',
        )
      }
      const metadata = parseProcessImageMetadata(
        decodeImageMetadata(request.headers.get('x-image-metadata') ?? ''),
      )
      uploadId = metadata.uploadId

      const rawTicket = request.headers.get(LEASE_TICKET_HEADER) ?? ''
      let ticket: LeaseTicket
      try {
        ticket = JSON.parse(rawTicket) as LeaseTicket
      } catch {
        throw new ImageProcessingError(
          'FORBIDDEN',
          'Invalid or expired lease ticket.',
        )
      }

      const active = this.getActiveJob()
      if (
        !active ||
        active.ticket.ticketId !== ticket.ticketId ||
        active.ticket.attemptId !== ticket.attemptId ||
        active.ticket.uploadId !== metadata.uploadId ||
        active.ticket.expiresAt <= Date.now()
      ) {
        throw new ImageProcessingError(
          'FORBIDDEN',
          'Invalid or expired lease ticket.',
        )
      }

      if (this.running) {
        throw new ImageProcessingError(
          'PROCESSOR_BUSY',
          'This image processor is busy. Retry this upload shortly.',
        )
      }

      this.running = true
      try {
        await this.restore
        this.putActiveJob({ ...active, stage: 'processing' })
        const rawResult = await this.processInContainer(
          ticket,
          metadata,
          request.body,
          request.signal,
        )
        const result = parseProcessImageResult(rawResult, metadata)
        const current = this.getActiveJob()
        if (!current || current.ticket.attemptId !== ticket.attemptId) {
          throw new ImageProcessingError(
            'INTERNAL_ERROR',
            'The image job state was lost.',
          )
        }
        this.validateReceipts(current, result)
        return Response.json(result, {
          headers: { 'Cache-Control': 'no-store' },
        })
      } catch (error) {
        await this.cleanupFailedJob(metadata)
        throw error
      } finally {
        this.running = false
      }
    } catch (error) {
      return imageErrorResponse(error, uploadId)
    }
  }

  override async alarm(): Promise<void> {
    if (this.running) {
      await this.ctx.storage.setAlarm(Date.now() + 5_000)
      return
    }
    const active = this.getActiveJob()
    if (!active) return
    if (active.ticket.expiresAt > Date.now()) {
      await this.ctx.storage.setAlarm(active.ticket.expiresAt)
      return
    }
    this.running = true
    try {
      this.putActiveJob({ ...active, stage: 'cleaning' })
      if (this.ctx.container?.running) {
        await this.ctx.container.destroy()
      }
      const committed = await this.isCommittedInD1(active.metadata)
      if (!committed) {
        await this.env.MEDIA_BUCKET.delete(keysOf(active.metadata))
      }
      this.clearActiveJob()
      await this.ctx.storage.deleteAlarm()
    } finally {
      this.running = false
    }
  }

  private async processInContainer(
    ticket: LeaseTicket,
    metadata: ProcessImageMetadata,
    body: ReadableStream<Uint8Array>,
    requestSignal: AbortSignal,
  ): Promise<unknown> {
    const container = this.ctx.container
    if (!container) {
      throw new ImageProcessingError(
        'CONTAINER_START_FAILED',
        'The image container is not configured.',
      )
    }
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
              attemptId: ticket.attemptId,
              uploadId: metadata.uploadId,
              allowedKeys: keysOf(metadata),
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
            'Content-Type': metadata.mimeType,
            'x-image-metadata': encodeImageMetadata(metadata),
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

  private validateReceipts(
    job: SidecarActiveJob,
    result: ProcessImageResult,
  ): void {
    if (Object.keys(job.pending).length) {
      throw new ImageProcessingError(
        'STORAGE_FAILED',
        'Some image writes are still in progress.',
      )
    }
    for (const object of [
      result.original,
      ...Object.values(result.variants),
    ]) {
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

  private async cleanupFailedJob(
    metadata: ProcessImageMetadata,
  ): Promise<void> {
    const active = this.getActiveJob()
    if (active) {
      this.putActiveJob({ ...active, stage: 'cleaning' })
    }
    if (this.ctx.container?.running) {
      await this.ctx.container.destroy().catch(() => undefined)
    }
    await this.env.MEDIA_BUCKET.delete(keysOf(metadata)).catch(() => undefined)
    this.clearActiveJob()
    await this.ctx.storage.deleteAlarm().catch(() => undefined)
  }

  private async isCommittedInD1(
    metadata: ProcessImageMetadata,
  ): Promise<boolean> {
    try {
      const found = await findMediaByOriginalFilename(
        this.env.DB,
        metadata.objectKeys.original.split('/').at(-1)!,
        metadata.uploadId,
        validateMediaOrigin(this.env.MEDIA_PUBLIC_BASE_URL),
      )
      return found !== null
    } catch {
      return false
    }
  }

  private getActiveJob(): SidecarActiveJob | undefined {
    const row = this.sql
      .exec<{ value: string }>(
        'SELECT value FROM sidecar_state WHERE key = ?',
        'active',
      )
      .toArray()
      .at(0)
    return row ? (JSON.parse(row.value) as SidecarActiveJob) : undefined
  }

  private putActiveJob(job: SidecarActiveJob): void {
    this.sql.exec(
      'INSERT INTO sidecar_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      'active',
      JSON.stringify(job),
    )
  }

  private clearActiveJob(): void {
    this.sql.exec('DELETE FROM sidecar_state WHERE key = ?', 'active')
  }
}
