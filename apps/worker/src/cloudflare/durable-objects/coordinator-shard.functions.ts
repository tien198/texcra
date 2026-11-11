import {
  createObjectKeyPlan,
  ImageProcessingError,
} from 'shared/image-processing'
import type {
  ProcessImageMetadata,
  UploadImageResponse,
  UploadMetadata,
} from 'shared/image-processing'
import type { IMediaRepository } from '#/modules/media/domain/ports/media-repository.port'
import type { CoordinatorShardStorage } from './coordinator-shard.storage'
import { LEASE_TTL_MS } from './coordinator-shard.types'
import type {
  AcquireLeaseInput,
  AcquireLeaseResult,
  CoordinatorLeaseDeps,
  LeaseTicket,
} from './coordinator-shard.types'

export function sameDomainMetadata(
  leftJson: string,
  right: UploadMetadata,
): boolean {
  try {
    const left = JSON.parse(leftJson) as UploadMetadata
    return (
      left.filename === right.filename &&
      left.mimeType === right.mimeType &&
      left.filesize === right.filesize &&
      (left.contentHash ?? null) === (right.contentHash ?? null) &&
      JSON.stringify(left.crop ?? null) ===
        JSON.stringify(right.crop ?? null) &&
      JSON.stringify(left.focalPoint ?? null) ===
        JSON.stringify(right.focalPoint ?? null)
    )
  } catch {
    return false
  }
}

export function reconcileExpiredLeases(
  storage: CoordinatorShardStorage,
  now: number,
): void {
  const expired = storage.findExpiredLeases(now)

  for (const row of expired) {
    const ticket = row.ticket_json
      ? (JSON.parse(row.ticket_json) as LeaseTicket)
      : null
    storage.markFailed(row.idempotency_key, now)
    if (ticket) {
      storage.resetPoolNodeLoad(ticket.sidecarName, now)
    }
  }
}

export async function findCommittedInD1(
  mediaRepo: IMediaRepository,
  metadata: ProcessImageMetadata,
  uploadId: string,
): Promise<UploadImageResponse | null> {
  try {
    const filename = metadata.objectKeys.original.split('/').at(-1)!
    return await mediaRepo.findByOriginalFilename(filename, uploadId)
  } catch {
    throw new ImageProcessingError(
      'PERSISTENCE_FAILED',
      'The upload commit could not be verified.',
    )
  }
}

