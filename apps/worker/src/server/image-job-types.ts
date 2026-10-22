import type {
  ProcessImageMetadata,
  ProcessImageResult,
  UploadImageResponse,
} from 'shared/image-processing'

export interface ImageWrite {
  token: string
  size: number
  mimeType: string
}

export interface ImageJob {
  metadata: ProcessImageMetadata
  attemptId: string
  stage: 'processing' | 'persisting' | 'cleanup'
  pending: Partial<Record<string, ImageWrite>>
  written: Partial<Record<string, ImageWrite>>
  result?: ProcessImageResult
  retries: number
}

export interface CompletedImageJob {
  metadata: ProcessImageMetadata
  response: UploadImageResponse
}

/** Synchronous journal operations prevent admission/write-lease races across awaits. */
export interface ImageJobStore {
  getActive: () => ImageJob | undefined
  putActive: (job: ImageJob) => void
  clearActive: () => void
  getCompleted: (uploadId: string) => CompletedImageJob | undefined
  putCompleted: (uploadId: string, completed: CompletedImageJob) => void
}
