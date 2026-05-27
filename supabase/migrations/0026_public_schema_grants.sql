-- =============================================================================
-- Migration 0026 — Public schema object-level grants
-- v1.1 · 2026-05-27
-- Fixes: ISSUE-0072 (service_role INSERT denied on cloud — framework_config and
--        all other public tables lack explicit object-level GRANTs)
--
-- Root cause: Migrations 0001–0025 have zero table-level GRANT statements.
-- They relied on Supabase's environment-level ALTER DEFAULT PRIVILEGES being
-- pre-applied — which local Supabase Docker does automatically via its init
-- script (run as supabase_admin). The hosted project's migrations run as
-- postgres; the supabase_admin-scoped ALTER DEFAULT PRIVILEGES does not cover
-- tables created by postgres, so no hosted table received the grants.
--
-- This is NOT a hosted-only patch: the gap exists in every environment that
-- does not replicate Supabase Docker's init.sql. Local masked it by running
-- seeds as a postgres superuser, bypassing object-level privilege checks
-- entirely. The grants below match what supabase start auto-applies locally.
--
-- Grant model:
--   service_role  — trusted backend (Edge Functions, seed scripts, pg_cron).
--                   BYPASSRLS=true skips row-level policies; but the role
--                   still needs object-level privileges to perform DML.
--                   → ALL on tables + sequences.
--
--   authenticated — app users (student, parent, teacher, org_admin,
--                   platform_admin). Object-level privilege gates DML attempts;
--                   RLS policies (per-table WITH CHECK) further restrict which
--                   rows each role may touch. Anon is never authenticated.
--                   → SELECT, INSERT, UPDATE, DELETE on tables.
--                   → USAGE, SELECT on sequences (needed for any
--                     SERIAL/sequence-backed column if one is added later).
--
--   anon          — unauthenticated PostgREST requests. No write policies exist
--                   for anon in any migration; all INSERT/UPDATE/DELETE policies
--                   require auth_role() claims. enable_anonymous_sign_ins=false
--                   in config.toml. Confirmed read-only.
--                   → SELECT on tables only.
--
-- Backfill + forward-coverage pattern:
--   GRANT ... ON ALL ...   covers tables that already exist (0001–0025).
--   ALTER DEFAULT PRIVILEGES covers tables created by future migrations.
--   Both are required; one without the other leaves a gap.
-- =============================================================================

-- ── service_role ─────────────────────────────────────────────────────────────

GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;

-- ── authenticated ─────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT
  ON ALL SEQUENCES IN SCHEMA public TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- ── anon (read-only) ──────────────────────────────────────────────────────────

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;
