import type { AnyD1Database } from 'drizzle-orm/d1'
import { drizzle } from 'drizzle-orm/d1'
import { defineRelations } from 'drizzle-orm'

import * as schema from './schema/index'

export const relations = defineRelations(schema, (h) => ({
  posts: {
    postsCategories: h.many.postsCategories({
      from: h.posts.id,
      to: h.postsCategories.parentId,
    }),
    categories: h.many.categories({
      from: h.posts.id.through(h.postsCategories.parentId),
      to: h.categories.id.through(h.postsCategories.categoryId),
    }),
    postsUsers: h.many.postsUsers({
      from: h.posts.id,
      to: h.postsUsers.parentId,
    }),
    authors: h.many.users({
      from: h.posts.id.through(h.postsUsers.parentId),
      to: h.users.id.through(h.postsUsers.userId),
    }),
    postsRelatedPosts: h.many.postsRelatedPosts({
      from: h.posts.id,
      to: h.postsRelatedPosts.parentId,
    }),
    relatedPosts: h.many.posts({
      from: h.posts.id.through(h.postsRelatedPosts.parentId),
      to: h.posts.id.through(h.postsRelatedPosts.relatedPostId),
    }),
  },
  postsCategories: {
    post: h.one.posts({
      from: h.postsCategories.parentId,
      to: h.posts.id,
    }),
    category: h.one.categories({
      from: h.postsCategories.categoryId,
      to: h.categories.id,
    }),
  },
  postsUsers: {
    post: h.one.posts({
      from: h.postsUsers.parentId,
      to: h.posts.id,
    }),
    user: h.one.users({
      from: h.postsUsers.userId,
      to: h.users.id,
    }),
  },
  postsRelatedPosts: {
    post: h.one.posts({
      from: h.postsRelatedPosts.parentId,
      to: h.posts.id,
    }),
    relatedPost: h.one.posts({
      from: h.postsRelatedPosts.relatedPostId,
      to: h.posts.id,
    }),
  },
  categories: {
    postsCategories: h.many.postsCategories({
      from: h.categories.id,
      to: h.postsCategories.categoryId,
    }),
    posts: h.many.posts({
      from: h.categories.id.through(h.postsCategories.categoryId),
      to: h.posts.id.through(h.postsCategories.parentId),
    }),
    postsVCategories: h.many.postsVCategories({
      from: h.categories.id,
      to: h.postsVCategories.categoryId,
    }),
    postVersions: h.many.postsV({
      from: h.categories.id.through(h.postsVCategories.categoryId),
      to: h.postsV.id.through(h.postsVCategories.parentId),
    }),
  },
  users: {
    postsUsers: h.many.postsUsers({
      from: h.users.id,
      to: h.postsUsers.userId,
    }),
    posts: h.many.posts({
      from: h.users.id.through(h.postsUsers.userId),
      to: h.posts.id.through(h.postsUsers.parentId),
    }),
    postsVUsers: h.many.postsVUsers({
      from: h.users.id,
      to: h.postsVUsers.userId,
    }),
    postVersions: h.many.postsV({
      from: h.users.id.through(h.postsVUsers.userId),
      to: h.postsV.id.through(h.postsVUsers.parentId),
    }),
  },
  postsV: {
    postsVCategories: h.many.postsVCategories({
      from: h.postsV.id,
      to: h.postsVCategories.parentId,
    }),
    categories: h.many.categories({
      from: h.postsV.id.through(h.postsVCategories.parentId),
      to: h.categories.id.through(h.postsVCategories.categoryId),
    }),
    postsVUsers: h.many.postsVUsers({
      from: h.postsV.id,
      to: h.postsVUsers.parentId,
    }),
    authors: h.many.users({
      from: h.postsV.id.through(h.postsVUsers.parentId),
      to: h.users.id.through(h.postsVUsers.userId),
    }),
    postsVRelatedPosts: h.many.postsVRelatedPosts({
      from: h.postsV.id,
      to: h.postsVRelatedPosts.parentId,
    }),
    relatedPosts: h.many.posts({
      from: h.postsV.id.through(h.postsVRelatedPosts.parentId),
      to: h.posts.id.through(h.postsVRelatedPosts.relatedPostId),
    }),
  },
  postsVCategories: {
    version: h.one.postsV({
      from: h.postsVCategories.parentId,
      to: h.postsV.id,
    }),
    category: h.one.categories({
      from: h.postsVCategories.categoryId,
      to: h.categories.id,
    }),
  },
  postsVUsers: {
    version: h.one.postsV({
      from: h.postsVUsers.parentId,
      to: h.postsV.id,
    }),
    user: h.one.users({
      from: h.postsVUsers.userId,
      to: h.users.id,
    }),
  },
  postsVRelatedPosts: {
    version: h.one.postsV({
      from: h.postsVRelatedPosts.parentId,
      to: h.postsV.id,
    }),
    relatedPost: h.one.posts({
      from: h.postsVRelatedPosts.relatedPostId,
      to: h.posts.id,
    }),
  },
  search: {
    searchPosts: h.many.searchPosts({
      from: h.search.id,
      to: h.searchPosts.searchId,
    }),
    posts: h.many.posts({
      from: h.search.id.through(h.searchPosts.searchId),
      to: h.posts.id.through(h.searchPosts.postId),
    }),
  },
  searchPosts: {
    search: h.one.search({
      from: h.searchPosts.searchId,
      to: h.search.id,
    }),
    post: h.one.posts({
      from: h.searchPosts.postId,
      to: h.posts.id,
    }),
  },
}))

/**
 * Obtain a Drizzle database instance connected to Cloudflare D1.
 *
 * In Cloudflare Workers runtime (or local Miniflare), the D1 binding 'DB' is available
 * via request context, globalThis.DB, or can be passed explicitly: `getDb(env.DB)`.
 */
export function getDb(d1?: AnyD1Database) {
  if (d1) {
    return drizzle(d1, { relations })
  }

  // Check TanStack Start / Nitro request event context
  try {
    const req = {} as any
    const requestD1 =
      (
        req as unknown as {
          context?: { cloudflare?: { env?: { DB?: AnyD1Database } } }
        }
      ).context?.cloudflare?.env?.DB ??
      (req as unknown as { env?: { DB?: AnyD1Database } }).env?.DB
    if (requestD1) {
      return drizzle(requestD1, { relations })
    }
  } catch {
    // Outside request context or StartEvent not available in AsyncLocalStorage
  }

  // Check global scope (Worker global or Miniflare binding)
  const globalD1 =
    (globalThis as unknown as { DB?: AnyD1Database }).DB ??
    (globalThis as unknown as { __env__?: { DB?: AnyD1Database } }).__env__?.DB
  if (globalD1) {
    return drizzle(globalD1, { relations })
  }

  // Check process.env fallback
  const envD1 = (process.env as unknown as { DB?: AnyD1Database }).DB
  if (envD1) {
    return drizzle(envD1, { relations })
  }

  throw new Error(
    'D1 Database binding "DB" not found. Please provide an explicit D1 database instance or configure the "DB" binding in wrangler.toml.',
  )
}

export type Database = ReturnType<typeof getDb>
export * from './schema/index'
export { schema }
