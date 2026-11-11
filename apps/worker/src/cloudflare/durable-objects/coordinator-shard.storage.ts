import type { SidecarNodeState } from '#/modules/media/domain/ports/bin-packer.port'
import { SHARED_SIDECAR_POOL_NAMES } from './coordinator-shard.types'
import type {
  IdempotencyRow,
  LeaseTicket,
  SidecarPoolRow,
} from './coordinator-shard.types'

export class CoordinatorShardStorage {
  public constructor(private readonly sql: SqlStorage) {}

  public initSchema(
    poolNames: readonly string[] = SHARED_SIDECAR_POOL_NAMES,
    now = Date.now(),
  ): void {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS idempotency_records (
        idempotency_key TEXT PRIMARY KEY,
        semantic_hash TEXT NOT NULL,
        upload_id TEXT NOT NULL,
        draft_id TEXT,
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

    for (const nodeId of poolNames) {
      this.sql.exec(
        `INSERT INTO sidecar_pool (node_id, active_load, max_capacity, is_warm, updated_at)
         VALUES (?, 0, 1, 0, ?)
         ON CONFLICT(node_id) DO NOTHING`,
        nodeId,
        now,
      )
    }
  }

  public findByKey(idempotencyKey: string): IdempotencyRow | undefined {
    return this.sql
      .exec<IdempotencyRow>(
        'SELECT * FROM idempotency_records WHERE idempotency_key = ?',
        idempotencyKey,
      )
      .toArray()
      .at(0)
  }

  public findCompletedBySemanticHash(
    semanticHash: string,
  ): IdempotencyRow | undefined {
    return this.sql
      .exec<IdempotencyRow>(
        `SELECT * FROM idempotency_records
         WHERE semantic_hash = ? AND status = 'COMPLETED'
         ORDER BY updated_at DESC LIMIT 1`,
        semanticHash,
      )
      .toArray()
      .at(0)
  }

  public findActiveLeaseBySemanticHash(
    semanticHash: string,
    now: number,
  ): IdempotencyRow | undefined {
    return this.sql
      .exec<IdempotencyRow>(
        `SELECT * FROM idempotency_records
         WHERE semantic_hash = ? AND status = 'LEASED' AND expires_at IS NOT NULL AND expires_at > ?
         LIMIT 1`,
        semanticHash,
        now,
      )
      .toArray()
      .at(0)
  }

  public findExpiredLeases(now: number): IdempotencyRow[] {
    return this.sql
      .exec<IdempotencyRow>(
        `SELECT * FROM idempotency_records
         WHERE status = 'LEASED' AND expires_at IS NOT NULL AND expires_at <= ?`,
        now,
      )
      .toArray()
  }

  public findMatchingLeaseRow(
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

  public upsertCompletedRecord(params: {
    idempotencyKey: string
    semanticHash: string
    uploadId: string
    draftId?: string
    metadataJson: string
    responseJson: string
    now: number
  }): void {
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
      params.idempotencyKey,
      params.semanticHash,
      params.uploadId,
      params.draftId ?? null,
      params.metadataJson,
      params.responseJson,
      params.now,
    )
  }

  public upsertLeasedRecord(params: {
    idempotencyKey: string
    semanticHash: string
    uploadId: string
    draftId?: string
    metadataJson: string
    ticket: LeaseTicket
    now: number
  }): void {
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
      params.idempotencyKey,
      params.semanticHash,
      params.uploadId,
      params.draftId ?? null,
      params.metadataJson,
      JSON.stringify(params.ticket),
      params.ticket.expiresAt,
      params.now,
    )
  }

  public markCompleted(
    idempotencyKey: string,
    responseJson: string,
    now: number,
  ): void {
    this.sql.exec(
      `UPDATE idempotency_records
       SET status = 'COMPLETED',
           response_json = ?,
           ticket_json = NULL,
           expires_at = NULL,
           updated_at = ?
       WHERE idempotency_key = ?`,
      responseJson,
      now,
      idempotencyKey,
    )
  }

  public markFailed(idempotencyKey: string, now: number): void {
    this.sql.exec(
      `UPDATE idempotency_records
       SET status = 'FAILED',
           ticket_json = NULL,
           expires_at = NULL,
           updated_at = ?
       WHERE idempotency_key = ?`,
      now,
      idempotencyKey,
    )
  }

  public listPoolNodes(): SidecarNodeState[] {
    const poolRows = this.sql
      .exec<SidecarPoolRow>('SELECT * FROM sidecar_pool')
      .toArray()
    return poolRows.map((row) => ({
      nodeId: row.node_id,
      activeLoad: row.active_load,
      maxCapacity: row.max_capacity,
      isWarm: row.is_warm === 1,
    }))
  }

  public updatePoolNodeLoadAndWarmth(
    nodeId: string,
    activeLoad: number,
    isWarm: boolean,
    now: number,
  ): void {
    this.sql.exec(
      `UPDATE sidecar_pool
       SET active_load = ?, is_warm = ?, updated_at = ?
       WHERE node_id = ?`,
      activeLoad,
      isWarm ? 1 : 0,
      now,
      nodeId,
    )
  }

  public resetPoolNodeLoad(
    nodeId: string,
    now: number,
    isWarm?: boolean,
  ): void {
    if (isWarm !== undefined) {
      this.sql.exec(
        `UPDATE sidecar_pool
         SET active_load = 0, is_warm = ?, updated_at = ?
         WHERE node_id = ?`,
        isWarm ? 1 : 0,
        now,
        nodeId,
      )
    } else {
      this.sql.exec(
        `UPDATE sidecar_pool
         SET active_load = 0, updated_at = ?
         WHERE node_id = ?`,
        now,
        nodeId,
      )
    }
  }

  public getNextExpiryTimestamp(): number | null {
    const nextRow = this.sql
      .exec<{ next_expiry: number | null }>(
        `SELECT MIN(expires_at) AS next_expiry
         FROM idempotency_records
         WHERE status = 'LEASED' AND expires_at IS NOT NULL`,
      )
      .toArray()
      .at(0)
    return nextRow?.next_expiry ?? null
  }
}
