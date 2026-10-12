import type * as React from 'react'
import type { GroupBase, OptionsOrGroups } from 'react-select'

export type Option = {
  value: string
  label: string
  [key: string]: any
}

/** The loadOptions signature expected by react-select-async-paginate */
export type LoadOptionsFn<TAdditional = { page: number }> = (
  search: string,
  loadedOptions: OptionsOrGroups<Option, GroupBase<Option>>,
  additional?: TAdditional,
) => Promise<{
  options: Option[]
  hasMore?: boolean
  additional?: TAdditional
}>

export interface RelationshipMultiSelectProps<TAdditional = { page: number }> {
  /** Label displayed above the input field */
  label?: string
  /** Available options to select from */
  options?: Option[]
  /** Default or initial options for the async menu */
  defaultOptions?: boolean | Option[]
  /** Current selected options (controlled) */
  value?: Option[]
  /** Alias for value for backwards compatibility */
  selected?: Option[]
  /** Callback fired when selected options change */
  onChange: (value: Option[]) => void
  /** Async load function for paginated options */
  loadOptions: LoadOptionsFn<TAdditional>
  /** Initial additional data for first loadOptions request (default: { page: 1 }) */
  additional?: TAdditional
  /** Placeholder when nothing is selected */
  placeholder?: string
  /** Whether the field is disabled */
  disabled?: boolean
  /** Whether the field is clearable (default: true) */
  isClearable?: boolean
  /** Custom container class */
  className?: string
  /** Debounce delay in ms for search input (default: 300) */
  debounceTimeout?: number
  /** Array of values that, when changed, reset the cached options */
  cacheUniqs?: readonly any[]

  /** Whether to show the external Add (+) button */
  showAddButton?: boolean
  /** Custom gutter width in rem for the cascading drawer (default: 3) */
  drawerGutterRem?: number

  /** Optional custom content or render function for the Add Drawer modal */
  addDrawerContent?: AddDrawerProps['content']
  addDialogContent?: AddDrawerProps['content']
  addDrawerTitle?: string
  addDialogTitle?: string
  addDrawerDescription?: string
  addDialogDescription?: string

  /** Optional custom content or render function for the Edit Drawer modal */
  editDrawerContent?: EditDrawerProps['content']
  editDialogContent?: EditDrawerProps['content']
  editDrawerTitle?: EditDrawerProps['title']
  editDialogTitle?: EditDrawerProps['title']
  editDrawerDescription?: EditDrawerProps['description']
  editDialogDescription?: EditDrawerProps['description']

  /** Callback when an item is created from the Add drawer */
  onAddItem?: (newOption: Option) => void
  /** Callback when an item is edited from the Edit drawer */
  onEditItem?: (updatedOption: Option) => void
}

export interface SelectedBadgeProps {
  item: Option
  disabled?: boolean
  className?: string
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
