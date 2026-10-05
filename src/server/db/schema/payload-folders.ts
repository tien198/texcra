import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core'

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
      .default(sql`(unixepoch() * 1000)`),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
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
