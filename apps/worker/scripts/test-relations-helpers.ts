import { sqliteTable, integer } from 'drizzle-orm/sqlite-core'
import { defineRelations } from 'drizzle-orm'

const t1 = sqliteTable('t1', { id: integer('id') })
const t2 = sqliteTable('t2', {
  id: integer('id'),
  t1Id: integer('t1_id').references(() => t1.id),
})
const schema = { t1, t2 }
const rels = defineRelations(schema, (h) => ({
  t1: {
    t2s: h.many.t2({ from: h.t1.id, to: h.t2.t1Id }),
  },
  t2: {
    t1: h.one.t1({ from: h.t2.t1Id, to: h.t1.id }),
  },
}))
console.log(rels)
