export function getSingularLabel(label?: string): string {
  if (!label) return 'Option'
  const trimmed = label.trim()
  if (trimmed.toLowerCase() === 'categories') return 'Category'
  if (trimmed.toLowerCase().endsWith('s')) return trimmed.slice(0, -1)
  return trimmed
}

export function generateSlug(label: string): string {
  const trimmed = label.trim()
  return (
    trimmed
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || `item-${Date.now()}`
  )
}
