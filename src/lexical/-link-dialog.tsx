import { useId, useState } from 'react'
import { isLinkUrl } from '#/lexical/core/-editor-data'
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

export function LinkDialog({
  initial,
  onClose,
  onSubmit,
}: {
  initial: string
  onClose: () => void
  onSubmit: (url: string | null) => void
}) {
  const id = useId()
  const [url, setUrl] = useState(initial)
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
          <DialogTitle>{initial ? 'Edit link' : 'Add a link'}</DialogTitle>
          <DialogDescription>
            Link the selected words to a helpful page or email address.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            if (!isLinkUrl(url.trim())) {
              setError('Use an https://, http://, or mailto: URL.')
              return
            }
            onSubmit(url.trim())
            onClose()
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor={id}>Link URL</Label>
            <Input
              id={id}
              value={url}
              placeholder="https://example.com"
              required
              onChange={(event) => setUrl(event.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            {initial && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  onSubmit(null)
                  onClose()
                }}
              >
                Remove link
              </Button>
            )}
            <Button type="submit">
              {initial ? 'Update link' : 'Add link'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
