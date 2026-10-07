import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
import { users } from './users'
import { media } from './media'

export const authors = sqliteTable(
  'authors',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    bio: text('bio'),
    twitter: text('twitter'),
    avatarId: integer('avatar_id').references((): AnySQLiteColumn => media.id, {
      onDelete: 'set null',
    }),
    userId: integer('user_id').references((): AnySQLiteColumn => users.id, {
      onDelete: 'set null',
    }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index('authors_user_id_idx').on(table.userId),
    index('authors_avatar_id_idx').on(table.avatarId),
    index('authors_created_at_idx').on(table.createdAt),
    index('authors_updated_at_idx').on(table.updatedAt),
  ],
)
