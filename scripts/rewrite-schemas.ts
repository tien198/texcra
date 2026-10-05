import fs from 'fs'
import path from 'path'

const files: Record<string, string> = {
  'categories.ts': `import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
import { postsRels } from './posts'
import { postsVRels } from './posts-v'

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
      .default(sql\`(unixepoch() * 1000)\`),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql\`(unixepoch() * 1000)\`),
  },
  (table) => [
    index('categories_created_at_idx').on(table.createdAt),
    index('categories_parent_idx').on(table.parentId),
    index('categories_slug_idx').on(table.slug).unique(),
    index('categories_updated_at_idx').on(table.updatedAt),
  ],
)


export const categoriesBreadcrumbs = sqliteTable(
  'categories_breadcrumbs',
  {
    order: integer('_order').notNull(),
    parentId: integer('_parent_id')
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

`,
  'media.ts': `import { sqliteTable, integer, text, numeric, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
import { payloadFolders } from './payload-folders'

export const media = sqliteTable(
  'media',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    alt: text('alt'),
    caption: text('caption', { mode: 'json' }),
    folderId: integer('folder_id').references(
      (): AnySQLiteColumn => payloadFolders.id,
      { onDelete: 'set null' },
    ),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql\`(unixepoch() * 1000)\`),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql\`(unixepoch() * 1000)\`),
    url: text('url'),
    thumbnailURL: text('thumbnail_u_r_l'),
    filename: text('filename'),
    mimeType: text('mime_type'),
    filesize: numeric('filesize'),
    width: numeric('width'),
    height: numeric('height'),
    focalX: numeric('focal_x'),
    focalY: numeric('focal_y'),
    sizesThumbnailUrl: text('sizes_thumbnail_url'),
    sizesThumbnailWidth: numeric('sizes_thumbnail_width'),
    sizesThumbnailHeight: numeric('sizes_thumbnail_height'),
    sizesThumbnailMimeType: text('sizes_thumbnail_mime_type'),
    sizesThumbnailFilesize: numeric('sizes_thumbnail_filesize'),
    sizesThumbnailFilename: text('sizes_thumbnail_filename'),
    sizesSquareUrl: text('sizes_square_url'),
    sizesSquareWidth: numeric('sizes_square_width'),
    sizesSquareHeight: numeric('sizes_square_height'),
    sizesSquareMimeType: text('sizes_square_mime_type'),
    sizesSquareFilesize: numeric('sizes_square_filesize'),
    sizesSquareFilename: text('sizes_square_filename'),
    sizesSmallUrl: text('sizes_small_url'),
    sizesSmallWidth: numeric('sizes_small_width'),
    sizesSmallHeight: numeric('sizes_small_height'),
    sizesSmallMimeType: text('sizes_small_mime_type'),
    sizesSmallFilesize: numeric('sizes_small_filesize'),
    sizesSmallFilename: text('sizes_small_filename'),
    sizesMediumUrl: text('sizes_medium_url'),
    sizesMediumWidth: numeric('sizes_medium_width'),
    sizesMediumHeight: numeric('sizes_medium_height'),
    sizesMediumMimeType: text('sizes_medium_mime_type'),
    sizesMediumFilesize: numeric('sizes_medium_filesize'),
    sizesMediumFilename: text('sizes_medium_filename'),
    sizesLargeUrl: text('sizes_large_url'),
    sizesLargeWidth: numeric('sizes_large_width'),
    sizesLargeHeight: numeric('sizes_large_height'),
    sizesLargeMimeType: text('sizes_large_mime_type'),
    sizesLargeFilesize: numeric('sizes_large_filesize'),
    sizesLargeFilename: text('sizes_large_filename'),
    sizesXlargeUrl: text('sizes_xlarge_url'),
    sizesXlargeWidth: numeric('sizes_xlarge_width'),
    sizesXlargeHeight: numeric('sizes_xlarge_height'),
    sizesXlargeMimeType: text('sizes_xlarge_mime_type'),
    sizesXlargeFilesize: numeric('sizes_xlarge_filesize'),
    sizesXlargeFilename: text('sizes_xlarge_filename'),
    sizesOgUrl: text('sizes_og_url'),
    sizesOgWidth: numeric('sizes_og_width'),
    sizesOgHeight: numeric('sizes_og_height'),
    sizesOgMimeType: text('sizes_og_mime_type'),
    sizesOgFilesize: numeric('sizes_og_filesize'),
    sizesOgFilename: text('sizes_og_filename'),
  },
  (table) => [
    index('media_created_at_idx').on(table.createdAt),
    index('media_filename_idx').on(table.filename).unique(),
    index('media_folder_idx').on(table.folderId),
    index('media_sizes_large_sizes_large_filename_idx').on(
      table.sizesLargeFilename,
    ),
    index('media_sizes_medium_sizes_medium_filename_idx').on(
      table.sizesMediumFilename,
    ),
    index('media_sizes_og_sizes_og_filename_idx').on(table.sizesOgFilename),
    index('media_sizes_small_sizes_small_filename_idx').on(
      table.sizesSmallFilename,
    ),
    index('media_sizes_square_sizes_square_filename_idx').on(
      table.sizesSquareFilename,
    ),
    index('media_sizes_thumbnail_sizes_thumbnail_filename_idx').on(
      table.sizesThumbnailFilename,
    ),
    index('media_sizes_xlarge_sizes_xlarge_filename_idx').on(
      table.sizesXlargeFilename,
    ),
    index('media_updated_at_idx').on(table.updatedAt),
  ],
)

`,
  'payload-folders.ts': `import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
import { media } from './media'

export const payloadFolders = sqliteTable(
  'payload_folders',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    folderId: integer('folder_id').references(
      (): AnySQLiteColumn => payloadFolders.id,
      { onDelete: 'set null' },
    ),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql\`(unixepoch() * 1000)\`),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql\`(unixepoch() * 1000)\`),
  },
  (table) => [
    index('payload_folders_created_at_idx').on(table.createdAt),
    index('payload_folders_folder_idx').on(table.folderId),
    index('payload_folders_name_idx').on(table.name),
    index('payload_folders_updated_at_idx').on(table.updatedAt),
  ],
)


export const payloadFoldersFolderType = sqliteTable(
  'payload_folders_folder_type',
  {
    order: integer('order').notNull(),
    parentId: integer('parent_id')
      .notNull()
      .references((): AnySQLiteColumn => payloadFolders.id, {
        onDelete: 'cascade',
      }),
    value: text('value'),
    id: integer('id').primaryKey({ autoIncrement: true }),
  },
  (table) => [
    index('payload_folders_folder_type_order_idx').on(table.order),
    index('payload_folders_folder_type_parent_idx').on(table.parentId),
  ],
)

`,
  'posts.ts': `import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
import { media } from './media'
import { categories } from './categories'
import { users } from './users'
import { postsV } from './posts-v'

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
      .default(sql\`(unixepoch() * 1000)\`),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql\`(unixepoch() * 1000)\`),
    status: text('_status', { enum: ['draft', 'published'] }).default('draft'),
  },
  (table) => [
    index('posts__status_idx').on(table.status),
    index('posts_created_at_idx').on(table.createdAt),
    index('posts_hero_image_idx').on(table.heroImageId),
    index('posts_meta_meta_image_idx').on(table.metaImageId),
    index('posts_slug_idx').on(table.slug).unique(),
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

`,
  'posts-v.ts': `import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core'
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
      .default(sql\`(unixepoch() * 1000)\`),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql\`(unixepoch() * 1000)\`),
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

`,
  'search.ts': `import { sqliteTable, integer, text, numeric, index } from 'drizzle-orm/sqlite-core'
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
      .default(sql\`(unixepoch() * 1000)\`),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql\`(unixepoch() * 1000)\`),
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

`,
  'users.ts': `import { sqliteTable, integer, text, numeric, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
import { postsVRels } from './posts-v'
import { postsRels } from './posts'

export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name'),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql\`(unixepoch() * 1000)\`),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql\`(unixepoch() * 1000)\`),
    email: text('email').notNull(),
    resetPasswordToken: text('reset_password_token'),
    resetPasswordExpiration: integer('reset_password_expiration', {
      mode: 'timestamp_ms',
    }),
    salt: text('salt'),
    hash: text('hash'),
    loginAttempts: numeric('login_attempts').default('0'),
    lockUntil: integer('lock_until', { mode: 'timestamp_ms' }),
  },
  (table) => [
    index('users_created_at_idx').on(table.createdAt),
    index('users_email_idx').on(table.email).unique(),
    index('users_updated_at_idx').on(table.updatedAt),
  ],
)


export const usersSessions = sqliteTable(
  'users_sessions',
  {
    order: integer('_order').notNull(),
    parentId: integer('_parent_id')
      .notNull()
      .references((): AnySQLiteColumn => users.id, { onDelete: 'cascade' }),
    id: text('id').primaryKey(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('users_sessions_order_idx').on(table.order),
    index('users_sessions_parent_id_idx').on(table.parentId),
  ],
)

`,
}

for (const [name, content] of Object.entries(files)) {
  fs.writeFileSync(path.join('src/server/db/schema', name), content)
}
