#!/usr/bin/env bash
set -euo pipefail

# Determine repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

OUT_DIR="$PROJECT_ROOT/src/server/db/dbml"
SQL_FILE="$OUT_DIR/schema.sql"
DBML_FILE="$OUT_DIR/schema.dbml"

mkdir -p "$OUT_DIR"

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT INT TERM

TMP_RAW_SQL="$TMP_DIR/raw.sql"
TMP_MYSQL_SQL="$TMP_DIR/converted.sql"
TMP_OUT_DBML="$TMP_DIR/out.dbml"

echo "Exporting SQLite schema to $SQL_FILE..."
pnpm --silent exec drizzle-kit export --config drizzle.config.ts > "$TMP_RAW_SQL"
cp "$TMP_RAW_SQL" "$SQL_FILE"

# Prepare temporary SQL for sql2dbml
# Note: sql2dbml does not have a native --sqlite flag; using --mysql requires
# stripping SQLite AUTOINCREMENT and replacing DEFAULT (unixepoch() * 1000) with DEFAULT 0.
sed -E \
  -e 's/[[:blank:]]+AUTOINCREMENT//g' \
  -e 's/DEFAULT[[:blank:]]+\(unixepoch\(\)[[:blank:]]*\*[[:blank:]]*1000\)/DEFAULT 0/g' \
  "$TMP_RAW_SQL" > "$TMP_MYSQL_SQL"

# Remove any stale error log before conversion
rm -f "$PROJECT_ROOT/dbml-error.log"

echo "Converting SQL to DBML at $DBML_FILE..."
pnpm --silent exec sql2dbml --mysql "$TMP_MYSQL_SQL" -o "$TMP_OUT_DBML"
cp "$TMP_OUT_DBML" "$DBML_FILE"

# Clean up error log created by sql2dbml on successful run
rm -f "$PROJECT_ROOT/dbml-error.log"

echo "Successfully exported schema:"
echo "  SQL:  $SQL_FILE"
echo "  DBML: $DBML_FILE"
