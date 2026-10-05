import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
import { posts } from './posts'
import { media } from './media'
import { categories } from './categories'
import { users } from './users'

export const postsV = sqliteTable(
  '_posts_v',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    parentId: integer('parent_id').references((): AnySQLiteColumn => posts.id, {
      onDelete: 'set null',
    }),
    versionTitle: text('version_title'),
    versionHeroImageId: integer('version_hero_image_id').references(
      (): AnySQLiteColumn => media.id,
      { onDelete: 'set null' },
    ),
    versionContent: text('version_content', { mode: 'json' }),
    versionMetaTitle: text('version_meta_title'),
    versionMetaImageId: integer('version_meta_image_id').references(
      (): AnySQLiteColumn => media.id,
      { onDelete: 'set null' },
    ),
    versionMetaDescription: text('version_meta_description'),
    versionPublishedAt: integer('version_published_at', {
      mode: 'timestamp_ms',
    }),
    versionGenerateSlug: integer('version_generate_slug', {
      mode: 'boolean',
    }).default(true),
    versionSlug: text('version_slug'),
    versionUpdatedAt: integer('version_updated_at', { mode: 'timestamp_ms' }),
    versionCreatedAt: integer('version_created_at', { mode: 'timestamp_ms' }),
    versionStatus: text('version__status', {
      enum: ['draft', 'published'],
    }).default('draft'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    latest: integer('latest', { mode: 'boolean' }),
    autosave: integer('autosave', { mode: 'boolean' }),
  },
  (table) => [
    index('_posts_v_autosave_idx').on(table.autosave),
    index('_posts_v_created_at_idx').on(table.createdAt),
    index('_posts_v_latest_idx').on(table.latest),
    index('_posts_v_parent_idx').on(table.parentId),
    index('_posts_v_updated_at_idx').on(table.updatedAt),
    index('_posts_v_version_meta_version_meta_image_idx').on(
      table.versionMetaImageId,
    ),
    index('_posts_v_version_version__status_idx').on(table.versionStatus),
    index('_posts_v_version_version_created_at_idx').on(table.versionCreatedAt),
    index('_posts_v_version_version_hero_image_idx').on(
      table.versionHeroImageId,
    ),
    index('_posts_v_version_version_slug_idx').on(table.versionSlug),
    index('_posts_v_version_version_updated_at_idx').on(table.versionUpdatedAt),
  ],
)

export const postsVRels = sqliteTable(
  '_posts_v_rels',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    order: integer('order'),
    parentId: integer('parent_id')
      .notNull()
      .references((): AnySQLiteColumn => postsV.id, { onDelete: 'cascade' }),
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
    index('_posts_v_rels_categories_id_idx').on(table.categoriesId),
    index('_posts_v_rels_order_idx').on(table.order),
    index('_posts_v_rels_parent_idx').on(table.parentId),
    index('_posts_v_rels_path_idx').on(table.path),
    index('_posts_v_rels_posts_id_idx').on(table.postsId),
    index('_posts_v_rels_users_id_idx').on(table.usersId),
  ],
)

export const postsVVersionPopulatedAuthors = sqliteTable(
  '_posts_v_version_populated_authors',
  {
    order: integer('_order').notNull(),
    parentId: integer('_parent_id')
      .notNull()
      .references((): AnySQLiteColumn => postsV.id, { onDelete: 'cascade' }),
    id: integer('id').primaryKey({ autoIncrement: true }),
    uuid: text('_uuid'),
    name: text('name'),
  },
  (table) => [
    index('_posts_v_version_populated_authors_order_idx').on(table.order),
    index('_posts_v_version_populated_authors_parent_id_idx').on(
      table.parentId,
    ),
  ],
)
