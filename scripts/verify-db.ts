import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { getTableColumns } from 'drizzle-orm'
import {
  extractTablesRelationalConfig,
  createTableRelationsHelpers,
  normalizeRelation,
} from 'drizzle-orm/_relations'
import { drizzle } from 'drizzle-orm/d1'
import { getDb, schema, relations } from '../src/server/db'

console.log('Testing Drizzle schema and D1 connection setup...')

const expectedTables = [
  'postsV',
  'postsVCategories',
  'postsVUsers',
  'postsVRelatedPosts',
  'postsVVersionPopulatedAuthors',
  'categories',
  'categoriesBreadcrumbs',
  'media',
  'payloadFolders',
  'payloadFoldersFolderType',
  'posts',
  'postsPopulatedAuthors',
  'postsCategories',
  'postsUsers',
  'postsRelatedPosts',
  'search',
  'searchCategories',
  'searchPosts',
  'users',
  'usersSessions',
] as const

for (const tableName of expectedTables) {
  const table = schema[tableName]
  const columns = getTableColumns(table)
  const columnCount = Object.keys(columns).length
  console.log(`✓ Table ${tableName} verified with ${columnCount} columns`)
}

// 1. Verify schema relations normalization using Drizzle relations extractor
console.log('\nVerifying Drizzle schema relations normalization...')
const relationalConfig = extractTablesRelationalConfig(
  schema as any,
  createTableRelationsHelpers,
)
let relationCount = 0
for (const [_tableName, tableConfig] of Object.entries(
  relationalConfig.tables,
)) {
  for (const [_relName, rel] of Object.entries(tableConfig.relations)) {
    normalizeRelation(
      relationalConfig.tables,
      relationalConfig.tableNamesMap,
      rel,
    )

    relationCount++
  }
}
console.log(
  `✓ Successfully normalized all ${relationCount} relations across schema tables with 0 ambiguity`,
)

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
console.log(
  `✓ Verified db.query registered for all ${expectedTables.length} tables`,
)

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

// Test Relational Queries API (db.query)
const relationalPostsQuery = db.query.posts
  .findMany({
    with: {
      categories: true,
      authors: true,
      relatedPosts: true,
    },
  })
  .toSQL()
console.log('✓ Generated relational query for posts:', relationalPostsQuery.sql)

const relationalCategoriesQuery = db.query.categories
  .findMany({
    with: {
      posts: true,
      postVersions: true,
    },
  })
  .toSQL()
console.log(
  '✓ Generated relational query for categories:',
  relationalCategoriesQuery.sql,
)

const relationalPostsVQuery = db.query.postsV
  .findMany({
    with: {
      categories: true,
      authors: true,
      relatedPosts: true,
    },
  })
  .toSQL()
console.log(
  '✓ Generated relational query for postsV:',
  relationalPostsVQuery.sql,
)

const relationalSearchQuery = db.query.search
  .findMany({
    with: {
      posts: true,
    },
  })
  .toSQL()
console.log(
  '✓ Generated relational query for search:',
  relationalSearchQuery.sql,
)

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

// Verify 20 user tables created in SQLite
const tablesInDb = (
  sqliteDb
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    )
    .all() as { name: string }[]
).map((r) => r.name)

const expectedSqliteTableNames = [
  '_posts_v',
  '_posts_v_categories',
  '_posts_v_users',
  '_posts_v_related_posts',
  '_posts_v_version_populated_authors',
  'categories',
  'categories_breadcrumbs',
  'media',
  'payload_folders',
  'payload_folders_folder_type',
  'posts',
  'posts_populated_authors',
  'posts_categories',
  'posts_users',
  'posts_related_posts',
  'search',
  'search_categories',
  'search_posts',
  'users',
  'users_sessions',
]

for (const tbl of expectedSqliteTableNames) {
  if (!tablesInDb.includes(tbl)) {
    throw new Error(`Expected SQLite table "${tbl}" was not created`)
  }
}
console.log(
  `✓ All ${expectedSqliteTableNames.length} SQLite tables exist in database`,
)

