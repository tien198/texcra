import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'
import { defineRelations } from 'drizzle-orm'
const t1 = sqliteTable('t1', { id: integer('id') })
const t2 = sqliteTable('t2', { id: integer('id'), t1Id: integer('t1_id').references(() => t1.id) })
const schema = { t1, t2 }
const rels = defineRelations(schema, (h) => ({
  t1: {
    t2s: h.many(h.t2)
  },
  t2: {
    t1: h.one(h.t1, { fields: [h.t2.t1Id], references: [h.t1.id] })
  }
}))
console.log(rels)
