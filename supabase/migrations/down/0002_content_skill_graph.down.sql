-- =============================================================================
-- Down Migration 0002 — Content & Skill Graph
-- Stage 3 · 2026-05-02
-- Reverses: 0002_content_skill_graph.sql
--
-- Drop order rationale:
-- 1. View first — depends on item and item_version; must go before tables.
-- 2. publish_skill_graph function — no table deps remain after view drop; must
--    go before fn_graph_version_is_published (no dep between them, but logically
--    publish belongs to the tables it operates on).
-- 3. Tables in reverse FK dependency order (most-dependent first):
--      item_version    (FK → item)
--      item            (FK → stimulus)
--      stimulus        (no FK deps to other Stage 3 tables)
--      repair_sequence (no FK deps)
--      misconception   (no FK deps)
--      skill_migration_map (FK → skill_graph_version ×2)
--      skill_edge      (FK → skill_graph_version, skill_node ×2)
--      skill_node      (FK → skill_graph_version; self-ref parent_id, domain_id)
--      skill_graph_version (FK → user_profile — Stage 2 table, not dropped here)
--    Dropping each table also drops: its indexes, triggers, RLS policies,
--    and constraints. No CASCADE needed when drop order respects FK deps.
-- 4. fn_graph_version_is_published function — all tables that reference it
--    in RLS policies are gone; safe to drop last.
-- =============================================================================

-- Step 1: Drop view
DROP VIEW IF EXISTS v_item_current;

-- Step 2: Drop publish_skill_graph function
DROP FUNCTION IF EXISTS publish_skill_graph(uuid);

-- Step 3: Drop tables in FK dependency order (most-dependent first)
DROP TABLE IF EXISTS item_version;
DROP TABLE IF EXISTS item;
DROP TABLE IF EXISTS stimulus;
DROP TABLE IF EXISTS repair_sequence;
DROP TABLE IF EXISTS misconception;
DROP TABLE IF EXISTS skill_migration_map;
DROP TABLE IF EXISTS skill_edge;
DROP TABLE IF EXISTS skill_node;
DROP TABLE IF EXISTS skill_graph_version;

-- Step 4: Drop SECURITY DEFINER helper
-- (All RLS policies referencing it are gone with their tables)
DROP FUNCTION IF EXISTS fn_graph_version_is_published(uuid);
