import type { DragEvent, ChangeEvent } from 'react'
import { useState, useRef, useCallback, useEffect } from 'react'
import type { CropData, FocalPoint, UploadImageResponse } from 'shared/image-processing'
import { uploadImage } from '#/lib/upload-image'

export interface UseImageUploadOptions {
  value?: string | null
  onChange?: (value: string | null) => void
  onUpload?: (file: File) => Promise<string>
  onComplete?: (result: UploadImageResponse) => void
  crop?: CropData
  focalPoint?: FocalPoint
}

export function useImageUpload({
  value, onChange, onUpload, onComplete, crop, focalPoint,
}: UseImageUploadOptions = {}) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState<UploadImageResponse | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const active = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  // Keep identity for an explicit retry of the same File and processing options.
  const attempt = useRef<{ file: File; options: string; uploadId: string } | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      active.current?.abort()
      active.current = null
    }
  }, [])

  const openFileDialog = useCallback(() => {
    if (!active.current) fileInputRef.current?.click()
  }, [])

  const handleRemove = useCallback(() => {
    active.current?.abort()
    active.current = null
    attempt.current = null
    setIsUploading(false)
    setCompleted(null)
    setError(null)
    onChange?.(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [onChange])

  const processFile = useCallback(async (file: File) => {
    if (active.current) return
    const controller = new AbortController()
    active.current = controller
    setIsUploading(true)
    setError(null)
    try {
      if (onUpload) {
        const url = await onUpload(file)
        if (!mounted.current || controller.signal.aborted) return
        setCompleted(null)
        onChange?.(url)
      } else {
        const options = JSON.stringify({ crop, focalPoint })
        if (attempt.current?.file !== file || attempt.current.options !== options) {
          attempt.current = { file, options, uploadId: crypto.randomUUID() }
        }
        const result = await uploadImage(file, {
          uploadId: attempt.current.uploadId, crop, focalPoint, signal: controller.signal,
        })
        if (!mounted.current || controller.signal.aborted) return
        setCompleted(result)
        onChange?.(result.url)
        onComplete?.(result)
      }
    } catch (cause) {
      if (mounted.current && !controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : 'Failed to upload image.')
      }
    } finally {
      if (active.current === controller) {
        active.current = null
        if (mounted.current) setIsUploading(false)
      }
    }
  }, [onChange, onUpload, onComplete, crop, focalPoint])

  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (!active.current) setIsDragging(true)
  }, [])
  const handleDragLeave = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
  }, [])
  const handleDrop = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
    const file = event.dataTransfer.files.item(0)
    if (file) void processFile(file)
  }, [processFile])
  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void processFile(file)
  }, [processFile])

  return {
    fileInputRef, isDragging, isUploading, error,
    previewUrl: completed && value === completed.url ? completed.variants.large.url : value,
    openFileDialog, handleRemove, handleDragOver, handleDragLeave,
    handleDrop, handleFileChange, processFile,
  }
}
