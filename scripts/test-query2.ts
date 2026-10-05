import { getDb } from '../src/server/db'
const mockD1: any = {
  prepare: () => ({ bind: () => ({ first: async () => null, all: async () => ({ results: [], success: true, meta: {} }), raw: async () => [], run: async () => ({ success: true, meta: {} }) }) }),
  batch: async () => [],
  exec: async () => ({ count: 0, duration: 0 }),
}
const db = getDb(mockD1)
console.log(db.query.postsV)
