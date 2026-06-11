-- =============================================================================
-- Down Migration 0021 — Content Authoring Write-Side RLS
-- Reverses: 0021_content_authoring.sql
-- Drops write-side RLS policies added for content authoring.
-- ENABLE ROW LEVEL SECURITY (set in migration 0002) is intentionally preserved.
-- =============================================================================

DROP POLICY IF EXISTS "item_admin_insert"         ON item;
DROP POLICY IF EXISTS "item_admin_update"         ON item;
DROP POLICY IF EXISTS "item_version_admin_insert" ON item_version;
DROP POLICY IF EXISTS "stimulus_admin_insert"     ON stimulus;
DROP POLICY IF EXISTS "stimulus_admin_update"     ON stimulus;
