'use client'

import * as React from 'react'
import type { Option, AddDrawerProps } from '../types'

export interface UseAddDrawerProps {
  singularLabel: string
  internalOptions: Option[]
  setInternalOptions: React.Dispatch<React.SetStateAction<Option[]>>
  selectedItems: Option[]
  onChange: (value: Option[]) => void
  onAddItem?: (newOption: Option) => void
  addDrawerTitle?: string
  addDialogTitle?: string
  addDrawerDescription?: string
  addDialogDescription?: string
  addDrawerContent?: AddDrawerProps['content']
  addDialogContent?: AddDrawerProps['content']
}

export function useAddDrawer({
  singularLabel,
  internalOptions,
  setInternalOptions,
  selectedItems,
  onChange,
  onAddItem,
  addDrawerTitle,
  addDialogTitle,
  addDrawerDescription,
  addDialogDescription,
  addDrawerContent,
  addDialogContent,
}: UseAddDrawerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const resolvedContent = addDrawerContent ?? addDialogContent
  const resolvedTitle =
    addDrawerTitle ?? addDialogTitle ?? `Add New ${singularLabel}`
  const resolvedDescription =
    addDrawerDescription ??
    addDialogDescription ??
    `Create a new ${singularLabel.toLowerCase()} and add it to the selection.`

  const openAdd = React.useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeAdd = React.useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleSave = React.useCallback(
    (newOption: Option) => {
      let finalOption = newOption
      if (
        internalOptions.some(
          (opt) =>
            opt.value === newOption.value && opt.label !== newOption.label,
        )
      ) {
        finalOption = {
          ...newOption,
          value: `${newOption.value}-${Date.now()}`,
        }
      }

      if (!internalOptions.some((opt) => opt.value === finalOption.value)) {
        setInternalOptions((prev) => [...prev, finalOption])
      }
      onAddItem?.(finalOption)
      if (!selectedItems.some((item) => item.value === finalOption.value)) {
        onChange([...selectedItems, finalOption])
      }
      setIsOpen(false)
    },
    [internalOptions, selectedItems, onChange, onAddItem, setInternalOptions],
  )

  return {
    isOpen,
    setIsOpen,
    openAdd,
    closeAdd,
    resolvedContent,
    resolvedTitle,
    resolvedDescription,
    handleSave,
  }
}
