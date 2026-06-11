-- =============================================================================
-- Migration 0021 — Content Authoring Write-Side RLS
-- Stage: v1.1-S1 · 2026-05-14
-- Branch: v1.1/exam-content
-- Implements: ADR-0035 (Pattern G strict — platform_admin + service-role writes)
-- Spec refs: spec §15.3 (lifecycle FSM), arch §4.3 (content-svc endpoints)
--
-- NO new tables. NO new columns. NO new indexes.
-- Adds write-side RLS policies on existing item, item_version, stimulus tables
-- (migration 0002) for platform_admin Bearer access. Service-role bypasses RLS
-- per ENABLE (not FORCE) setting established in migration 0002 (ADR-0008).
--
-- Policy pattern mirrors assessment_config (migration 0003):
--   auth_role() = 'platform_admin'  →  allow write
--   all other authenticated roles   →  deny
--   service-role                    →  bypasses RLS (no FORCE RLS)
--
-- item:         INSERT + UPDATE (lifecycle, metadata, is_active mutable)
-- item_version: INSERT only (immutable after insert per migration 0002 lines 205–206;
--               is_current flip executed by service-role, bypasses RLS)
-- stimulus:     INSERT + UPDATE (content / metadata mutable in v1.1 authoring scope;
--               Q-1.1-1.7: "append-only" note in 0002 describes v1 usage pattern only)
-- =============================================================================

-- ── item ─────────────────────────────────────────────────────────────────────

CREATE POLICY "item_admin_insert" ON item
  FOR INSERT
  WITH CHECK (auth_role() = 'platform_admin');

CREATE POLICY "item_admin_update" ON item
  FOR UPDATE
  USING (auth_role() = 'platform_admin');

-- ── item_version ─────────────────────────────────────────────────────────────

CREATE POLICY "item_version_admin_insert" ON item_version
  FOR INSERT
  WITH CHECK (auth_role() = 'platform_admin');

-- ── stimulus ─────────────────────────────────────────────────────────────────

CREATE POLICY "stimulus_admin_insert" ON stimulus
  FOR INSERT
  WITH CHECK (auth_role() = 'platform_admin');

CREATE POLICY "stimulus_admin_update" ON stimulus
  FOR UPDATE
  USING (auth_role() = 'platform_admin');
