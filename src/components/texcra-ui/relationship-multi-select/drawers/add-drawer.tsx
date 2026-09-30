'use client'

import * as React from 'react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { DocumentDrawer } from './document-drawer'
import type { AddDrawerProps, Option } from '../types'
import { generateSlug } from '../utils'

export function AddDrawer({
  open,
  onOpenChange,
  gutterRem = 3,
  title,
  description,
  content,
  onSave,
}: AddDrawerProps) {
  const [addLabel, setAddLabel] = React.useState('')

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen)
    if (!isOpen) {
      setAddLabel('')
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setAddLabel('')
  }

  return (
    <DocumentDrawer
      open={open}
      onOpenChange={handleOpenChange}
      gutterRem={gutterRem}
      title={title}
      description={description}
    >
      {typeof content === 'function' ? (
        content({
          close: handleClose,
          createAndSelect: (option) => {
            onSave(option)
            setAddLabel('')
          },
        })
      ) : content ? (
        content
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const trimmed = addLabel.trim()
            if (!trimmed) return
            const slugValue = generateSlug(trimmed)
            const newOption: Option = {
              value: slugValue,
              label: trimmed,
            }
            onSave(newOption)
            setAddLabel('')
          }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <Label
              htmlFor="add-option-label"
              className="text-sm font-medium text-foreground"
            >
              Name / Title
            </Label>
            <Input
              id="add-option-label"
              value={addLabel}
              onChange={(e) => setAddLabel(e.target.value)}
              placeholder="e.g. Jane Doe"
              autoFocus
              className="h-10 rounded-[3px] bg-transparent border-input text-foreground px-3.5 text-[13px]"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!addLabel.trim()}>
              Create & Select
            </Button>
          </div>
        </form>
      )}
    </DocumentDrawer>
  )
}
