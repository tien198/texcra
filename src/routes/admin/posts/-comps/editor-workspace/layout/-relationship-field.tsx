import { useState } from 'react'
import { RelationshipMultiSelect } from '#/components/texcra-ui/relationship-multi-select'
import type { Option } from '#/components/texcra-ui/relationship-multi-select'

const INITIAL_FIELD_DATA: Record<
  string,
  { options: Option[]; selected: Option[] }
> = {
  Authors: {
    options: [
      { value: 'demo-author', label: 'Demo Author' },
      { value: 'tien', label: 'tien' },
    ],
    selected: [{ value: 'demo-author', label: 'Demo Author' }],
  },
  Categories: {
    options: [
      { value: 'news', label: 'News' },
      { value: 'tutorials', label: 'Tutorials' },
      { value: 'product-updates', label: 'Product Updates' },
    ],
    selected: [],
  },
  'Related Posts': {
    options: [
      {
        value: 'dollar-and-sense',
        label: 'Dollar and sense: The financial forecast',
      },
      { value: 'lexical-guide', label: 'Getting started with Lexical' },
    ],
    selected: [],
  },
}

/** Relationship fields reproduce the admin layout with interactive multi-select. */
export function RelationshipField({
  label = 'Authors',
  initialOptions,
  initialSelected,
}: {
  label: string
  initialOptions?: Option[]
  initialSelected?: Option[]
}) {
  const defaults = INITIAL_FIELD_DATA[label] ?? {
    options: [],
    selected: [],
  }

  const [options, setOptions] = useState<Option[]>(
    initialOptions ?? defaults.options,
  )
  const [selected, setSelected] = useState<Option[]>(
    initialSelected ?? defaults.selected,
  )

  return (
    <RelationshipMultiSelect
      label={label}
      options={options}
      value={selected}
      onChange={setSelected}
      onAddItem={(newItem) => setOptions((prev) => [...prev, newItem])}
      onEditItem={(updated) =>
        setOptions((prev) =>
          prev.map((opt) => (opt.value === updated.value ? updated : opt)),
        )
      }
      placeholder="Select a value"
    />
  )
}