// Verify old polymorphic tables were dropped
const droppedTables = ['posts_rels', '_posts_v_rels', 'search_rels']
for (const tbl of droppedTables) {
  if (tablesInDb.includes(tbl)) {
    throw new Error(`Old polymorphic table "${tbl}" should have been dropped`)
  }
}
console.log('✓ Verified old polymorphic tables were dropped')

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
console.log(
  '✓ Verified foreign key ON DELETE CASCADE (users -> users_sessions)',
)

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

// Test Foreign Key Enforcement on Join Tables: Inserting invalid foreign key must fail
try {
  sqliteDb.exec(
    'INSERT INTO posts_categories (post_id, category_id, "order") VALUES (9999, 9999, 1);',
  )
  throw new Error('Expected FK failure on invalid posts_categories insert!')
} catch (err: any) {
  if (err.message.includes('FOREIGN KEY constraint failed')) {
    console.log('✓ Verified foreign key constraint rejection on invalid IDs')
  } else {
    throw err
  }
}

// Setup base data for join table tests
sqliteDb.exec(
  "INSERT INTO categories (id, title, slug) VALUES (1, 'Tech', 'tech'), (2, 'Design', 'design');",
)
sqliteDb.exec(
  "INSERT INTO users (id, name, email) VALUES (1, 'Alice', 'alice@test.com'), (2, 'Bob', 'bob@test.com');",
)
sqliteDb.exec(
  "INSERT INTO posts (id, title, slug) VALUES (10, 'Post 10', 'post-10'), (20, 'Post 20', 'post-20');",
)
sqliteDb.exec(
  "INSERT INTO _posts_v (id, parent_id, version_title) VALUES (100, 10, 'Version 1');",
)
sqliteDb.exec(
  "INSERT INTO search (id, title, slug) VALUES (50, 'Search Post', 'search-post');",
)

// Test composite primary key uniqueness on ALL 7 join tables
const joinTablePks = [
  {
    name: 'posts_categories',
    sql: 'INSERT INTO posts_categories (post_id, category_id, "order") VALUES (10, 1, 1);',
  },
  {
    name: 'posts_users',
    sql: 'INSERT INTO posts_users (post_id, user_id, "order") VALUES (10, 1, 1);',
  },
  {
    name: 'posts_related_posts',
    sql: 'INSERT INTO posts_related_posts (post_id, related_post_id, "order") VALUES (10, 20, 1);',
  },
  {
    name: '_posts_v_categories',
    sql: 'INSERT INTO _posts_v_categories (version_id, category_id, "order") VALUES (100, 1, 1);',
  },
  {
    name: '_posts_v_users',
    sql: 'INSERT INTO _posts_v_users (version_id, user_id, "order") VALUES (100, 1, 1);',
  },
  {
    name: '_posts_v_related_posts',
    sql: 'INSERT INTO _posts_v_related_posts (version_id, related_post_id, "order") VALUES (100, 20, 1);',
  },
  {
    name: 'search_posts',
    sql: 'INSERT INTO search_posts (search_id, post_id, "order") VALUES (50, 10, 1);',
  },
]

for (const { name, sql } of joinTablePks) {
  sqliteDb.exec(sql)
  try {
    sqliteDb.exec(sql)
    throw new Error(`Expected composite PK on ${name} to reject duplicate!`)
  } catch (err: any) {
    if (
      err.message.includes('UNIQUE constraint failed') ||
      err.message.includes('PRIMARY KEY')
    ) {
      console.log(`✓ Verified composite primary key uniqueness on ${name}`)
    } else {
      throw err
    }
  }
}

// Test Foreign Key CASCADE deletion on ALL 7 join tables
// 1. Delete post 20 -> should cascade delete posts_related_posts and _posts_v_related_posts
sqliteDb.exec('DELETE FROM posts WHERE id = 20;')
const postRelCount = (
  sqliteDb
    .prepare(
      'SELECT count(*) as count FROM posts_related_posts WHERE post_id = 10',
    )
    .get() as { count: number }
).count
const vPostRelCount = (
  sqliteDb
    .prepare(
      'SELECT count(*) as count FROM _posts_v_related_posts WHERE version_id = 100',
    )
    .get() as { count: number }
).count
if (postRelCount !== 0 || vPostRelCount !== 0) {
  throw new Error(
    'Expected posts_related_posts to CASCADE delete when related post was deleted!',
  )
}
console.log(
  '✓ Verified CASCADE delete on related_post_id (posts -> posts_related_posts & _posts_v_related_posts)',
)

