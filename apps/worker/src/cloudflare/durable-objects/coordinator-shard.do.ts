import { DurableObject } from 'cloudflare:workers'
import type { UploadImageResponse } from 'shared/image-processing'
import { FillFirstBinPackerAdapter } from '#/modules/media/domain/services/fill-first-bin-packer'
import type { IMediaRepository } from '#/modules/media/domain/ports/media-repository.port'
import {
  D1MediaRepository,
  MediaUrlResolver,
} from '#/modules/media/infrastructure'
import {
  acquireCoordinatorLease,
  completeCoordinatorLease,
  failCoordinatorLease,
  reconcileExpiredLeases,
} from './coordinator-shard.functions'
import { CoordinatorShardStorage } from './coordinator-shard.storage'
import { SHARED_SIDECAR_POOL_NAMES } from './coordinator-shard.types'
import type {
  AcquireLeaseInput,
  AcquireLeaseResult,
  CoordinatorLeaseDeps,
} from './coordinator-shard.types'

export {
  LEASE_TTL_MS,
  SHARED_SIDECAR_POOL_NAMES,
  type AcquireLeaseInput,
  type AcquireLeaseResult,
  type IdempotencyRow,
  type LeaseTicket,
  type SidecarPoolRow,
} from './coordinator-shard.types'
export { sameDomainMetadata } from './coordinator-shard.functions'
export { CoordinatorShardStorage } from './coordinator-shard.storage'

export class CoordinatorShardDO extends DurableObject<Env> {
  private readonly storage: CoordinatorShardStorage
  private readonly deps: CoordinatorLeaseDeps
  private mediaRepo?: IMediaRepository

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.storage = new CoordinatorShardStorage(ctx.storage.sql)
    this.storage.initSchema(SHARED_SIDECAR_POOL_NAMES)
    this.deps = {
      storage: this.storage,
      binPacker: new FillFirstBinPackerAdapter(),
      getMediaRepo: () => this.getMediaRepo(),
      sidecarNamespace: this.env.CONTAINER_SIDECAR,
      scheduleNextExpiryAlarm: () => this.scheduleNextExpiryAlarm(),
    }
  }

  public async acquireLease(
    input: AcquireLeaseInput,
  ): Promise<AcquireLeaseResult> {
    return await acquireCoordinatorLease(this.deps, input)
  }

  public async completeLease(
    ticketId: string,
    attemptId: string,
    response: UploadImageResponse,
    sidecarWarm = true,
  ): Promise<void> {
    await completeCoordinatorLease(
      this.deps,
      ticketId,
      attemptId,
      response,
      sidecarWarm,
    )
  }

  public async failLease(
    ticketId: string,
    attemptId: string,
    recoveredResponse: UploadImageResponse | null = null,
    sidecarWarm = false,
  ): Promise<void> {
    await failCoordinatorLease(
      this.deps,
      ticketId,
      attemptId,
      recoveredResponse,
      sidecarWarm,
    )
  }

  override async alarm(): Promise<void> {
    reconcileExpiredLeases(this.storage, Date.now())
    await this.scheduleNextExpiryAlarm()
  }

  private async scheduleNextExpiryAlarm(): Promise<void> {
    const nextExpiry = this.storage.getNextExpiryTimestamp()
    if (nextExpiry !== null) {
      await this.ctx.storage.setAlarm(nextExpiry)
    } else {
      await this.ctx.storage.deleteAlarm()
    }
  }

  private getMediaRepo(): IMediaRepository {
    this.mediaRepo ??= D1MediaRepository.getInstance(
      this.env.DB,
      MediaUrlResolver.validateOrigin(this.env.MEDIA_PUBLIC_BASE_URL),
    )
    return this.mediaRepo
  }
}
