import { Button } from '#/components/ui/button'
import { LoaderCircle, UploadCloud } from 'lucide-react'
import { useId } from 'react'
import { cn } from '#/lib/utils'
import { useImageUpload } from './use-image-upload'
import type { UseImageUploadOptions } from './use-image-upload'

export interface ImageUploadProps extends UseImageUploadOptions {
  label?: string
}

export function ImageUpload({
  label = 'Hero Image',
  value,
  onChange,
  onUpload,
  onComplete,
  crop,
  focalPoint,
}: ImageUploadProps) {
  const labelId = useId()
  const {
    fileInputRef,
    isDragging,
    isUploading,
    error,
    previewUrl,
    openFileDialog,
    handleRemove,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileChange,
  } = useImageUpload({ value, onChange, onUpload, onComplete, crop, focalPoint })

  return (
    <div className="grid gap-[8px] mb-[26px]">
      <span id={labelId} className="text-sm font-medium">
        {label}
      </span>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp,image/avif"
        disabled={isUploading}
        className="hidden"
      />

      {isUploading ? (
        <div role="status" aria-live="polite" className="flex min-h-[120px] items-center justify-center gap-2 rounded-md border border-border text-sm text-muted-foreground">
          <LoaderCircle aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />
          Uploading and processing image…
        </div>
      ) : previewUrl ? (
        // Preview State (Single Image)
        <div className="relative group overflow-hidden rounded-md border border-border">
          <img
            src={previewUrl}
            alt="Hero preview"
            className="w-full h-auto max-h-[300px] object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button type="button" variant="secondary" onClick={openFileDialog}>
              Change
            </Button>
            <Button type="button" variant="destructive" onClick={handleRemove}>
              Remove
            </Button>
          </div>
        </div>
      ) : (
        // Dropzone State
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFileDialog}
          className={cn(
            'flex flex-col items-center justify-center min-h-[120px] gap-[10px] border-2 border-dashed px-[18px] py-[16px] rounded-md transition-colors cursor-pointer',
            isDragging
              ? 'border-primary bg-primary/10'
              : 'border-border hover:border-ring/50 hover:bg-accent/50',
          )}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault()
              openFileDialog()
            }
          }}
          aria-labelledby={labelId}
        >
            <>
              <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
              <div className="flex items-center gap-2 text-sm">
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    openFileDialog()
                  }}
                >
                  Choose a file
                </Button>
                <span className="text-muted-foreground">or drag and drop</span>
              </div>
              <span className="text-xs text-muted-foreground mt-1">
                Single image supported (JPEG, PNG, WebP, AVIF)
              </span>
            </>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
