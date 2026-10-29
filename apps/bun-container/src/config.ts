import { tmpdir } from 'node:os'
import { IMAGE_METADATA_HEADER } from 'shared/image-processing'
import type { UploadErrorCode } from 'shared/image-processing'

export const APP_CONFIG = {
  server: {
    hostname: '0.0.0.0',
    port: 3001,
    // Same 20 MiB limit as processor.maxInputBytes; keep the two in sync.
    maxRequestBodySize: 20 * 1024 * 1024,
    idleTimeout: 130,
    requestTimeoutSeconds: 130,
    // Same 120 s deadline as processor.processingMs; keep the two in sync.
    processingMs: 120_000,
    retryAfterSeconds: '2',
    metadataHeader: IMAGE_METADATA_HEADER,
  },
  sharp: {
    concurrency: 1,
    cache: {
      memory: 32,
      files: 8,
      items: 32,
    },
    inputOptions: {
      failOn: 'warning' as const,
      // Same 40 megapixel limit as processor.maxInputPixels. Sharp enforces this
      // one, while the error message quotes processor.maxInputPixels; keep in sync
      // (guarded by tests/processor-units.test.ts).
      limitInputPixels: 40_000_000,
      sequentialRead: true,
    },
    internalOptions: {
      failOn: 'warning' as const,
      limitInputPixels: 80_000_000,
      sequentialRead: true,
    },
    tiffOptions: {
      compression: 'none' as const,
      tile: true,
    },
    // Per-encode timeout, aligned with the 120 s processor.processingMs deadline.
    encodeTimeoutSeconds: 120,
  },
  processor: {
    temporaryRoot: tmpdir(),
    temporaryPrefix: 'texcra-image-',
    defaultFocalPoint: { x: 50, y: 50 },
    // Quoted in the "Image exceeds the 20 MiB input limit" error message.
    maxInputBytes: 20 * 1024 * 1024,
    // Quoted in the "Image exceeds the 40 megapixel limit" error message.
    maxInputPixels: 40_000_000,
    // Enforced without a number in the message; same 40 MB as storage.maxOutputBytes.
    maxOutputBytes: 40_000_000,
    // Quoted in the "Image processing exceeded 120 seconds" error message.
    processingMs: 120_000,
  },
  storage: {
    bridgeOrigin: 'http://r2.internal',
    cacheControl: 'public, max-age=31536000, immutable',
    // Same 40 MB as processor.maxOutputBytes; keep the two in sync.
    maxOutputBytes: 40_000_000,
    r2KeyPattern:
      /^media\/[a-f0-9-]+\/[a-f0-9-]+-(?:original|thumbnail|square|small|medium|large|xlarge|og)\.(?:jpg|png|webp|avif)$/,
  },
  errors: {
    statuses: {
      INVALID_INPUT: 400,
      UNSUPPORTED_FORMAT: 415,
      UPLOAD_TOO_LARGE: 413,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      PROCESSOR_BUSY: 503,
      CONTAINER_START_FAILED: 503,
      PROCESSING_TIMEOUT: 504,
      STORAGE_FAILED: 502,
      PERSISTENCE_FAILED: 500,
      INTERNAL_ERROR: 500,
    } satisfies Record<UploadErrorCode, number>,
    retryableCodes: new Set<UploadErrorCode>([
      'PROCESSOR_BUSY',
      'CONTAINER_START_FAILED',
      'PROCESSING_TIMEOUT',
      'STORAGE_FAILED',
      'INTERNAL_ERROR',
    ]),
  },
}
