import { DurableObject } from 'cloudflare:workers'
import {
  ImageProcessingError,
  IMAGE_PROCESSING_LIMITS,
} from 'shared/image-processing'
import type {
  ProcessImageMetadata,
  UploadImageResponse,
} from 'shared/image-processing'
import { FillFirstBinPackerAdapter } from '#/core/adapters/fill-first-bin-packer.adapter'
import type { IBinPacker, SidecarNodeState } from '#/core/ports/bin-packer.port'
import { validateMediaOrigin } from '#/server/image-http'
import { findMediaByOriginalFilename } from '#/server/media'

export const SHARED_SIDECAR_POOL_NAMES = [
  'container-sidecar-0',
  'container-sidecar-1',
  'container-sidecar-2',
  'container-sidecar-3',
  'container-sidecar-4',
] as const

export interface LeaseTicket {
  readonly ticketId: string
  readonly attemptId: string
  readonly idempotencyKey: string
  readonly uploadId: string
  readonly draftId: string
  readonly semanticHash: string
  readonly shardName: string
  readonly sidecarName: string
  readonly expiresAt: number
}

export interface AcquireLeaseInput {
  readonly idempotencyKey: string
  readonly uploadId: string
  readonly draftId: string
  readonly semanticHash: string
  readonly shardName: string
  readonly metadata: ProcessImageMetadata
}

export type AcquireLeaseResult =
  | { readonly status: 'COMPLETED'; readonly response: UploadImageResponse }
  | { readonly status: 'LEASED'; readonly ticket: LeaseTicket }

interface IdempotencyRow extends Record<string, SqlStorageValue> {
  idempotency_key: string
  semantic_hash: string
  upload_id: string
  draft_id: string
  metadata_json: string
  status: 'LEASED' | 'COMPLETED'
  ticket_json: string | null
  response_json: string | null
  expires_at: number | null
  updated_at: number
}

interface SidecarPoolRow extends Record<string, SqlStorageValue> {
  node_id: string
  active_load: number
  max_capacity: number
  is_warm: number
  updated_at: number
}

const LEASE_TTL_MS =
  IMAGE_PROCESSING_LIMITS.startupMs +
  IMAGE_PROCESSING_LIMITS.processingMs +
  15_000

const sameDomainMetadata = (
  leftJson: string,
  right: ProcessImageMetadata,
): boolean => {
  try {
    const left = JSON.parse(leftJson) as ProcessImageMetadata
    return (
      left.filename === right.filename &&
      left.mimeType === right.mimeType &&
      left.filesize === right.filesize &&
      JSON.stringify(left.crop ?? null) ===
        JSON.stringify(right.crop ?? null) &&
      JSON.stringify(left.focalPoint ?? null) ===
        JSON.stringify(right.focalPoint ?? null)
    )
  } catch {
    return false
  }
}

