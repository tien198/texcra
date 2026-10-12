import { useId, useState } from 'react'
import type { ImagePayload } from '#/lexical/core/-editor-data'
import { isWebUrl } from '#/lexical/core/-editor-data'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

export function ImageDialog({
  initial,
  onClose,
  onSubmit,
}: {
  initial?: ImagePayload
  onClose: () => void
  onSubmit: (image: ImagePayload) => void
}) {
  const id = useId()
  const [image, setImage] = useState(
    initial ?? { src: '', alt: '', caption: '' },
  )
  const [error, setError] = useState('')

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit image' : 'Add an image'}</DialogTitle>
          <DialogDescription>
            Give your story a little more context. Alt text helps people and
            search engines understand your image.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            if (!isWebUrl(image.src.trim())) {
              setError(
                'Enter a complete image URL starting with https:// or http://.',
              )
              return
            }
            if (!image.alt.trim()) {
              setError('Add a short description of the image.')
              return
            }
            onSubmit({
              src: image.src.trim(),
              alt: image.alt.trim(),
              caption: image.caption.trim(),
            })
            onClose()
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor={`${id}-src`}>Image URL</Label>
            <Input
              id={`${id}-src`}
              type="url"
              required
              placeholder="https://example.com/image.jpg"
              value={image.src}
              onChange={(event) =>
                setImage({ ...image, src: event.target.value })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-alt`}>
              Alt text <span className="text-muted-foreground">(required)</span>
            </Label>
            <Input
              id={`${id}-alt`}
              required
              placeholder="Describe what is in the image"
              value={image.alt}
              onChange={(event) =>
                setImage({ ...image, alt: event.target.value })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-caption`}>
              Caption <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id={`${id}-caption`}
              placeholder="A little context for your reader"
              value={image.caption}
              onChange={(event) =>
                setImage({ ...image, caption: event.target.value })
              }
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {initial ? 'Save image' : 'Insert image'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
