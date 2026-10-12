'use client'

import * as React from 'react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { DocumentDrawer } from './document-drawer'
import type { EditDrawerProps } from '../types'

export function EditDrawer({
  open,
  onOpenChange,
  gutterRem = 3,
  item,
  title,
  description,
  content,
  onSave,
  singularLabel,
}: EditDrawerProps) {
  const [editLabel, setEditLabel] = React.useState(item?.label ?? '')

  React.useEffect(() => {
    if (item) {
      setEditLabel(item.label)
    }
  }, [item])

  const resolvedTitle =
    typeof title === 'function'
      ? item
        ? title(item)
        : `Edit ${singularLabel}`
      : (title ?? `Edit ${singularLabel}`)

  const resolvedDescription =
    typeof description === 'function'
      ? item
        ? description(item)
        : `Modify details for this ${singularLabel.toLowerCase()}.`
      : (description ??
        `Modify details for this ${singularLabel.toLowerCase()}.`)

  const handleClose = () => {
    onOpenChange(false)
  }

  return (
    <DocumentDrawer
      open={open}
      onOpenChange={onOpenChange}
      gutterRem={gutterRem}
      title={resolvedTitle}
      description={resolvedDescription}
    >
      {item &&
        (typeof content === 'function' ? (
          content(item, {
            close: handleClose,
            update: onSave,
          })
        ) : content ? (
          content
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!editLabel.trim()) return
              onSave({
                ...item,
                label: editLabel.trim(),
              })
            }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label
                htmlFor="edit-option-label"
                className="text-sm font-medium text-foreground"
              >
                Name / Title
              </Label>
              <Input
                id="edit-option-label"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                placeholder="Enter name..."
                autoFocus
                className="h-10 rounded-[3px] bg-transparent border-input text-foreground px-3.5 text-[13px]"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!editLabel.trim()}>
                Save Changes
              </Button>
            </div>
          </form>
        ))}
    </DocumentDrawer>
  )
}
