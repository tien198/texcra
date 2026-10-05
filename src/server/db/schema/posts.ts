import {
  sqliteTable,
  integer,
  text,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
import { media } from './media'
import { categories } from './categories'
import { users } from './users'

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
    status: text('_status', { enum: ['draft', 'published'] }).default('draft'),
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
    order: integer('_order').notNull(),
    parentId: integer('_parent_id')
      .notNull()
      .references((): AnySQLiteColumn => posts.id, { onDelete: 'cascade' }),
    id: text('id').primaryKey(),
    name: text('name'),
  },
  (table) => [
    index('posts_populated_authors_order_idx').on(table.order),
    index('posts_populated_authors_parent_id_idx').on(table.parentId),
  ],
)

export const postsRels = sqliteTable(
  'posts_rels',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    order: integer('order'),
    parentId: integer('parent_id')
      .notNull()
      .references((): AnySQLiteColumn => posts.id, { onDelete: 'cascade' }),
    path: text('path').notNull(),
    postsId: integer('posts_id').references((): AnySQLiteColumn => posts.id, {
      onDelete: 'cascade',
    }),
    categoriesId: integer('categories_id').references(
      (): AnySQLiteColumn => categories.id,
      { onDelete: 'cascade' },
    ),
    usersId: integer('users_id').references((): AnySQLiteColumn => users.id, {
      onDelete: 'cascade',
    }),
  },
  (table) => [
    index('posts_rels_categories_id_idx').on(table.categoriesId),
    index('posts_rels_order_idx').on(table.order),
    index('posts_rels_parent_idx').on(table.parentId),
    index('posts_rels_path_idx').on(table.path),
    index('posts_rels_posts_id_idx').on(table.postsId),
    index('posts_rels_users_id_idx').on(table.usersId),
  ],
)
