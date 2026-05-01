#!/usr/bin/env bash
# =============================================================================
# scripts/migration-roundtrip.sh
# Verifies up → down → up roundtrip for all migrations.
# Required before every migration-stage commit (BUILD_CONTRACT §10).
#
# Usage: bash scripts/migration-roundtrip.sh
#
# How it works:
#   1. supabase db reset — applies all up migrations (fresh DB)
#   2. Applies each down migration in REVERSE order via psql
#   3. Verifies the DB is clean (spot-checks key tables are gone)
#   4. supabase db reset — re-applies all up migrations to verify idempotency
#
# Supabase CLI limitation: `supabase db reset` only supports applying up
# migrations sequentially; there is no built-in rollback command.
# Down migrations are applied manually via psql against the local DB.
#
# Windows / Docker Desktop: bare `psql` is not in PATH; use docker exec into
# the supabase_db_mindmosaic container which ships its own psql binary.
# =============================================================================

set -euo pipefail

CONTAINER="supabase_db_mindmosaic"
PSQL="docker exec -i $CONTAINER psql -U postgres -d postgres"
MIGRATIONS_DIR="supabase/migrations"
DOWN_DIR="supabase/migrations/down"

echo "=== migration-roundtrip: step 1 — apply up migrations ==="
npx supabase db reset --local 2>&1

echo ""
echo "=== migration-roundtrip: step 2 — apply down migrations (reverse order) ==="
# Reverse-sort so highest-numbered migration is rolled back first
for down_file in $(ls "$DOWN_DIR"/*.down.sql 2>/dev/null | sort -r); do
  echo "  ↓ rolling back: $down_file"
  $PSQL -v ON_ERROR_STOP=1 < "$down_file"
done

echo ""
echo "=== migration-roundtrip: step 3 — verify DB is clean ==="
# Spot-check: key tables from migration 0001 should be gone
TABLES=("tenant" "user_profile" "parent_student_link" "class_group" "class_student" "feature_flag" "admin_action_log")
for table in "${TABLES[@]}"; do
  result=$($PSQL -tAc \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='$table'")
  if [ "$result" != "0" ]; then
    echo "  FAIL: table '$table' still exists after down migration"
    exit 1
  fi
  echo "  ok: $table gone"
done

# Spot-check: key enums should be gone
TYPES=("user_role" "subscription_tier" "engine_type" "session_status")
for typename in "${TYPES[@]}"; do
  result=$($PSQL -tAc \
    "SELECT COUNT(*) FROM pg_type WHERE typname='$typename' AND typnamespace='public'::regnamespace")
  if [ "$result" != "0" ]; then
    echo "  FAIL: type '$typename' still exists after down migration"
    exit 1
  fi
  echo "  ok: $typename gone"
done

echo ""
echo "=== migration-roundtrip: step 4 — re-apply up migrations ==="
npx supabase db reset --local 2>&1

echo ""
echo "=== migration-roundtrip: ALL STEPS PASSED ==="
