'use client'

import React from 'react'
import Select, { components } from 'react-select'
import type {
  MultiValueProps,
  DropdownIndicatorProps,
  ClearIndicatorProps,
} from 'react-select'
import { ChevronDown, Plus, X } from 'lucide-react'
import { cn } from '#/lib/utils'
import type { RelationshipMultiSelectProps, Option } from './types'
import { useRelationshipMultiSelect } from './use-relationship-multi-select'
import { SelectedBadge } from './components/selected-badge'
import { AddDrawer } from './drawers/add-drawer'
import { EditDrawer } from './drawers/edit-drawer'

const DropdownIndicator = (props: DropdownIndicatorProps<Option, true>) => {
  return (
    <components.DropdownIndicator {...props}>
      <ChevronDown
        className={cn(
          'h-4 w-4 transition-transform duration-200',
          props.selectProps.menuIsOpen && 'rotate-180',
        )}
      />
    </components.DropdownIndicator>
  )
}

const ClearIndicator = (props: ClearIndicatorProps<Option, true>) => {
  return (
    <components.ClearIndicator {...props}>
      <X className="h-3.5 w-3.5" />
    </components.ClearIndicator>
  )
}

export function RelationshipMultiSelect(props: RelationshipMultiSelectProps) {
  const {
    label,
    placeholder = 'Select a value',
    disabled = false,
    className,
    showAddButton = true,
    drawerGutterRem = 3,
    onChange,
  } = props

  const {
    selectedItems,
    internalOptions,
    singularLabel,
    labelId,
    addDrawer,
    editDrawer,
  } = useRelationshipMultiSelect(props)

  const selectComponents = React.useMemo(
    () => ({
      MultiValue: (multiValueProps: MultiValueProps<Option, true>) => (
        <SelectedBadge
          item={multiValueProps.data}
          disabled={multiValueProps.isDisabled}
          onStartEdit={editDrawer.openEdit}
          onRemove={(_, e) => {
            if (e) {
              multiValueProps.removeProps.onClick?.(e as any)
            } else {
              multiValueProps.removeProps.onClick?.({
                stopPropagation: () => {},
                preventDefault: () => {},
              } as any)
            }
          }}
        />
      ),
      DropdownIndicator,
      ClearIndicator,
      IndicatorSeparator: () => null,
    }),
    [editDrawer.openEdit],
  )

  return (
    <div className={cn('grid gap-2', className)}>
      {label && (
        <span
          id={labelId}
          className="text-sm font-medium text-foreground select-none"
        >
          {label}
        </span>
      )}

      {/* Main unified container */}
      <div
        className={cn(
          'relative flex min-h-[40px] w-full min-w-0 items-stretch rounded-[3px] border border-input bg-transparent transition-colors',
          'focus-within:border-ring focus-within:ring-1 focus-within:ring-ring',
          disabled && 'cursor-not-allowed opacity-50 pointer-events-none',
        )}
      >
        <Select
          isMulti
          isDisabled={disabled}
          options={internalOptions}
          value={selectedItems}
          onChange={(newVal) => onChange(newVal as Option[])}
          placeholder={placeholder}
          aria-labelledby={labelId}
          unstyled
          className="flex-1 min-w-0"
          components={selectComponents}
          classNames={{
            control: () =>
              'flex w-full items-center justify-between px-2.5 py-1.5 bg-transparent border-0 outline-none',
            menu: () =>
              'absolute mt-1 z-50 w-full rounded-[3px] border border-border bg-popover text-popover-foreground shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95',
            menuList: () => 'max-h-60 overflow-y-auto p-1 text-sm outline-none',
            option: (state) =>
              cn(
                'relative flex cursor-pointer items-center rounded-[3px] px-3 py-2 text-sm select-none outline-none transition-colors',
                state.isFocused
                  ? 'bg-accent text-accent-foreground'
                  : 'text-popover-foreground',
                state.isSelected &&
                  'bg-accent text-accent-foreground font-medium',
              ),
            valueContainer: () => 'flex flex-wrap gap-1.5',
            input: () =>
              'text-sm text-foreground placeholder:text-muted-foreground',
            placeholder: () => 'text-muted-foreground text-sm',
            indicatorsContainer: () =>
              'flex items-center gap-1 text-muted-foreground',
            clearIndicator: () =>
              'p-1 rounded hover:text-foreground hover:bg-accent transition-colors',
            dropdownIndicator: () =>
              'p-1 rounded hover:text-foreground hover:bg-accent transition-colors',
            noOptionsMessage: () =>
              'py-3 px-3 text-center text-xs text-muted-foreground',
          }}
        />

        {/* Attached External Add Button */}
        {showAddButton && (
          <button
            type="button"
            disabled={disabled}
            aria-label={`Add new ${singularLabel.toLowerCase()}`}
            onClick={(e) => {
              e.stopPropagation()
              addDrawer.openAdd()
            }}
            className="flex w-[40px] shrink-0 items-center justify-center border-l border-input bg-transparent text-foreground hover:bg-muted/50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            title={`Add new ${singularLabel.toLowerCase()}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Add Document Drawer */}
      <AddDrawer
        open={addDrawer.isOpen}
        onOpenChange={addDrawer.setIsOpen}
        gutterRem={drawerGutterRem}
        title={addDrawer.resolvedTitle}
        description={addDrawer.resolvedDescription}
        content={addDrawer.resolvedContent}
        onSave={addDrawer.handleSave}
      />

      {/* Edit Document Drawer */}
      <EditDrawer
        open={editDrawer.isOpen}
        onOpenChange={editDrawer.handleOpenChange}
        gutterRem={drawerGutterRem}
        item={editDrawer.editingItem}
        title={editDrawer.resolvedTitle}
        description={editDrawer.resolvedDescription}
        content={editDrawer.resolvedContent}
        onSave={editDrawer.handleSave}
        singularLabel={singularLabel}
      />
    </div>
  )
}
