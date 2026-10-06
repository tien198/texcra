import {
  sqliteTable,
  integer,
  text,
  numeric,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { relations } from 'drizzle-orm/_relations'
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
import { postsUsers } from './posts'
import { postsVUsers } from './posts-v'

export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name'),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
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
    uniqueIndex('users_email_idx').on(table.email),
    index('users_updated_at_idx').on(table.updatedAt),
  ],
)

export const usersSessions = sqliteTable(
  'users_sessions',
  {
    order: integer('order').notNull(),
    parentId: integer('parent_id')
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

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(postsUsers),
  postVersions: many(postsVUsers),
}))
