import {
  sqliteTable,
  integer,
  text,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { relations } from 'drizzle-orm/_relations'
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
import { postsCategories } from './posts'
import { postsVCategories } from './posts-v'

export const categories = sqliteTable(
  'categories',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    generateSlug: integer('generate_slug', { mode: 'boolean' }).default(true),
    slug: text('slug').notNull(),
    parentId: integer('parent_id').references(
      (): AnySQLiteColumn => categories.id,
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
    index('categories_created_at_idx').on(table.createdAt),
    index('categories_parent_idx').on(table.parentId),
    uniqueIndex('categories_slug_idx').on(table.slug),
    index('categories_updated_at_idx').on(table.updatedAt),
  ],
)

export const categoriesBreadcrumbs = sqliteTable(
  'categories_breadcrumbs',
  {
    order: integer('order').notNull(),
    parentId: integer('parent_id')
      .notNull()
      .references((): AnySQLiteColumn => categories.id, {
        onDelete: 'cascade',
      }),
    id: text('id').primaryKey(),
    docId: integer('doc_id').references((): AnySQLiteColumn => categories.id, {
      onDelete: 'set null',
    }),
    url: text('url'),
    label: text('label'),
  },
  (table) => [
    index('categories_breadcrumbs_doc_idx').on(table.docId),
    index('categories_breadcrumbs_order_idx').on(table.order),
    index('categories_breadcrumbs_parent_id_idx').on(table.parentId),
  ],
)

export const categoriesRelations = relations(categories, ({ many }) => ({
  posts: many(postsCategories),
  postVersions: many(postsVCategories),
}))
