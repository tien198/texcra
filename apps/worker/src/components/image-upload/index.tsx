import { Button } from '#/components/ui/button'
import { UploadCloud } from 'lucide-react'
import { cn } from '#/lib/utils'
import { useImageUpload } from './use-image-upload'

export interface ImageUploadProps {
  label?: string
  value?: string | null // URL of the uploaded image
  onChange?: (value: string | null) => void
  onUpload?: (file: File) => Promise<string> // Optional: override the upload action
}

export function ImageUpload({
  label = 'Hero Image',
  value,
  onChange,
  onUpload,
}: ImageUploadProps) {
  const {
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
  } = useImageUpload({ value, onChange, onUpload })

  return (
    <div className="grid gap-[8px] mb-[26px]">
      <span id="hero-image-label" className="text-sm font-medium">
        {label}
      </span>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {value ? (
        // Preview State (Single Image)
        <div className="relative group overflow-hidden rounded-md border border-border">
          <img
            src={value}
            alt="Hero preview"
            className="w-full h-auto max-h-[300px] object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button variant="secondary" onClick={openFileDialog}>
              Change
            </Button>
            <Button variant="destructive" onClick={handleRemove}>
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
          onClick={() => !isUploading && openFileDialog()}
          className={cn(
            'flex flex-col items-center justify-center min-h-[120px] gap-[10px] border-2 border-dashed px-[18px] py-[16px] rounded-md transition-colors cursor-pointer',
            isDragging
              ? 'border-primary bg-primary/10'
              : 'border-border hover:border-ring/50 hover:bg-accent/50',
            isUploading && 'pointer-events-none opacity-80',
          )}
          role="button"
          tabIndex={0}
          aria-labelledby="hero-image-label"
        >
          {isUploading ? (
            <div className="w-full max-w-xs space-y-2 text-center">
              <span className="text-sm text-muted-foreground">
                Uploading...
              </span>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
              <div className="flex items-center gap-2 text-sm">
                <Button
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
                Single image supported (JPEG, PNG, WebP)
              </span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
