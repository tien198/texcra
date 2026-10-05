import { defineRelations } from 'drizzle-orm'
import { sqliteTable, integer } from 'drizzle-orm/sqlite-core'
const t1 = sqliteTable('t1', { id: integer('id') })
const t2 = sqliteTable('t2', { id: integer('id') })
const schema = { t1, t2 }
const rels = defineRelations(schema, (helpers) => {
  return {}
})
