'use client'

import * as React from 'react'
import type { Option, RelationshipMultiSelectProps } from './types'
import { getSingularLabel } from './utils'
import { useAddDrawer } from './drawers/use-add-drawer'
import { useEditDrawer } from './drawers/use-edit-drawer'

export interface UseRelationshipMultiSelectProps extends RelationshipMultiSelectProps {}

export function useRelationshipMultiSelect({
  label,
  options = [],
  value,
  selected,
  onChange,
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
}: UseRelationshipMultiSelectProps) {
  const selectedItems = (value ?? selected) || []
  const [internalOptions, setInternalOptions] =
    React.useState<Option[]>(options)

  const singularLabel = getSingularLabel(label)
  const labelId = label
    ? `label-${label.replaceAll(' ', '-').toLowerCase()}`
    : undefined

  // Keep internal options in sync with incoming options prop
  React.useEffect(() => {
    setInternalOptions(options)
  }, [options])

  const addDrawer = useAddDrawer({
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
  })

  const editDrawer = useEditDrawer({
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
  })

  return {
    selectedItems,
    internalOptions,
    singularLabel,
    labelId,
    addDrawer,
    editDrawer,
  }
}
