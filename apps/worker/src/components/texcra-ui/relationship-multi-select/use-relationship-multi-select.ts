'use client'

import * as React from 'react'
import type { Option, RelationshipMultiSelectProps } from './types'
import { getSingularLabel } from './utils'
import { useAddDrawer } from './drawers/use-add-drawer'
import { useEditDrawer } from './drawers/use-edit-drawer'

export interface UseRelationshipMultiSelectProps<
  TAdditional = { page: number },
> extends Partial<RelationshipMultiSelectProps<TAdditional>> {
  onChange?: (value: Option[]) => void
}

export function useRelationshipMultiSelect<TAdditional = { page: number }>({
  label,
  value,
  selected,
  options,
  onChange = () => {},
  addDrawerContent,
  addDialogContent,
  addDrawerTitle,
  addDialogTitle,
  addDrawerDescription,
  addDialogDescription,
  editDrawerContent,
  editDialogContent,
  editDrawerTitle,
  editDialogTitle,
  editDrawerDescription,
  editDialogDescription,
  onAddItem,
  onEditItem,
}: UseRelationshipMultiSelectProps<TAdditional>) {
  const selectedItems = (value ?? selected) || []
  const [internalOptions, setInternalOptions] = React.useState<Option[]>(
    options ?? selectedItems,
  )

  const singularLabel = getSingularLabel(label)
  const labelId = label
    ? `label-${label.replaceAll(' ', '-').toLowerCase()}`
    : undefined

  React.useEffect(() => {
    setInternalOptions((prev) => {
      const map = new Map<string, Option>()
      prev.forEach((opt) => map.set(opt.value, opt))
      if (options) {
        options.forEach((opt) => map.set(opt.value, opt))
      }
      selectedItems.forEach((opt) => map.set(opt.value, opt))
      return Array.from(map.values())
    })
  }, [options, selectedItems])

  const [drawerVersion, setDrawerVersion] = React.useState(0)

  const handleAddItem = React.useCallback(
    (newOption: Option) => {
      setDrawerVersion((v) => v + 1)
      onAddItem?.(newOption)
    },
    [onAddItem],
  )

  const handleEditItem = React.useCallback(
    (updatedOption: Option) => {
      setDrawerVersion((v) => v + 1)
      onEditItem?.(updatedOption)
    },
    [onEditItem],
  )

  const addDrawer = useAddDrawer({
    singularLabel,
    internalOptions,
    setInternalOptions,
    selectedItems,
    onChange,
    onAddItem: handleAddItem,
    addDrawerTitle,
    addDialogTitle,
    addDrawerDescription,
    addDialogDescription,
    addDrawerContent,
    addDialogContent,
  })

  const editDrawer = useEditDrawer({
    singularLabel,
    setInternalOptions,
    selectedItems,
    onChange,
    onEditItem: handleEditItem,
    editDrawerTitle,
    editDialogTitle,
    editDrawerDescription,
    editDialogDescription,
    editDrawerContent,
    editDialogContent,
  })

  return {
    selectedItems,
    internalOptions,
    setInternalOptions,
    singularLabel,
    labelId,
    addDrawer,
    editDrawer,
    drawerVersion,
  }
}
