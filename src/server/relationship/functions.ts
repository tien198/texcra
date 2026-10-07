import { createServerFn } from '@tanstack/react-start'
import { COLLECTIONS } from './queries.ts'
import type {
  RelationshipOptionsRequest,
  RelationshipOptionsResponse,
} from './types.ts'

export const getRelationshipOptionsServerFn = createServerFn({
  method: 'GET',
  strict: { output: false },
})
  .validator((data: RelationshipOptionsRequest) => {
    if (!data.collection) {
      throw new Error('Collection is required')
    }
    return {
      collection: String(data.collection).trim().toLowerCase(),
      search: typeof data.search === 'string' ? data.search.trim() : '',
      page: Math.max(1, Number(data.page) || 1),
      limit: Math.min(50, Math.max(1, Number(data.limit) || 10)),
    }
  })
  .handler(async ({ data }): Promise<RelationshipOptionsResponse> => {
    // Simulate server-side processing delay to fetch paginated options
    // await new Promise((resolve) => setTimeout(resolve, 800))

    const slug = data.collection.replace(/[\s_]+/g, '-')
    const allOptions =
      COLLECTIONS[slug] ??
      COLLECTIONS[data.collection] ??
      COLLECTIONS[slug.replace(/-/g, ' ')]

    if (!allOptions) {
      return {
        options: [],
        hasMore: false,
      }
    }

    // Filter by search term (case-insensitive partial match on label)
    const filtered = data.search
      ? allOptions.filter((opt) =>
          opt.label.toLowerCase().includes(data.search.toLowerCase()),
        )
      : allOptions

    // Paginate
    const start = (data.page - 1) * data.limit
    const end = start + data.limit
    const paginatedOptions = filtered.slice(start, end)

    return {
      options: paginatedOptions,
      hasMore: end < filtered.length,
    }
  })