export async function acquireCoordinatorLease(
  deps: CoordinatorLeaseDeps,
  input: AcquireLeaseInput,
): Promise<AcquireLeaseResult> {
  const now = Date.now()
  reconcileExpiredLeases(deps.storage, now)

  let assignedUploadId: string | undefined

  const byKey = deps.storage.findByKey(input.idempotencyKey)

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
    assignedUploadId = byKey.upload_id
  } else {
    const byHashCompleted = deps.storage.findCompletedBySemanticHash(
      input.semanticHash,
    )

    if (byHashCompleted?.response_json) {
      const response = JSON.parse(
        byHashCompleted.response_json,
      ) as UploadImageResponse
      deps.storage.upsertCompletedRecord({
        idempotencyKey: input.idempotencyKey,
        semanticHash: input.semanticHash,
        uploadId: byHashCompleted.upload_id,
        draftId: input.draftId,
        metadataJson: JSON.stringify(input.metadata),
        responseJson: byHashCompleted.response_json,
        now,
      })
      return { status: 'COMPLETED', response }
    }

    const byHashLeased = deps.storage.findActiveLeaseBySemanticHash(
      input.semanticHash,
      now,
    )

    if (byHashLeased) {
      throw new ImageProcessingError(
        'PROCESSOR_BUSY',
        'An identical upload is currently in progress. Retry shortly.',
      )
    }

    assignedUploadId = input.uploadId ?? crypto.randomUUID()
  }

  const uploadId = assignedUploadId
  const processMetadata: ProcessImageMetadata = {
    ...input.metadata,
    uploadId,
    objectKeys: createObjectKeyPlan(uploadId, input.metadata.mimeType),
  }

  const committed = await findCommittedInD1(
    deps.getMediaRepo(),
    processMetadata,
    uploadId,
  )
  if (committed) {
    deps.storage.upsertCompletedRecord({
      idempotencyKey: input.idempotencyKey,
      semanticHash: input.semanticHash,
      uploadId,
      draftId: input.draftId,
      metadataJson: JSON.stringify(input.metadata),
      responseJson: JSON.stringify(committed),
      now,
    })
    return { status: 'COMPLETED', response: committed }
  }

  const poolNodes = deps.storage.listPoolNodes()
  const ranked = deps.binPacker.rankNodes(poolNodes, 1)
  const rankedIds = new Set(ranked.map((node) => node.nodeId))
  const fallbackNodes = poolNodes.filter((node) => !rankedIds.has(node.nodeId))
  const candidates = [...ranked, ...fallbackNodes]

  for (const candidate of candidates) {
    const ticket: LeaseTicket = {
      ticketId: crypto.randomUUID(),
      attemptId: crypto.randomUUID(),
      idempotencyKey: input.idempotencyKey,
      uploadId,
      ...(input.draftId !== undefined ? { draftId: input.draftId } : {}),
      semanticHash: input.semanticHash,
      shardName: input.shardName,
      sidecarName: candidate.nodeId,
      expiresAt: Date.now() + LEASE_TTL_MS,
    }
    const sidecar = deps.sidecarNamespace.getByName(candidate.nodeId)
    const reservation = await sidecar.tryReserveSlot(ticket, processMetadata)
    const updatedAt = Date.now()
    deps.storage.updatePoolNodeLoadAndWarmth(
      candidate.nodeId,
      reservation.activeLoad,
      reservation.isWarm,
      updatedAt,
    )
    if (reservation.reserved) {
      deps.storage.upsertLeasedRecord({
        idempotencyKey: input.idempotencyKey,
        semanticHash: input.semanticHash,
        uploadId,
        draftId: input.draftId,
        metadataJson: JSON.stringify(input.metadata),
        ticket,
        now: updatedAt,
      })
      await deps.scheduleNextExpiryAlarm()
      return { status: 'LEASED', ticket, metadata: processMetadata }
    }
  }

  throw new ImageProcessingError(
    'PROCESSOR_BUSY',
    'All image processing containers are currently busy. Retry shortly.',
  )
}

export async function completeCoordinatorLease(
  deps: CoordinatorLeaseDeps,
  ticketId: string,
  attemptId: string,
  response: UploadImageResponse,
  sidecarWarm = true,
): Promise<void> {
  const now = Date.now()
  const row = deps.storage.findMatchingLeaseRow(
    ticketId,
    attemptId,
    response.uploadId,
  )
  if (row) {
    const ticket = row.ticket_json
      ? (JSON.parse(row.ticket_json) as LeaseTicket)
      : null
    deps.storage.markCompleted(
      row.idempotency_key,
      JSON.stringify(response),
      now,
    )
    if (ticket) {
      deps.storage.resetPoolNodeLoad(ticket.sidecarName, now, sidecarWarm)
    }
  }
  await deps.scheduleNextExpiryAlarm()
}

export async function failCoordinatorLease(
  deps: CoordinatorLeaseDeps,
  ticketId: string,
  attemptId: string,
  recoveredResponse: UploadImageResponse | null = null,
  sidecarWarm = false,
): Promise<void> {
  if (recoveredResponse) {
    await completeCoordinatorLease(
      deps,
      ticketId,
      attemptId,
      recoveredResponse,
      sidecarWarm,
    )
    return
  }
  const now = Date.now()
  const row = deps.storage.findMatchingLeaseRow(ticketId, attemptId)
  if (row && row.status === 'LEASED') {
    const ticket = row.ticket_json
      ? (JSON.parse(row.ticket_json) as LeaseTicket)
      : null
    deps.storage.markFailed(row.idempotency_key, now)
    if (ticket) {
      deps.storage.resetPoolNodeLoad(ticket.sidecarName, now, sidecarWarm)
    }
  }
  await deps.scheduleNextExpiryAlarm()
}
