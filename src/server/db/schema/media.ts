import {
  sqliteTable,
  integer,
  text,
  numeric,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'
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
      .default(sql`(unixepoch() * 1000)`),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
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
    uniqueIndex('media_filename_idx').on(table.filename),
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
