import type * as React from 'react'

export type Option = {
  value: string
  label: string
  [key: string]: any
}

export interface RelationshipMultiSelectProps {
  /** Label displayed above the input field (matches Payload style) */
  label?: string
  /** Available options to select from */
  options?: Option[]
  /** Current selected options */
  value?: Option[]
  /** Alias for value for backwards compatibility */
  selected?: Option[]
  /** Callback fired when selected options change */
  onChange: (value: Option[]) => void
  /** Placeholder when nothing is selected */
  placeholder?: string
  /** Whether the field is disabled */
  disabled?: boolean
  /** Custom container class */
  className?: string
  /** Whether to show the external Add (+) button */
  showAddButton?: boolean
  /** Custom gutter width in rem for the cascading drawer (default: 3) */
  drawerGutterRem?: number
  /** Optional custom content or render function for the Add Drawer modal */
  addDrawerContent?:
    | React.ReactNode
    | ((helpers: {
        close: () => void
        createAndSelect: (option: Option) => void
      }) => React.ReactNode)
  /** Alias for addDrawerContent */
  addDialogContent?:
    | React.ReactNode
    | ((helpers: {
        close: () => void
        createAndSelect: (option: Option) => void
      }) => React.ReactNode)
  /** Custom title for Add Drawer */
  addDrawerTitle?: string
  /** Alias for addDrawerTitle */
  addDialogTitle?: string
  /** Custom description for Add Drawer */
  addDrawerDescription?: string
  /** Alias for addDrawerDescription */
  addDialogDescription?: string
  /** Optional custom content or render function for the Edit Drawer modal */
  editDrawerContent?:
    | React.ReactNode
    | ((
        item: Option,
        helpers: {
          close: () => void
          update: (updated: Option) => void
        },
      ) => React.ReactNode)
  /** Alias for editDrawerContent */
  editDialogContent?:
    | React.ReactNode
    | ((
        item: Option,
        helpers: {
          close: () => void
          update: (updated: Option) => void
        },
      ) => React.ReactNode)
  /** Custom title for Edit Drawer */
  editDrawerTitle?: string | ((item: Option) => string)
  /** Alias for editDrawerTitle */
  editDialogTitle?: string | ((item: Option) => string)
  /** Custom description for Edit Drawer */
  editDrawerDescription?: string | ((item: Option) => string)
  /** Alias for editDrawerDescription */
  editDialogDescription?: string | ((item: Option) => string)
  /** Callback when an item is created from the Add drawer */
  onAddItem?: (newOption: Option) => void
  /** Callback when an item is edited from the Edit drawer */
  onEditItem?: (updatedOption: Option) => void
}

export interface SelectedBadgeProps {
  item: Option
  disabled?: boolean
  onStartEdit: (item: Option) => void
  onRemove: (item: Option, event?: React.MouseEvent | React.TouchEvent) => void
}

export interface AddDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gutterRem?: number
  title?: string
  description?: string
  content?:
    | React.ReactNode
    | ((helpers: {
        close: () => void
        createAndSelect: (option: Option) => void
      }) => React.ReactNode)
  onSave: (option: Option) => void
}

export interface EditDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gutterRem?: number
  item: Option | null
  title?: string | ((item: Option) => string)
  description?: string | ((item: Option) => string)
  content?:
    | React.ReactNode
    | ((
        item: Option,
        helpers: {
          close: () => void
          update: (updated: Option) => void
        },
      ) => React.ReactNode)
  onSave: (updatedOption: Option) => void
  singularLabel: string
}
