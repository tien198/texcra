import type { Option } from '#/components/texcra-ui/relationship-multi-select/types'

/** Request shape for paginated relationship options */
export type RelationshipOptionsRequest = {
  /** Collection slug: 'authors' | 'categories' | 'posts' etc. */
  collection: string
  /** Search/filter term (case-insensitive partial match on label) */
  search?: string
  /** 1-based page number */
  page?: number
  /** Items per page (default 10) */
  limit?: number
}

/** Response shape returned by the server function */
export type RelationshipOptionsResponse = {
  options: Option[]
  hasMore: boolean
}
