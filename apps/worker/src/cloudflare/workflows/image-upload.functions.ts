import { ImageProcessingError } from 'shared/image-processing'
import type {
  ProcessImageMetadata,
  ProcessImageResult,
  UploadImageResponse,
} from 'shared/image-processing'
import type { LeaseTicket } from '#/cloudflare/durable-objects/coordinator-shard.types'
import {
  D1MediaRepository,
  MediaUrlResolver,
} from '#/modules/media/infrastructure'
import type {
  ImageUploadWorkflowParams,
  SagaEnvironment,
  WorkflowStepRunner,
} from './image-upload.types'

/**
 * Bước 1: Xác minh tính toàn vẹn của các file trên R2.
 * - Kiểm tra cả file gốc (original) và toàn bộ các biến thể (variants).
 * - Đảm bảo đối tượng tồn tại trong R2 và dung lượng khớp với kết quả xử lý.
 * - Tự động retry tối đa 2 lần với exponential backoff nếu gặp độ trễ ghi R2.
 */
export async function verifyR2Objects(
  step: WorkflowStepRunner,
  env: SagaEnvironment,
  result: ProcessImageResult,
): Promise<void> {
  await step.do(
    'verify-r2-objects',
    {
      retries: {
        limit: 2,
        delay: '1 second',
        backoff: 'exponential',
      },
    },
    async () => {
      const items = [result.original, ...Object.values(result.variants)]
      for (const item of items) {
        const head = await env.MEDIA_BUCKET.head(item.r2Key)
        if (head === null || head.size !== item.filesize) {
          throw new ImageProcessingError(
            'STORAGE_FAILED',
            `Missing or mismatched R2 object: ${item.r2Key}`,
          )
        }
      }
    },
  )
}

/**
 * Bước 2: Lưu trữ vĩnh viễn metadata vào database D1.
 * - Chuẩn hóa và xác thực URL public từ MEDIA_PUBLIC_BASE_URL.
 * - Ghi nhận bản ghi media vào D1 (có cơ chế idempotency bảo vệ xung đột file).
 * - Trả về dữ liệu UploadImageResponse đã commit.
 * - Tự động retry tối đa 3 lần với exponential backoff khi D1 bận.
 */
export async function persistD1Metadata(
  step: WorkflowStepRunner,
  env: SagaEnvironment,
  result: ProcessImageResult,
): Promise<UploadImageResponse> {
  return await step.do(
    'persist-d1-metadata',
    {
      retries: {
        limit: 3,
        delay: '1 second',
        backoff: 'exponential',
      },
    },
    async () => {
      const publicBase = MediaUrlResolver.validateOrigin(
        env.MEDIA_PUBLIC_BASE_URL,
      )
      const mediaRepo = D1MediaRepository.getInstance(env.DB, publicBase)
      return await mediaRepo.persist(result)
    },
  )
}

/**
 * Bước 3: Hoàn tất Lease và ghi nhận Idempotency.
 * - Giải phóng slot xử lý trên container sidecar để nhận việc mới (lấy trạng thái isWarm).
 * - Đánh dấu hoàn tất lease trên Coordinator Shard và lưu response vào cache idempotency.
 * - Tự động retry tối đa 3 lần với exponential backoff.
 */
export async function finalizeLeaseAndIdempotency(
  step: WorkflowStepRunner,
  env: SagaEnvironment,
  ticket: LeaseTicket,
  response: UploadImageResponse,
): Promise<void> {
  await step.do(
    'finalize-lease-and-idempotency',
    {
      retries: {
        limit: 3,
        delay: '1 second',
        backoff: 'exponential',
      },
    },
    async () => {
      // 1. Giải phóng slot xử lý của container sidecar
      const sidecar = env.CONTAINER_SIDECAR.getByName(ticket.sidecarName)
      const { isWarm } = await sidecar.releaseSlot(ticket.attemptId)

      // 2. Báo cho Coordinator Shard hoàn tất lease và lưu kết quả cho các request trùng lặp
      const shard = env.COORDINATOR_SHARD.getByName(ticket.shardName)
      await shard.completeLease(
        ticket.ticketId,
        ticket.attemptId,
        response,
        isWarm,
      )
    },
  )
}

/**
 * Bước bồi hoàn (Saga Compensation): Dọn dẹp R2 và giải phóng lease khi thất bại.
 * - Chạy khi bất kỳ bước nào trong quy trình chính (1, 2, 3) bị lỗi.
 * - Kiểm tra xem bản ghi đã kịp commit vào D1 chưa:
 *   + Nếu CHƯA commit: Xóa toàn bộ file gốc và biến thể trên R2 để tránh rò rỉ bộ nhớ (leak objects).
 *   + Nếu ĐÃ commit: Giữ lại file vì dữ liệu DB đã tồn tại.
 * - Giải phóng slot trên container sidecar.
 * - Đánh dấu thất bại (failLease) trên Coordinator Shard.
 * - Tự động retry tối đa 3 lần với exponential backoff.
 */
