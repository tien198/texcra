export const IMAGE_METADATA_HEADER = 'x-image-metadata'

export const IMAGE_PROCESSING_LIMITS = {
  maxInputBytes: 20 * 1024 * 1024,
  maxInputPixels: 40_000_000,
  maxMetadataBytes: 4096,
  startupMs: 30_000,
  processingMs: 120_000,
  inactivityMs: 300_000,
  maxOutputBytes: 40_000_000,
} as const