// 2. Delete postsV 100 -> should cascade delete _posts_v_categories, _posts_v_users
sqliteDb.exec('DELETE FROM _posts_v WHERE id = 100;')
const vCatCount = (
  sqliteDb
    .prepare(
      'SELECT count(*) as count FROM _posts_v_categories WHERE version_id = 100',
    )
    .get() as { count: number }
).count
const vUserCount = (
  sqliteDb
    .prepare(
      'SELECT count(*) as count FROM _posts_v_users WHERE version_id = 100',
    )
    .get() as { count: number }
).count
if (vCatCount !== 0 || vUserCount !== 0) {
  throw new Error(
    'Expected _posts_v_* tables to CASCADE delete when postsV was deleted!',
  )
}
console.log(
  '✓ Verified CASCADE delete on version_id (_posts_v -> _posts_v_categories & _posts_v_users)',
)

// 3. Delete search 50 -> should cascade delete search_posts
sqliteDb.exec('DELETE FROM search WHERE id = 50;')
const searchPostCount = (
  sqliteDb
    .prepare('SELECT count(*) as count FROM search_posts WHERE search_id = 50')
    .get() as { count: number }
).count
if (searchPostCount !== 0) {
  throw new Error(
    'Expected search_posts to CASCADE delete when search was deleted!',
  )
}
console.log('✓ Verified CASCADE delete on search_id (search -> search_posts)')

// 4. Delete post 10 -> should cascade delete posts_categories, posts_users
sqliteDb.exec('DELETE FROM posts WHERE id = 10;')
const postCatCount = (
  sqliteDb
    .prepare(
      'SELECT count(*) as count FROM posts_categories WHERE post_id = 10',
    )
    .get() as { count: number }
).count
const postUserCount = (
  sqliteDb
    .prepare('SELECT count(*) as count FROM posts_users WHERE post_id = 10')
    .get() as { count: number }
).count
if (postCatCount !== 0 || postUserCount !== 0) {
  throw new Error(
    'Expected posts_categories and posts_users to CASCADE delete when post was deleted!',
  )
}
console.log(
  '✓ Verified CASCADE delete on post_id (posts -> posts_categories & posts_users)',
)

// 5. End-to-end real Drizzle query execution via SQLite-backed D1 adapter
console.log(
  '\nVerifying end-to-end relational query execution with real SQLite engine...',
)
const realD1: any = {
  prepare(sql: string) {
    return {
      bind(...values: any[]) {
        return {
          all: async () => ({
            results: sqliteDb.prepare(sql).all(...values),
            success: true,
            meta: {},
          }),
          raw: async () =>
            sqliteDb
              .prepare(sql)
              .all(...values)
              .map((r) => Object.values(r as Record<string, unknown>)),
          run: async () => {
            const info = sqliteDb.prepare(sql).run(...values)
            return {
              success: true,
              meta: {
                changes: Number(info.changes),
                last_row_id: Number(info.lastInsertRowid),
              },
            }
          },
        }
      },
      all: async () => ({
        results: sqliteDb.prepare(sql).all(),
        success: true,
        meta: {},
      }),
      raw: async () =>
        sqliteDb
          .prepare(sql)
          .all()
          .map((r) => Object.values(r as Record<string, unknown>)),
      run: async () => {
        const info = sqliteDb.prepare(sql).run()
        return {
          success: true,
          meta: {
            changes: Number(info.changes),
            last_row_id: Number(info.lastInsertRowid),
          },
        }
      },
    }
  },
  batch: async (statements: any[]) =>
    Promise.all(statements.map((s) => (s.all ? s.all() : s.run()))),
  exec: async (sql: string) => {
    sqliteDb.exec(sql)
    return { count: 0, duration: 0 }
  },
}

const liveDb = drizzle(realD1, { relations })

// Seed fresh data for live relational query test
await liveDb.insert(schema.categories).values([
  { id: 101, title: 'Engineering', slug: 'engineering' },
  { id: 102, title: 'Design System', slug: 'design-system' },
])

