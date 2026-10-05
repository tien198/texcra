import {
  sqliteTable,
  integer,
  text,
  numeric,
  index,
} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
import { media } from './media'
import { posts } from './posts'

export const search = sqliteTable(
  'search',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title'),
    priority: numeric('priority'),
    slug: text('slug'),
    metaTitle: text('meta_title'),
    metaDescription: text('meta_description'),
    metaImageId: integer('meta_image_id').references(
      (): AnySQLiteColumn => media.id,
      { onDelete: 'set null' },
    ),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index('search_created_at_idx').on(table.createdAt),
    index('search_meta_meta_image_idx').on(table.metaImageId),
    index('search_slug_idx').on(table.slug),
    index('search_updated_at_idx').on(table.updatedAt),
  ],
)

export const searchCategories = sqliteTable(
  'search_categories',
  {
    order: integer('_order').notNull(),
    parentId: integer('_parent_id')
      .notNull()
      .references((): AnySQLiteColumn => search.id, { onDelete: 'cascade' }),
    id: text('id').primaryKey(),
    relationTo: text('relation_to'),
    categoryId: text('category_i_d'),
    title: text('title'),
  },
  (table) => [
    index('search_categories_order_idx').on(table.order),
    index('search_categories_parent_id_idx').on(table.parentId),
  ],
)

export const searchRels = sqliteTable(
  'search_rels',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    order: integer('order'),
    parentId: integer('parent_id')
      .notNull()
      .references((): AnySQLiteColumn => search.id, { onDelete: 'cascade' }),
    path: text('path').notNull(),
    postsId: integer('posts_id').references((): AnySQLiteColumn => posts.id, {
      onDelete: 'cascade',
    }),
  },
  (table) => [
    index('search_rels_order_idx').on(table.order),
    index('search_rels_parent_idx').on(table.parentId),
    index('search_rels_path_idx').on(table.path),
    index('search_rels_posts_id_idx').on(table.postsId),
  ],
)
