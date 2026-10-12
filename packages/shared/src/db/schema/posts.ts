import {
  sqliteTable,
  integer,
  text,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
import { media } from './media'
import { categories } from './categories'
import { users } from './users'
import { authors } from './authors'

export const posts = sqliteTable(
  'posts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title'),
    heroImageId: integer('hero_image_id').references(
      (): AnySQLiteColumn => media.id,
      { onDelete: 'set null' },
    ),
    content: text('content', { mode: 'json' }),
    metaTitle: text('meta_title'),
    metaImageId: integer('meta_image_id').references(
      (): AnySQLiteColumn => media.id,
      { onDelete: 'set null' },
    ),
    metaDescription: text('meta_description'),
    publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
    generateSlug: integer('generate_slug', { mode: 'boolean' }).default(true),
    slug: text('slug'),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    status: text('status', { enum: ['draft', 'published'] }).default('draft'),
  },
  (table) => [
    index('posts__status_idx').on(table.status),
    index('posts_created_at_idx').on(table.createdAt),
    index('posts_hero_image_idx').on(table.heroImageId),
    index('posts_meta_meta_image_idx').on(table.metaImageId),
    uniqueIndex('posts_slug_idx').on(table.slug),
    index('posts_updated_at_idx').on(table.updatedAt),
  ],
)

export const postsPopulatedAuthors = sqliteTable(
  'posts_populated_authors',
  {
    order: integer('order').notNull(),
    parentId: integer('parent_id')
      .notNull()
      .references((): AnySQLiteColumn => posts.id, { onDelete: 'cascade' }),
    id: text('id').primaryKey(),
    name: text('name'),
    authorId: integer('author_id').references(
      (): AnySQLiteColumn => authors.id,
      { onDelete: 'set null' },
    ),
  },
  (table) => [
    index('posts_populated_authors_order_idx').on(table.order),
    index('posts_populated_authors_parent_id_idx').on(table.parentId),
    index('posts_populated_authors_author_id_idx').on(table.authorId),
  ],
)

export const postsCategories = sqliteTable(
  'posts_categories',
  {
    parentId: integer('parent_id')
      .notNull()
      .references((): AnySQLiteColumn => posts.id, { onDelete: 'cascade' }),
    categoryId: integer('category_id')
      .notNull()
      .references((): AnySQLiteColumn => categories.id, {
        onDelete: 'cascade',
      }),
    order: integer('order'),
  },
  (table) => [
    primaryKey({ columns: [table.parentId, table.categoryId] }),
    index('posts_categories_order_idx').on(table.order),
    index('posts_categories_parent_id_idx').on(table.parentId),
    index('posts_categories_category_id_idx').on(table.categoryId),
  ],
)

export const postsUsers = sqliteTable(
  'posts_users',
  {
    parentId: integer('parent_id')
      .notNull()
      .references((): AnySQLiteColumn => posts.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references((): AnySQLiteColumn => users.id, { onDelete: 'cascade' }),
    order: integer('order'),
  },
  (table) => [
    primaryKey({ columns: [table.parentId, table.userId] }),
    index('posts_users_order_idx').on(table.order),
    index('posts_users_parent_id_idx').on(table.parentId),
    index('posts_users_user_id_idx').on(table.userId),
  ],
)

export const postsRelatedPosts = sqliteTable(
  'posts_related_posts',
  {
    parentId: integer('parent_id')
      .notNull()
      .references((): AnySQLiteColumn => posts.id, { onDelete: 'cascade' }),
    relatedPostId: integer('related_post_id')
      .notNull()
      .references((): AnySQLiteColumn => posts.id, { onDelete: 'cascade' }),
    order: integer('order'),
  },
  (table) => [
    primaryKey({ columns: [table.parentId, table.relatedPostId] }),
    index('posts_related_posts_order_idx').on(table.order),
    index('posts_related_posts_parent_id_idx').on(table.parentId),
    index('posts_related_posts_related_post_id_idx').on(table.relatedPostId),
  ],
)
