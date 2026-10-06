import {
  sqliteTable,
  integer,
  text,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { relations } from 'drizzle-orm/_relations'
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

export const postsCategories = sqliteTable(
  'posts_categories',
  {
    postId: integer('post_id')
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
    primaryKey({ columns: [table.postId, table.categoryId] }),
    index('posts_categories_order_idx').on(table.order),
    index('posts_categories_post_id_idx').on(table.postId),
    index('posts_categories_category_id_idx').on(table.categoryId),
  ],
)

export const postsUsers = sqliteTable(
  'posts_users',
  {
    postId: integer('post_id')
      .notNull()
      .references((): AnySQLiteColumn => posts.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references((): AnySQLiteColumn => users.id, { onDelete: 'cascade' }),
    order: integer('order'),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.userId] }),
    index('posts_users_order_idx').on(table.order),
    index('posts_users_post_id_idx').on(table.postId),
    index('posts_users_user_id_idx').on(table.userId),
  ],
)

export const postsRelatedPosts = sqliteTable(
  'posts_related_posts',
  {
    postId: integer('post_id')
      .notNull()
      .references((): AnySQLiteColumn => posts.id, { onDelete: 'cascade' }),
    relatedPostId: integer('related_post_id')
      .notNull()
      .references((): AnySQLiteColumn => posts.id, { onDelete: 'cascade' }),
    order: integer('order'),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.relatedPostId] }),
    index('posts_related_posts_order_idx').on(table.order),
    index('posts_related_posts_post_id_idx').on(table.postId),
    index('posts_related_posts_related_post_id_idx').on(table.relatedPostId),
  ],
)

export const postsRelations = relations(posts, ({ many }) => ({
  categories: many(postsCategories),
  authors: many(postsUsers),
  relatedPosts: many(postsRelatedPosts, {
    relationName: 'post_related_posts',
  }),
}))

export const postsCategoriesRelations = relations(
  postsCategories,
  ({ one }) => ({
    post: one(posts, {
      fields: [postsCategories.postId],
      references: [posts.id],
    }),
    category: one(categories, {
      fields: [postsCategories.categoryId],
      references: [categories.id],
    }),
  }),
)

export const postsUsersRelations = relations(postsUsers, ({ one }) => ({
  post: one(posts, {
    fields: [postsUsers.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [postsUsers.userId],
    references: [users.id],
  }),
}))

export const postsRelatedPostsRelations = relations(
  postsRelatedPosts,
  ({ one }) => ({
    post: one(posts, {
      fields: [postsRelatedPosts.postId],
      references: [posts.id],
      relationName: 'post_related_posts',
    }),
    relatedPost: one(posts, {
      fields: [postsRelatedPosts.relatedPostId],
      references: [posts.id],
      relationName: 'related_post_target',
    }),
  }),
)