await liveDb.insert(schema.users).values([
  { id: 201, name: 'Alice Dev', email: 'alice.dev@test.com' },
  { id: 202, name: 'Bob Arch', email: 'bob.arch@test.com' },
])

await liveDb.insert(schema.posts).values([
  { id: 301, title: 'Main Post', slug: 'main-post', status: 'published' },
  { id: 302, title: 'Related Post 1', slug: 'rel-1', status: 'published' },
  { id: 303, title: 'Related Post 2', slug: 'rel-2', status: 'published' },
])

await liveDb.insert(schema.postsCategories).values([
  { postId: 301, categoryId: 101, order: 1 },
  { postId: 301, categoryId: 102, order: 2 },
])

await liveDb.insert(schema.postsUsers).values([
  { postId: 301, userId: 201, order: 1 },
  { postId: 301, userId: 202, order: 2 },
])

await liveDb.insert(schema.postsRelatedPosts).values([
  { postId: 301, relatedPostId: 302, order: 1 },
  { postId: 301, relatedPostId: 303, order: 2 },
])

await liveDb
  .insert(schema.postsV)
  .values([{ id: 401, parentId: 301, versionTitle: 'Main Post v1' }])

await liveDb
  .insert(schema.postsVCategories)
  .values([{ versionId: 401, categoryId: 101, order: 1 }])

await liveDb
  .insert(schema.postsVUsers)
  .values([{ versionId: 401, userId: 201, order: 1 }])

await liveDb
  .insert(schema.postsVRelatedPosts)
  .values([{ versionId: 401, relatedPostId: 302, order: 1 }])

await liveDb
  .insert(schema.search)
  .values([{ id: 501, title: 'Search Main', slug: 'search-main' }])

await liveDb
  .insert(schema.searchPosts)
  .values([{ searchId: 501, postId: 301, order: 1 }])

// 1. Query post with direct through many-to-many and join table with order
const fetchedPost = await liveDb.query.posts.findFirst({
  where: { id: 301 },
  with: {
    categories: true,
    authors: true,
    relatedPosts: true,
    postsCategories: true,
    postsUsers: true,
    postsRelatedPosts: true,
  },
})

if (!fetchedPost) throw new Error('Failed to fetch post!')
if (fetchedPost.categories.length !== 2)
  throw new Error('Expected 2 categories!')
if (fetchedPost.authors.length !== 2) throw new Error('Expected 2 authors!')
if (fetchedPost.relatedPosts.length !== 2)
  throw new Error('Expected 2 related posts!')
if (
  fetchedPost.postsCategories[0].order !== 1 ||
  fetchedPost.postsCategories[1].order !== 2
) {
  throw new Error('Expected join table order column to be preserved!')
}
console.log(
  '✓ Successfully queried posts with direct through relations & join table metadata',
)

// 2. Query category reverse relation
const fetchedCategory = await liveDb.query.categories.findFirst({
  where: { id: 101 },
  with: {
    posts: true,
    postVersions: true,
  },
})
if (
  !fetchedCategory ||
  fetchedCategory.posts.length !== 1 ||
  fetchedCategory.postVersions.length !== 1
) {
  throw new Error(
    'Expected category reverse relations to return 1 post and 1 postVersion!',
  )
}
console.log(
  '✓ Successfully queried category reverse relations (posts & postVersions)',
)

// 3. Query post versions with relations
const fetchedVersion = await liveDb.query.postsV.findFirst({
  where: { id: 401 },
  with: {
    categories: true,
    authors: true,
    relatedPosts: true,
  },
})
if (
  !fetchedVersion ||
  fetchedVersion.categories.length !== 1 ||
  fetchedVersion.authors.length !== 1
) {
  throw new Error(
    'Expected post version relations to return category and author!',
  )
}
console.log(
  '✓ Successfully queried post version relations (categories, authors, relatedPosts)',
)

// 4. Query search with related posts
const fetchedSearch = await liveDb.query.search.findFirst({
  where: { id: 501 },
  with: {
    posts: true,
  },
})
if (!fetchedSearch || fetchedSearch.posts.length !== 1) {
  throw new Error('Expected search to return 1 related post!')
}
console.log('✓ Successfully queried search with related posts')

console.log(
  '\nAll schema, D1 connection, normalization, migration, constraint, and live relational query tests passed successfully!',
)