export class CoordinatorShardDO extends DurableObject<Env> {
  private readonly sql: SqlStorage
  private readonly binPacker: IBinPacker

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.sql = ctx.storage.sql
    this.binPacker = new FillFirstBinPackerAdapter()
    this.initSchema()
  }

  private initSchema(): void {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS idempotency_records (
        idempotency_key TEXT PRIMARY KEY,
        semantic_hash TEXT NOT NULL,
        upload_id TEXT NOT NULL,
        draft_id TEXT NOT NULL,
        metadata_json TEXT NOT NULL,
        status TEXT NOT NULL,
        ticket_json TEXT,
        response_json TEXT,
        expires_at INTEGER,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_idempotency_semantic_hash
        ON idempotency_records(semantic_hash);
      CREATE INDEX IF NOT EXISTS idx_idempotency_upload_id
        ON idempotency_records(upload_id);
      CREATE TABLE IF NOT EXISTS sidecar_pool (
        node_id TEXT PRIMARY KEY,
        active_load INTEGER NOT NULL,
        max_capacity INTEGER NOT NULL,
        is_warm INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `)
    const now = Date.now()
    for (const nodeId of SHARED_SIDECAR_POOL_NAMES) {
      this.sql.exec(
        `INSERT INTO sidecar_pool (node_id, active_load, max_capacity, is_warm, updated_at)
         VALUES (?, 0, 1, 0, ?)
         ON CONFLICT(node_id) DO NOTHING`,
        nodeId,
        now,
      )
    }
  }

  public async acquireLease(
    input: AcquireLeaseInput,
  ): Promise<AcquireLeaseResult> {
    const now = Date.now()
    this.reconcileExpiredLeases(now)

    const byKey = this.sql
      .exec<IdempotencyRow>(
        'SELECT * FROM idempotency_records WHERE idempotency_key = ?',
        input.idempotencyKey,
      )
      .toArray()
      .at(0)

    if (byKey) {
      if (
        byKey.semantic_hash !== input.semanticHash ||
        !sameDomainMetadata(byKey.metadata_json, input.metadata)
      ) {
        throw new ImageProcessingError(
          'INVALID_INPUT',
          'The idempotency key was already used with different upload parameters.',
        )
      }
      if (byKey.status === 'COMPLETED' && byKey.response_json) {
        return {
          status: 'COMPLETED',
          response: JSON.parse(byKey.response_json) as UploadImageResponse,
        }
      }
      if (
        byKey.status === 'LEASED' &&
        byKey.expires_at !== null &&
        byKey.expires_at > now
      ) {
        throw new ImageProcessingError(
          'PROCESSOR_BUSY',
          'An identical upload is currently in progress. Retry shortly.',
        )
      }
    }

    const byHash = this.sql
      .exec<IdempotencyRow>(
        'SELECT * FROM idempotency_records WHERE semantic_hash = ?',
        input.semanticHash,
      )
      .toArray()
      .at(0)

    if (byHash) {
      if (byHash.status === 'COMPLETED' && byHash.response_json) {
        return {
          status: 'COMPLETED',
          response: JSON.parse(byHash.response_json) as UploadImageResponse,
        }
      }
      if (
        byHash.status === 'LEASED' &&
        byHash.expires_at !== null &&
        byHash.expires_at > now
      ) {
        throw new ImageProcessingError(
          'PROCESSOR_BUSY',
          'An identical upload is currently in progress. Retry shortly.',
        )
      }
    }

    const committed = await this.findCommittedInD1(
      input.metadata,
      input.uploadId,
    )
    if (committed) {
      this.sql.exec(
        `INSERT INTO idempotency_records (
          idempotency_key, semantic_hash, upload_id, draft_id, metadata_json,
          status, ticket_json, response_json, expires_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'COMPLETED', NULL, ?, NULL, ?)
        ON CONFLICT(idempotency_key) DO UPDATE SET
          status = 'COMPLETED',
          ticket_json = NULL,
          response_json = excluded.response_json,
          expires_at = NULL,
          updated_at = excluded.updated_at`,
        input.idempotencyKey,
        input.semanticHash,
        input.uploadId,
        input.draftId,
        JSON.stringify(input.metadata),
        JSON.stringify(committed),
        now,
      )
      return { status: 'COMPLETED', response: committed }
    }

    const poolRows = this.sql
      .exec<SidecarPoolRow>('SELECT * FROM sidecar_pool')
      .toArray()
    const poolNodes: SidecarNodeState[] = poolRows.map((row) => ({
      nodeId: row.node_id,
      activeLoad: row.active_load,
      maxCapacity: row.max_capacity,
      isWarm: row.is_warm === 1,
    }))

    const ranked = this.binPacker.rankNodes(poolNodes, 1)
    const rankedIds = new Set(ranked.map((node) => node.nodeId))
    const fallbackNodes = poolNodes.filter((node) => !rankedIds.has(node.nodeId))
    const candidates = [...ranked, ...fallbackNodes]

    for (const candidate of candidates) {
      const ticket: LeaseTicket = {
        ticketId: crypto.randomUUID(),
        attemptId: crypto.randomUUID(),
        idempotencyKey: input.idempotencyKey,
        uploadId: input.uploadId,
        draftId: input.draftId,
        semanticHash: input.semanticHash,
        shardName: input.shardName,
        sidecarName: candidate.nodeId,
        expiresAt: Date.now() + LEASE_TTL_MS,
      }
      const sidecar = this.env.CONTAINER_SIDECAR.getByName(candidate.nodeId)
      const reservation = await sidecar.tryReserveSlot(ticket, input.metadata)
      const updatedAt = Date.now()
      this.sql.exec(
        `UPDATE sidecar_pool
         SET active_load = ?, is_warm = ?, updated_at = ?
         WHERE node_id = ?`,
        reservation.activeLoad,
        reservation.isWarm ? 1 : 0,
        updatedAt,
        candidate.nodeId,
      )
      if (reservation.reserved) {
        this.sql.exec(
          `INSERT INTO idempotency_records (
            idempotency_key, semantic_hash, upload_id, draft_id, metadata_json,
            status, ticket_json, response_json, expires_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'LEASED', ?, NULL, ?, ?)
          ON CONFLICT(idempotency_key) DO UPDATE SET
            semantic_hash = excluded.semantic_hash,
            upload_id = excluded.upload_id,
            draft_id = excluded.draft_id,
            metadata_json = excluded.metadata_json,
            status = 'LEASED',
            ticket_json = excluded.ticket_json,
            response_json = NULL,
            expires_at = excluded.expires_at,
            updated_at = excluded.updated_at`,
          input.idempotencyKey,
          input.semanticHash,
          input.uploadId,
          input.draftId,
          JSON.stringify(input.metadata),
          JSON.stringify(ticket),
          ticket.expiresAt,
          updatedAt,
        )
        await this.scheduleNextExpiryAlarm()
        return { status: 'LEASED', ticket }
      }
    }

    throw new ImageProcessingError(
      'PROCESSOR_BUSY',
      'All image processing containers are currently busy. Retry shortly.',
    )
  }

  public async completeLease(
    ticketId: string,
    attemptId: string,
    response: UploadImageResponse,
    sidecarWarm = true,
  ): Promise<void> {
    const now = Date.now()
    const row = this.findMatchingLeaseRow(ticketId, attemptId, response.uploadId)
    if (row) {
      const ticket = row.ticket_json
        ? (JSON.parse(row.ticket_json) as LeaseTicket)
        : null
      this.sql.exec(
        `UPDATE idempotency_records
         SET status = 'COMPLETED',
             response_json = ?,
             ticket_json = NULL,
             expires_at = NULL,
             updated_at = ?
         WHERE idempotency_key = ?`,
        JSON.stringify(response),
        now,
        row.idempotency_key,
      )
      if (ticket) {
        this.sql.exec(
          `UPDATE sidecar_pool
           SET active_load = 0, is_warm = ?, updated_at = ?
           WHERE node_id = ?`,
          sidecarWarm ? 1 : 0,
          now,
          ticket.sidecarName,
        )
      }
    }
    await this.scheduleNextExpiryAlarm()
  }

  public async failLease(
    ticketId: string,
    attemptId: string,
    recoveredResponse: UploadImageResponse | null = null,
    sidecarWarm = false,
  ): Promise<void> {
    if (recoveredResponse) {
      await this.completeLease(
        ticketId,
        attemptId,
        recoveredResponse,
        sidecarWarm,
      )
      return
    }
    const now = Date.now()
    const row = this.findMatchingLeaseRow(ticketId, attemptId)
    if (row && row.status === 'LEASED') {
      const ticket = row.ticket_json
        ? (JSON.parse(row.ticket_json) as LeaseTicket)
        : null
      this.sql.exec(
        'DELETE FROM idempotency_records WHERE idempotency_key = ?',
        row.idempotency_key,
      )
      if (ticket) {
        this.sql.exec(
          `UPDATE sidecar_pool
           SET active_load = 0, is_warm = ?, updated_at = ?
           WHERE node_id = ?`,
          sidecarWarm ? 1 : 0,
          now,
          ticket.sidecarName,
        )
      }
    }
    await this.scheduleNextExpiryAlarm()
  }

  override async alarm(): Promise<void> {
    this.reconcileExpiredLeases(Date.now())
    await this.scheduleNextExpiryAlarm()
  }

  private reconcileExpiredLeases(now: number): void {
    const expired = this.sql
      .exec<IdempotencyRow>(
        `SELECT * FROM idempotency_records
         WHERE status = 'LEASED' AND expires_at IS NOT NULL AND expires_at <= ?`,
        now,
      )
      .toArray()

    for (const row of expired) {
      const ticket = row.ticket_json
        ? (JSON.parse(row.ticket_json) as LeaseTicket)
        : null
      this.sql.exec(
        'DELETE FROM idempotency_records WHERE idempotency_key = ?',
        row.idempotency_key,
      )
      if (ticket) {
        this.sql.exec(
          `UPDATE sidecar_pool
           SET active_load = 0, updated_at = ?
           WHERE node_id = ?`,
          now,
          ticket.sidecarName,
        )
      }
    }
  }

  private findMatchingLeaseRow(
    ticketId: string,
    attemptId: string,
    uploadId?: string,
  ): IdempotencyRow | undefined {
    const rows = this.sql
      .exec<IdempotencyRow>('SELECT * FROM idempotency_records')
      .toArray()
    return rows.find((row) => {
      if (row.ticket_json) {
        try {
          const parsed = JSON.parse(row.ticket_json) as LeaseTicket
          if (parsed.ticketId === ticketId && parsed.attemptId === attemptId) {
            return true
          }
        } catch {
          // Ignore malformed JSON
        }
      }
      return uploadId !== undefined && row.upload_id === uploadId
    })
  }

  private async scheduleNextExpiryAlarm(): Promise<void> {
    const nextRow = this.sql
      .exec<{ next_expiry: number | null }>(
        `SELECT MIN(expires_at) AS next_expiry
         FROM idempotency_records
         WHERE status = 'LEASED' AND expires_at IS NOT NULL`,
      )
      .toArray()
      .at(0)
    if (nextRow?.next_expiry !== null && nextRow?.next_expiry !== undefined) {
      await this.ctx.storage.setAlarm(nextRow.next_expiry)
    } else {
      await this.ctx.storage.deleteAlarm()
    }
  }

  private async findCommittedInD1(
    metadata: ProcessImageMetadata,
    uploadId: string,
  ): Promise<UploadImageResponse | null> {
    try {
      const filename = metadata.objectKeys.original.split('/').at(-1)!
      return await findMediaByOriginalFilename(
        this.env.DB,
        filename,
        uploadId,
        validateMediaOrigin(this.env.MEDIA_PUBLIC_BASE_URL),
      )
    } catch {
      throw new ImageProcessingError(
        'PERSISTENCE_FAILED',
        'The upload commit could not be verified.',
      )
    }
  }
}
