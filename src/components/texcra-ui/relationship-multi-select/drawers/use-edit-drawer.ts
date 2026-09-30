'use client'

import * as React from 'react'
import type { Option, EditDrawerProps } from '../types'

export interface UseEditDrawerProps {
  singularLabel: string
  setInternalOptions: React.Dispatch<React.SetStateAction<Option[]>>
  selectedItems: Option[]
  onChange: (value: Option[]) => void
  onEditItem?: (updatedOption: Option) => void
  editDrawerTitle?: EditDrawerProps['title']
  editDialogTitle?: EditDrawerProps['title']
  editDrawerDescription?: EditDrawerProps['description']
  editDialogDescription?: EditDrawerProps['description']
  editDrawerContent?: EditDrawerProps['content']
  editDialogContent?: EditDrawerProps['content']
}

export function useEditDrawer({
  singularLabel,
  setInternalOptions,
  selectedItems,
  onChange,
  onEditItem,
  editDrawerTitle,
  editDialogTitle,
  editDrawerDescription,
  editDialogDescription,
  editDrawerContent,
  editDialogContent,
}: UseEditDrawerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [editingItem, setEditingItem] = React.useState<Option | null>(null)

  const resolvedContent = editDrawerContent ?? editDialogContent
  const resolvedTitle =
    editDrawerTitle ?? editDialogTitle ?? `Edit ${singularLabel}`
  const resolvedDescription =
    editDrawerDescription ??
    editDialogDescription ??
    `Modify details for this ${singularLabel.toLowerCase()}.`

  const openEdit = React.useCallback((item: Option) => {
    setEditingItem(item)
    setIsOpen(true)
  }, [])

  const closeEdit = React.useCallback(() => {
    setIsOpen(false)
    setTimeout(() => {
      setEditingItem(null)
    }, 200)
  }, [])

  const handleOpenChange = React.useCallback((open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setTimeout(() => {
        setEditingItem(null)
      }, 200)
    }
  }, [])

  const handleSave = React.useCallback(
    (updatedOption: Option) => {
      setInternalOptions((prev) =>
        prev.map((opt) =>
          opt.value === updatedOption.value ? updatedOption : opt,
        ),
      )
      onEditItem?.(updatedOption)
      onChange(
        selectedItems.map((item) =>
          item.value === updatedOption.value ? updatedOption : item,
        ),
      )
      setIsOpen(false)
      setTimeout(() => {
        setEditingItem(null)
      }, 200)
    },
    [selectedItems, onChange, onEditItem, setInternalOptions],
  )

  return {
    isOpen,
    setIsOpen,
    editingItem,
    setEditingItem,
    openEdit,
    closeEdit,
    handleOpenChange,
    resolvedContent,
    resolvedTitle,
    resolvedDescription,
    handleSave,
  }
}
