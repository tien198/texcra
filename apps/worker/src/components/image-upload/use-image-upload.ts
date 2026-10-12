import type { DragEvent, ChangeEvent } from 'react'
import { useState, useRef, useCallback } from 'react'
import { uploadImageServerFn } from '#/server/upload.functions'

export interface UseImageUploadOptions {
  value?: string | null
  onChange?: (value: string | null) => void
  onUpload?: (file: File) => Promise<string>
}

export function useImageUpload({
  onChange,
  onUpload,
}: UseImageUploadOptions = {}) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleRemove = useCallback(() => {
    onChange?.(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [onChange])

  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file.')
        return
      }

      setIsUploading(true)
      setProgress(0)

      // Simulate progress updates while upload is in progress
      const interval = setInterval(() => {
        setProgress((prev) => {
          const next = prev + 15
          return next >= 90 ? 90 : next
        })
      }, 120)

      try {
        let finalUrl: string
        if (onUpload) {
          finalUrl = await onUpload(file)
        } else {
          const formData = new FormData()
          formData.append('file', file)
          finalUrl = await uploadImageServerFn({ data: formData })
        }
        clearInterval(interval)
        setProgress(100)
        onChange?.(finalUrl)
      } catch (error) {
        clearInterval(interval)
        console.error('Upload failed', error)
        alert('Failed to upload image.')
      } finally {
        clearInterval(interval)
        setTimeout(() => {
          setIsUploading(false)
          setProgress(0)
        }, 300)
      }
    },
    [onChange, onUpload],
  )

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      // Support single file only
      const files = e.dataTransfer.files
      if (files.length > 0) {
        processFile(files[0])
      }
    },
    [processFile],
  )

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        processFile(file)
      }
    },
    [processFile],
  )

  return {
    fileInputRef,
    isDragging,
    isUploading,
    progress,
    openFileDialog,
    handleRemove,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileChange,
    processFile,
  }
}