export async function compensateR2AndReleaseLease(
  step: WorkflowStepRunner,
  env: SagaEnvironment,
  ticket: LeaseTicket,
  metadata: ProcessImageMetadata,
): Promise<void> {
  await step.do(
    'compensate-r2-and-release-lease',
    {
      retries: {
        limit: 3,
        delay: '1 second',
        backoff: 'exponential',
      },
    },
    async () => {
      const originalFilename = metadata.objectKeys.original.split('/').at(-1)!
      const publicBase = MediaUrlResolver.validateOrigin(
        env.MEDIA_PUBLIC_BASE_URL,
      )
      const mediaRepo = D1MediaRepository.getInstance(env.DB, publicBase)
      const committed = await mediaRepo
        .findByOriginalFilename(originalFilename, metadata.uploadId)
        .catch(() => null)

      // Nếu dữ liệu chưa được commit vào database, dọn sạch các file mồ côi trên R2
      if (!committed) {
        await env.MEDIA_BUCKET.delete([
          metadata.objectKeys.original,
          ...Object.values(metadata.objectKeys.variants),
        ])
      }

      // Giải phóng slot của container và đánh dấu thất bại cho ticket trên Coordinator Shard
      const sidecar = env.CONTAINER_SIDECAR.getByName(ticket.sidecarName)
      const { isWarm } = await sidecar.releaseSlot(ticket.attemptId)
      const shard = env.COORDINATOR_SHARD.getByName(ticket.shardName)
      await shard.failLease(
        ticket.ticketId,
        ticket.attemptId,
        committed,
        isWarm,
      )
    },
  )
}

/**
 * Điều phối chu trình Saga (Orchestration Saga) cho quy trình upload ảnh.
 * Bao gồm 3 bước thực thi chính và 1 bước bồi hoàn (compensation) xử lý lỗi:
 * 1. verify-r2-objects: Kiểm tra tính toàn vẹn của các file trên Cloudflare R2
 * 2. persist-d1-metadata: Lưu metadata ảnh vào cơ sở dữ liệu Cloudflare D1
 * 3. finalize-lease-and-idempotency: Giải phóng slot container và lưu idempotency cache
 * Catch (Compensation): Dọn dẹp file R2 mồ côi và đánh dấu fail lease nếu xảy ra lỗi
 */
export async function executeSagaSteps(
  env: SagaEnvironment,
  payload: ImageUploadWorkflowParams,
  step: WorkflowStepRunner,
): Promise<UploadImageResponse> {
  const { ticket, metadata, result } = payload

  try {
    // =========================================================================
    // Bước 1: Xác minh tính toàn vẹn của các file trên R2
    // - Kiểm tra cả file gốc (original) và toàn bộ các biến thể (variants).
    // - Đảm bảo đối tượng tồn tại trong R2 và dung lượng khớp với kết quả xử lý.
    // - Tự động retry tối đa 2 lần với exponential backoff nếu gặp độ trễ ghi R2.
    // =========================================================================
    await verifyR2Objects(step, env, result)

    // =========================================================================
    // Bước 2: Lưu trữ vĩnh viễn metadata vào database D1
    // - Chuẩn hóa và xác thực URL public từ MEDIA_PUBLIC_BASE_URL.
    // - Ghi nhận bản ghi media vào D1 (có cơ chế idempotency bảo vệ xung đột file).
    // - Trả về dữ liệu UploadImageResponse đã commit.
    // - Tự động retry tối đa 3 lần với exponential backoff khi D1 bận.
    // =========================================================================
    const response = await persistD1Metadata(step, env, result)

    // =========================================================================
    // Bước 3: Hoàn tất Lease và ghi nhận Idempotency
    // - Giải phóng slot xử lý trên container sidecar để nhận việc mới (lấy trạng thái isWarm).
    // - Đánh dấu hoàn tất lease trên Coordinator Shard và lưu response vào cache idempotency.
    // - Tự động retry tối đa 3 lần với exponential backoff.
    // =========================================================================
    await finalizeLeaseAndIdempotency(step, env, ticket, response)

    return response
  } catch (error) {
    // =========================================================================
    // Bước bồi hoàn (Saga Compensation): Dọn dẹp R2 và giải phóng lease khi thất bại
    // - Chạy khi bất kỳ bước nào trong quy trình chính (1, 2, 3) bị lỗi.
    // - Kiểm tra xem bản ghi đã kịp commit vào D1 chưa:
    //   + Nếu CHƯA commit: Xóa toàn bộ file gốc và biến thể trên R2 để tránh rò rỉ bộ nhớ (leak objects).
    //   + Nếu ĐÃ commit: Giữ lại file vì dữ liệu DB đã tồn tại.
    // - Giải phóng slot trên container sidecar.
    // - Đánh dấu thất bại (failLease) trên Coordinator Shard.
    // - Tự động retry tối đa 3 lần với exponential backoff.
    // =========================================================================
    await compensateR2AndReleaseLease(step, env, ticket, metadata)
    throw error
  }
}
