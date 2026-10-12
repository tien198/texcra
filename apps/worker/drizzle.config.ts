import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: '../../packages/shared/src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'sqlite',
})
