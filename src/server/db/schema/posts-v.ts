import {
  sqliteTable,
  integer,
  text,
  index,
  primaryKey,
} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { relations } from 'drizzle-orm/_relations'
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

export const postsVCategories = sqliteTable(
  '_posts_v_categories',
  {
    versionId: integer('version_id')
      .notNull()
      .references((): AnySQLiteColumn => postsV.id, { onDelete: 'cascade' }),
    categoryId: integer('category_id')
      .notNull()
      .references((): AnySQLiteColumn => categories.id, {
        onDelete: 'cascade',
      }),
    order: integer('order'),
  },
  (t) => [
    primaryKey({ columns: [t.versionId, t.categoryId] }),
    index('_posts_v_categories_order_idx').on(t.order),
    index('_posts_v_categories_version_id_idx').on(t.versionId),
    index('_posts_v_categories_category_id_idx').on(t.categoryId),
  ],
)

export const postsVUsers = sqliteTable(
  '_posts_v_users',
  {
    versionId: integer('version_id')
      .notNull()
      .references((): AnySQLiteColumn => postsV.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references((): AnySQLiteColumn => users.id, { onDelete: 'cascade' }),
    order: integer('order'),
  },
  (t) => [
    primaryKey({ columns: [t.versionId, t.userId] }),
    index('_posts_v_users_order_idx').on(t.order),
    index('_posts_v_users_version_id_idx').on(t.versionId),
    index('_posts_v_users_user_id_idx').on(t.userId),
  ],
)

export const postsVRelatedPosts = sqliteTable(
  '_posts_v_related_posts',
  {
    versionId: integer('version_id')
      .notNull()
      .references((): AnySQLiteColumn => postsV.id, { onDelete: 'cascade' }),
    relatedPostId: integer('related_post_id')
      .notNull()
      .references((): AnySQLiteColumn => posts.id, { onDelete: 'cascade' }),
    order: integer('order'),
  },
  (t) => [
    primaryKey({ columns: [t.versionId, t.relatedPostId] }),
    index('_posts_v_related_posts_order_idx').on(t.order),
    index('_posts_v_related_posts_version_id_idx').on(t.versionId),
    index('_posts_v_related_posts_related_post_id_idx').on(t.relatedPostId),
  ],
)

export const postsVRelations = relations(postsV, ({ many }) => ({
  categories: many(postsVCategories),
  authors: many(postsVUsers),
  relatedPosts: many(postsVRelatedPosts),
}))

export const postsVCategoriesRelations = relations(
  postsVCategories,
  ({ one }) => ({
    version: one(postsV, {
      fields: [postsVCategories.versionId],
      references: [postsV.id],
    }),
    category: one(categories, {
      fields: [postsVCategories.categoryId],
      references: [categories.id],
    }),
  }),
)

export const postsVUsersRelations = relations(postsVUsers, ({ one }) => ({
  version: one(postsV, {
    fields: [postsVUsers.versionId],
    references: [postsV.id],
  }),
  user: one(users, {
    fields: [postsVUsers.userId],
    references: [users.id],
  }),
}))

export const postsVRelatedPostsRelations = relations(
  postsVRelatedPosts,
  ({ one }) => ({
    version: one(postsV, {
      fields: [postsVRelatedPosts.versionId],
      references: [postsV.id],
    }),
    relatedPost: one(posts, {
      fields: [postsVRelatedPosts.relatedPostId],
      references: [posts.id],
    }),
  }),
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
