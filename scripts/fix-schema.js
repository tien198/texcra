const fs = require('fs');
const path = require('path');

const schemaDir = path.join(__dirname, '../src/server/db/schema');
const files = fs.readdirSync(schemaDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const filePath = path.join(schemaDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove relations import
  content = content.replace(/import \{ sql, relations \} from 'drizzle-orm'/g, "import { sql } from 'drizzle-orm'");

  // Remove relations blocks completely
  content = content.replace(/export const \w+Relations = relations\([\s\S]*?\)\)/g, '');
  
  // Fix .unique() -> uniqueIndex()
  if (content.includes('.unique()')) {
    content = content.replace(/index\('([^']+)'\)\.on\(([^)]+)\)\.unique\(\)/g, "uniqueIndex('$1').on($2)");
    // Ensure uniqueIndex is imported
    if (!content.includes('uniqueIndex')) {
      content = content.replace(/import \{([^}]+)\} from 'drizzle-orm\/sqlite-core'/, (match, p1) => {
        return `import {${p1}, uniqueIndex } from 'drizzle-orm/sqlite-core'`;
      });
    }
  }

  // Remove unused imports like postsRels that might be leftover from users.ts or search.ts
  // Let's rely on eslint or we can just run typecheck
  
  fs.writeFileSync(filePath, content);
}
console.log('Fixed files');
