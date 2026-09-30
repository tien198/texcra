import { useState, useCallback } from 'react'
import { RelationshipMultiSelect } from '#/components/texcra-ui/relationship-multi-select'
import type {
  Option,
  LoadOptionsFn,
} from '#/components/texcra-ui/relationship-multi-select'
import { getRelationshipOptionsServerFn } from '#/server/relationship/get-options'

/** Maps display labels to collection slugs used by the server function */
const COLLECTION_MAP: Record<string, string> = {
  Authors: 'authors',
  Categories: 'categories',
  'Related Posts': 'related-posts',
}

const DEFAULT_SELECTED: Record<string, Option[] | undefined> = {
  Authors: [{ value: 'author-1', label: 'Demo Author' }],
  Categories: [],
  'Related Posts': [],
}

/** Relationship fields with async paginated multi-select. */
export function RelationshipField({
  label = 'Authors',
  initialOptions,
  initialSelected,
}: {
  label: string
  initialOptions?: Option[]
  initialSelected?: Option[]
}) {
  const collection = COLLECTION_MAP[label] ?? label.toLowerCase()

  const [selected, setSelected] = useState<Option[]>(
    initialSelected ?? DEFAULT_SELECTED[label] ?? [],
  )
  const [createdOptions, setCreatedOptions] = useState<Option[]>(
    initialOptions ?? [],
  )
  const [editedOptions, setEditedOptions] = useState<Record<string, Option>>({})

  const handleAddItem = useCallback((newItem: Option) => {
    setCreatedOptions((prev) => {
      if (prev.some((opt) => opt.value === newItem.value)) return prev
      return [newItem, ...prev]
    })
  }, [])

  const handleEditItem = useCallback((updated: Option) => {
    setEditedOptions((prev) => ({
      ...prev,
      [updated.value]: updated,
    }))
    setCreatedOptions((prev) =>
      prev.map((opt) => (opt.value === updated.value ? updated : opt)),
    )
  }, [])

  const loadOptions: LoadOptionsFn = useCallback(
    async (search, _loadedOptions, additional) => {
      const page = additional?.page ?? 1
      try {
        const result = await getRelationshipOptionsServerFn({
          data: {
            collection,
            search,
            page,
            limit: 10,
          },
        })

        // Apply local edits to server-returned options
        const mappedServerOptions = result.options.map(
          (opt) => editedOptions[opt.value] ?? opt,
        )

        let mergedOptions = mappedServerOptions
        if (page === 1 && createdOptions.length > 0) {
          const searchLower = search.trim().toLowerCase()
          const matchingCreated = createdOptions
            .map((opt) => editedOptions[opt.value] ?? opt)
            .filter(
              (opt) =>
                (!searchLower ||
                  opt.label.toLowerCase().includes(searchLower)) &&
                !result.options.some((resOpt) => resOpt.value === opt.value),
            )
          mergedOptions = [...matchingCreated, ...mappedServerOptions]
        }

        return {
          options: mergedOptions,
          hasMore: result.hasMore,
          additional: { page: page + 1 },
        }
      } catch (error) {
        console.error(`Failed to load options for ${collection}:`, error)
        return {
          options: [],
          hasMore: false,
        }
      }
    },
    [collection, createdOptions, editedOptions],
  )

  return (
    <RelationshipMultiSelect
      label={label}
      options={initialOptions}
      value={selected}
      onChange={setSelected}
      loadOptions={loadOptions}
      cacheUniqs={[createdOptions, editedOptions]}
      showAddButton={true}
      onAddItem={handleAddItem}
      onEditItem={handleEditItem}
      placeholder="Select a value"
    />
  )
}
