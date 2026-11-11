import type { ChangeEvent, DragEvent, RefObject } from 'react'
import type {
  CropData,
  FocalPoint,
  UploadImageResponse,
} from 'shared/image-processing'

export interface UploadImageOptions {
  /** Transport-level idempotency key generated on CSR; defaults to randomUUID(). */
  idempotencyKey?: string
  /** Reuse only when retrying the same file and processing options. */
  uploadId?: string
  /** Domain-level draft identifier for RFC 8785 semantic idempotency. */
  draft_id?: string
  /** Precomputed SHA-256 content digest (lowercase 64 hex chars). If omitted, computed automatically from file. */
  contentHash?: string
  crop?: CropData
  focalPoint?: FocalPoint
  signal?: AbortSignal
}

export interface UploadAttempt {
  file: File
  options: string
  idempotencyKey: string
}

export interface UseImageUploadOptions {
  value?: string | null
  onChange?: (value: string | null) => void
  onUpload?: (file: File) => Promise<string>
  onComplete?: (result: UploadImageResponse) => void
  crop?: CropData
  focalPoint?: FocalPoint
}

export interface UseImageUploadReturn {
  fileInputRef: RefObject<HTMLInputElement | null>
  isDragging: boolean
  isUploading: boolean
  error: string | null
  previewUrl: string | null | undefined
  openFileDialog: () => void
  handleRemove: () => void
  handleDragOver: (event: DragEvent) => void
  handleDragLeave: (event: DragEvent) => void
  handleDrop: (event: DragEvent) => void
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  processFile: (file: File) => Promise<void>
}

export interface ImageUploadProps extends UseImageUploadOptions {
  label?: string
}
