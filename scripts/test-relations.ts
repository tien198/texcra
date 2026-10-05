import { getDb, schema } from '../src/server/db'

const mockD1: any = {
  prepare(_query: string) {
    return {
      bind(..._values: any[]) { return this },
      first: async () => null,
      all: async () => ({ results: [], success: true, meta: {} }),
      raw: async () => [],
      run: async () => ({ success: true, meta: {} }),
    }
  },
  batch: async (stmts: any[]) => stmts.map(() => ({ results: [], success: true })),
  exec: async () => ({ count: 0, duration: 0 }),
}

const db = getDb(mockD1)
try {
  const query = db.query.posts.findMany({
    with: {
      author: true
    }
  }).toSQL()
  console.log(query.sql)
} catch (e) {
  console.error("Relational query failed:", e)
}
