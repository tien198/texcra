import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { getTableColumns } from 'drizzle-orm'
import { getDb, schema } from '../src/server/db'

console.log('Testing Drizzle schema and D1 connection setup...')

const expectedTables = [
  'postsV',
  'postsVRels',
  'postsVVersionPopulatedAuthors',
  'categories',
  'categoriesBreadcrumbs',
  'media',
  'payloadFolders',
  'payloadFoldersFolderType',
  'posts',
  'postsPopulatedAuthors',
  'postsRels',
  'search',
  'searchCategories',
  'searchRels',
  'users',
  'usersSessions',
] as const

for (const tableName of expectedTables) {
  const table = schema[tableName]
  const columns = getTableColumns(table)
  const columnCount = Object.keys(columns).length
  console.log(`✓ Table ${tableName} verified with ${columnCount} columns`)
}

// Mock D1 Database to verify getDb and Drizzle query builder
const mockD1: any = {
  prepare(_query: string) {
    return {
      bind(..._values: any[]) {
        return this
      },
      first: async () => null,
      all: async () => ({ results: [], success: true, meta: {} }),
      raw: async () => [],
      run: async () => ({
        success: true,
        meta: {
          changes: 1,
          duration: 0,
          last_row_id: 1,
          rows_read: 0,
          rows_written: 1,
        },
      }),
    }
  },
  batch: async (statements: any[]) =>
    statements.map(() => ({ results: [], success: true })),
  exec: async () => ({ count: 0, duration: 0 }),
}

const db = getDb(mockD1)
console.log('✓ Successfully initialized Drizzle D1 database instance')

// Verify relational queries (db.query)
for (const tableName of expectedTables) {
  if (!(tableName in db.query)) {
    throw new Error(`Expected db.query.${tableName} to be defined`)
  }
}
console.log('✓ Verified db.query registered for all 16 tables')

// Test query building
const selectPostsSql = db.select().from(schema.posts).toSQL()
console.log('✓ Generated SELECT query:', selectPostsSql.sql)

const insertPostSql = db
  .insert(schema.posts)
  .values({
    title: 'Hello D1',
    slug: 'hello-d1',
    status: 'published',
  })
  .toSQL()
console.log('✓ Generated INSERT query:', insertPostSql.sql)
console.log('✓ INSERT params:', insertPostSql.params)

// Runtime verification: Apply migration against SQLite and test constraints
console.log('\nVerifying generated migration against real SQLite engine...')
const sqliteDb = new DatabaseSync(':memory:')
sqliteDb.exec('PRAGMA foreign_keys = ON;')

const migrationsDir = path.resolve(process.cwd(), 'drizzle')
const migrationSubdirs = fs
  .readdirSync(migrationsDir)
  .filter((f) => fs.statSync(path.join(migrationsDir, f)).isDirectory())
  .sort()

for (const subdir of migrationSubdirs) {
  const migrationPath = path.join(migrationsDir, subdir, 'migration.sql')
  if (fs.existsSync(migrationPath)) {
    const sqlContent = fs.readFileSync(migrationPath, 'utf8')
    const statements = sqlContent.split('--> statement-breakpoint')
    for (const stmt of statements) {
      const trimmed = stmt.trim()
      if (trimmed) {
        sqliteDb.exec(trimmed)
      }
    }
    console.log(`✓ Successfully executed migration: ${subdir}/migration.sql`)
  }
}

// Verify 16 user tables created in SQLite
const tablesInDb = (
  sqliteDb
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    )
    .all() as { name: string }[]
).map((r) => r.name)

const expectedSqliteTableNames = [
  '_posts_v',
  '_posts_v_rels',
  '_posts_v_version_populated_authors',
  'categories',
  'categories_breadcrumbs',
  'media',
  'payload_folders',
  'payload_folders_folder_type',
  'posts',
  'posts_populated_authors',
  'posts_rels',
  'search',
  'search_categories',
  'search_rels',
  'users',
  'users_sessions',
]

for (const tbl of expectedSqliteTableNames) {
  if (!tablesInDb.includes(tbl)) {
    throw new Error(`Expected SQLite table "${tbl}" was not created`)
  }
}
console.log(`✓ All 16 SQLite tables exist in database`)

// Test Unique Constraint enforcement
sqliteDb.exec(
  "INSERT INTO users (name, email) VALUES ('User 1', 'user@example.com');",
)
try {
  sqliteDb.exec(
    "INSERT INTO users (name, email) VALUES ('User 2', 'user@example.com');",
  )
  throw new Error('Expected unique constraint on users.email to fail!')
} catch (err: any) {
  if (err.message.includes('UNIQUE constraint failed')) {
    console.log('✓ Verified unique constraint on users.email')
  } else {
    throw err
  }
}

// Test Foreign Key CASCADE: deleting user deletes session
const userRow = sqliteDb
  .prepare("SELECT id FROM users WHERE email = 'user@example.com'")
  .get() as { id: number }
sqliteDb.exec(
  `INSERT INTO users_sessions (_order, _parent_id, id, expires_at) VALUES (1, ${userRow.id}, 'session-1', 1700000000);`,
)
sqliteDb.exec(`DELETE FROM users WHERE id = ${userRow.id};`)
const remainingSessions = sqliteDb
  .prepare("SELECT * FROM users_sessions WHERE id = 'session-1'")
  .all()
if (remainingSessions.length !== 0) {
  throw new Error(
    'Expected users_sessions to be deleted by CASCADE foreign key!',
  )
}
console.log('✓ Verified foreign key ON DELETE CASCADE (users -> users_sessions)')

// Test Foreign Key SET NULL: deleting media sets hero_image_id to NULL
sqliteDb.exec("INSERT INTO media (filename) VALUES ('image.png');")
const mediaRow = sqliteDb
  .prepare("SELECT id FROM media WHERE filename = 'image.png'")
  .get() as { id: number }
sqliteDb.exec(
  `INSERT INTO posts (title, slug, hero_image_id) VALUES ('Test Post', 'test-post', ${mediaRow.id});`,
)
sqliteDb.exec(`DELETE FROM media WHERE id = ${mediaRow.id};`)
const postRow = sqliteDb
  .prepare("SELECT hero_image_id FROM posts WHERE slug = 'test-post'")
  .get() as { hero_image_id: number | null }
if (postRow.hero_image_id !== null) {
  throw new Error('Expected posts.hero_image_id to be SET NULL!')
}
console.log('✓ Verified foreign key ON DELETE SET NULL (media -> posts)')

console.log(
  '\nAll schema, D1 connection, migration, and constraint tests passed successfully!',
)
