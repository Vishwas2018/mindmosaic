-- =============================================================================
-- Migration 0002 — Content & Skill Graph
-- Stage 3 · 2026-05-02
-- Implements: DEV_PLAN.md Stage 3; Arch §2.3
-- Spec refs: Spec Part III.5 §V1.4 (G4 publish guard); Arch §11.4 (publish_skill_graph)
-- ADRs: ADR-0007 (G4 publish guard: to_regclass forward-compatibility)
--       ADR-0008 (Content-table RLS: Pattern F with draft graph isolation)
-- Note: publish_skill_graph is SECURITY DEFINER — it reads draft edges (hidden to
--       authenticated under fn_graph_version_is_published policy) and writes
--       skill_graph_version (no authenticated write policy). See ADR-0008.
-- =============================================================================

-- =============================================================================
-- SECTION 1 — Tables
-- FK dependency order:
--   skill_graph_version
--   → skill_node (→ skill_graph_version; self-ref parent_id, domain_id)
--   → skill_edge (→ skill_graph_version, skill_node ×2)
--   → skill_migration_map (→ skill_graph_version ×2)
--   misconception (no FK deps within Stage 3)
--   repair_sequence (no FK deps within Stage 3)
--   stimulus (no FK deps)
--   → item (→ stimulus, nullable)
--   → item_version (→ item)
-- =============================================================================

CREATE TABLE skill_graph_version (
  id           uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  version      int                  NOT NULL,
  description  text,
  status       graph_version_status NOT NULL DEFAULT 'draft',
  node_count   int                  NOT NULL DEFAULT 0,
  edge_count   int                  NOT NULL DEFAULT 0,
  published_at timestamptz,
  archived_at  timestamptz,
  created_by   uuid                 REFERENCES user_profile(id) ON DELETE SET NULL,
  created_at   timestamptz          NOT NULL DEFAULT now(),
  updated_at   timestamptz          NOT NULL DEFAULT now()
);
-- Exactly one published version at a time
CREATE UNIQUE INDEX idx_sgv_published ON skill_graph_version(status) WHERE status = 'published';

-- ---------------------------------------------------------------------------

CREATE TABLE skill_node (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_version_id uuid        NOT NULL REFERENCES skill_graph_version(id) ON DELETE CASCADE,
  parent_id        uuid        REFERENCES skill_node(id) ON DELETE SET NULL,
  level            skill_level NOT NULL,
  name             text        NOT NULL,
  slug             text        NOT NULL,
  description      text,
  domain_id        uuid        REFERENCES skill_node(id) ON DELETE SET NULL,
  difficulty_min   real        NOT NULL DEFAULT 0.0 CHECK (difficulty_min BETWEEN 0 AND 1),
  difficulty_max   real        NOT NULL DEFAULT 1.0 CHECK (difficulty_max BETWEEN 0 AND 1),
  bloom_levels     bloom_level[] NOT NULL DEFAULT '{}',
  curriculum_codes text[]        NOT NULL DEFAULT '{}',
  pathway_tags     exam_family[] NOT NULL DEFAULT '{}',
  year_levels      int[]         NOT NULL DEFAULT '{}',
  is_active        boolean       NOT NULL DEFAULT true,
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT difficulty_range_valid CHECK (difficulty_min <= difficulty_max)
);
CREATE UNIQUE INDEX idx_skill_node_slug   ON skill_node(graph_version_id, slug);
CREATE        INDEX idx_skill_node_parent ON skill_node(parent_id);
CREATE        INDEX idx_skill_node_level  ON skill_node(graph_version_id, level);
CREATE        INDEX idx_skill_node_domain ON skill_node(domain_id);
CREATE        INDEX idx_skill_node_pathway ON skill_node USING GIN(pathway_tags);
CREATE        INDEX idx_skill_node_year   ON skill_node USING GIN(year_levels);

-- ---------------------------------------------------------------------------

CREATE TABLE skill_edge (
  id               uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_version_id uuid             NOT NULL REFERENCES skill_graph_version(id) ON DELETE CASCADE,
  source_id        uuid             NOT NULL REFERENCES skill_node(id) ON DELETE CASCADE,
  target_id        uuid             NOT NULL REFERENCES skill_node(id) ON DELETE CASCADE,
  edge_type        edge_type        NOT NULL,
  strength         real             NOT NULL CHECK (strength BETWEEN 0 AND 1),
  dependency_class dependency_class,
  created_at       timestamptz      NOT NULL DEFAULT now(),
  CONSTRAINT no_self_edge CHECK (source_id <> target_id),
  CONSTRAINT dep_class_consistency CHECK (
    (edge_type = 'prerequisite' AND dependency_class IS NOT NULL) OR
    (edge_type <> 'prerequisite' AND dependency_class IS NULL)
  ),
  CONSTRAINT dep_class_strength_consistency CHECK (
    dependency_class IS NULL
    OR (dependency_class = 'required'   AND strength >= 0.8)
    OR (dependency_class = 'supportive' AND strength >= 0.4 AND strength < 0.8)
    OR (dependency_class = 'enriching'  AND strength < 0.4)
  )
);
CREATE UNIQUE INDEX idx_skill_edge_unique ON skill_edge(graph_version_id, source_id, target_id, edge_type);
CREATE        INDEX idx_skill_edge_source ON skill_edge(graph_version_id, source_id);
CREATE        INDEX idx_skill_edge_target ON skill_edge(graph_version_id, target_id);
CREATE        INDEX idx_skill_edge_type   ON skill_edge(graph_version_id, edge_type);

-- ---------------------------------------------------------------------------

CREATE TABLE skill_migration_map (
  from_graph_version uuid NOT NULL REFERENCES skill_graph_version(id),
  to_graph_version   uuid NOT NULL REFERENCES skill_graph_version(id),
  old_skill_id       uuid NOT NULL,
  new_skill_id       uuid,  -- NULL means "retired without replacement"
  PRIMARY KEY (from_graph_version, to_graph_version, old_skill_id)
);

-- ---------------------------------------------------------------------------

CREATE TABLE misconception (
  id              uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text                    NOT NULL UNIQUE,
  description     text                    NOT NULL,
  category        misconception_category  NOT NULL,
  severity        misconception_severity  NOT NULL DEFAULT 'moderate',
  skill_ids       uuid[]                  NOT NULL DEFAULT '{}',
  detection_rules jsonb                   NOT NULL DEFAULT '{}',
  year_levels     int[]                   NOT NULL DEFAULT '{}',
  is_active       boolean                 NOT NULL DEFAULT true,
  created_at      timestamptz             NOT NULL DEFAULT now(),
  updated_at      timestamptz             NOT NULL DEFAULT now()
);
CREATE INDEX idx_misc_skills ON misconception USING GIN(skill_ids);

-- ---------------------------------------------------------------------------

CREATE TABLE repair_sequence (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type               text        NOT NULL CHECK (target_type IN ('misconception', 'root_cause_skill')),
  target_id                 uuid        NOT NULL,  -- misconception.id OR skill_node.id (no FK — cross-type ref)
  display_name              text        NOT NULL,
  year_levels               int[]       NOT NULL DEFAULT '{}',
  estimated_duration_minutes int        NOT NULL DEFAULT 15,
  stages                    jsonb       NOT NULL,
  mastery_check_item_ids    uuid[]      NOT NULL DEFAULT '{}',
  success_threshold         real        NOT NULL DEFAULT 0.8 CHECK (success_threshold BETWEEN 0 AND 1),
  is_active                 boolean     NOT NULL DEFAULT true,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_repair_seq_target ON repair_sequence(target_type, target_id);

-- ---------------------------------------------------------------------------

CREATE TABLE stimulus (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  type               stimulus_type NOT NULL,
  content            jsonb         NOT NULL,
  source_attribution text,
  year_levels        int[]         NOT NULL DEFAULT '{}',
  exam_families      exam_family[] NOT NULL DEFAULT '{}',
  is_active          boolean       NOT NULL DEFAULT true,
  created_at         timestamptz   NOT NULL DEFAULT now()
  -- No updated_at: stimulus is append-only / replaced-not-updated in v1
);

-- ---------------------------------------------------------------------------

CREATE TABLE item (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  source_item_id     text,
  stimulus_id        uuid          REFERENCES stimulus(id),
  response_type      response_type NOT NULL,
  skill_ids          uuid[]        NOT NULL CHECK (array_length(skill_ids, 1) >= 1),
  difficulty         real          NOT NULL CHECK (difficulty BETWEEN 0 AND 1),
  discrimination     real,
  expected_time_secs int,
  year_levels        int[]         NOT NULL CHECK (array_length(year_levels, 1) >= 1),
  exam_families      exam_family[] NOT NULL CHECK (array_length(exam_families, 1) >= 1),
  programs           text[]        NOT NULL DEFAULT '{}',
  countries          text[]        NOT NULL DEFAULT '{}',
  curricula          text[]        NOT NULL DEFAULT '{}',
  bloom_level        bloom_level,
  lifecycle          item_lifecycle NOT NULL DEFAULT 'draft',
  is_active          boolean        NOT NULL DEFAULT true,
  current_version    int            NOT NULL DEFAULT 1,
  created_at         timestamptz    NOT NULL DEFAULT now(),
  updated_at         timestamptz    NOT NULL DEFAULT now()
);
CREATE INDEX idx_item_skills     ON item USING GIN(skill_ids);
CREATE INDEX idx_item_exam       ON item USING GIN(exam_families);
CREATE INDEX idx_item_year       ON item USING GIN(year_levels);
CREATE INDEX idx_item_difficulty ON item(difficulty) WHERE is_active = true;
CREATE INDEX idx_item_lifecycle  ON item(lifecycle)  WHERE is_active = true;

-- ---------------------------------------------------------------------------

CREATE TABLE item_version (
  item_id              uuid        NOT NULL REFERENCES item(id),
  version              int         NOT NULL,
  stem                 jsonb       NOT NULL,
  response_config      jsonb       NOT NULL,
  distractor_rationale jsonb,
  explanation          jsonb,
  metadata             jsonb       NOT NULL DEFAULT '{}',
  difficulty           real        NOT NULL,
  discrimination       real,
  is_current           boolean     NOT NULL DEFAULT true,
  supersedes          int,
  created_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (item_id, version)
  -- No updated_at: item_version is immutable after insert.
  -- Writer contract: UPDATE prior current row to is_current = false BEFORE inserting
  -- new row. idx_item_version_current_one enforces at most one current version.
  -- See OWNERS.md content-svc item_version entry for full contract.
);
CREATE UNIQUE INDEX idx_item_version_current_one
  ON item_version(item_id) WHERE is_current = true;

-- =============================================================================
-- SECTION 2 — Canonical read view
-- WITH (security_invoker = true): RLS on item and item_version is evaluated under
-- the calling role, not the view owner. Defence-in-depth: prevents the view from
-- bypassing the item_version RLS policy (is_current = true filter). PG 15+.
-- =============================================================================

CREATE VIEW v_item_current WITH (security_invoker = true) AS
SELECT
  i.id,
  i.source_item_id,
  i.stimulus_id,
  i.response_type,
  i.skill_ids,
  i.difficulty,
  i.discrimination,
  i.expected_time_secs,
  i.year_levels,
  i.exam_families,
  i.programs,
  i.countries,
  i.curricula,
  i.bloom_level,
  i.lifecycle,
  i.is_active,
  i.current_version,
  iv.stem,
  iv.response_config,
  iv.distractor_rationale,
  iv.explanation,
  iv.metadata
FROM item i
JOIN item_version iv ON iv.item_id = i.id AND iv.is_current = true;

-- =============================================================================
-- SECTION 3 — SECURITY DEFINER helper for draft graph isolation
-- Must be created AFTER skill_graph_version (SQL language resolves table refs
-- at parse/creation time, not execution time — unlike plpgsql).
-- Per ADR-0005 pattern: SET search_path, REVOKE FROM PUBLIC, GRANT TO authenticated.
-- Per ADR-0008: used in skill_node + skill_edge RLS SELECT policies.
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_graph_version_is_published(gv_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM skill_graph_version
    WHERE id = gv_id AND status = 'published'
  );
$$;

REVOKE EXECUTE ON FUNCTION fn_graph_version_is_published(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION fn_graph_version_is_published(uuid) TO   authenticated;

-- =============================================================================
-- SECTION 4 — set_updated_at triggers (mutable tables only)
-- Mutable in v1: skill_graph_version (controlled mutable), skill_node (within draft),
--               misconception, repair_sequence, item.
-- No trigger on: skill_edge (immutable within version), skill_migration_map (no
--               updated_at col), stimulus (no updated_at col), item_version (immutable).
-- =============================================================================

CREATE TRIGGER trg_sgv_updated_at
  BEFORE UPDATE ON skill_graph_version
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_skill_node_updated_at
  BEFORE UPDATE ON skill_node
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_misconception_updated_at
  BEFORE UPDATE ON misconception
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_repair_sequence_updated_at
  BEFORE UPDATE ON repair_sequence
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_item_updated_at
  BEFORE UPDATE ON item
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- SECTION 5 — publish_skill_graph (SECURITY DEFINER, plpgsql)
-- plpgsql required (not sql): to_regclass G4 guard uses late-bound table refs for
-- Stage 6 tables (skill_mastery, student_misconception, learning_plan) that do not
-- exist until Stage 6. plpgsql resolves at execution time; sql resolves at parse time.
-- SECURITY DEFINER required: (a) reads draft skill_edge rows (not visible to
-- authenticated under fn_graph_version_is_published policy), (b) writes
-- skill_graph_version (no authenticated write policy under Pattern F). ADR-0008.
-- Step ordering per ADR-0007: cycle detection FIRST, G4 guard SECOND.
-- =============================================================================

CREATE OR REPLACE FUNCTION publish_skill_graph(graph_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  cycle_path        uuid[];
  slug_path         text;
  v_has_downstream  boolean;
  v_node_count      int;
  v_edge_count      int;
BEGIN
  -- STEP 1: Cycle detection — prerequisite edges only
  -- A cyclic graph is always invalid regardless of downstream data; reject first
  -- for the clearer, more actionable error (ADR-0007 ordering rationale).
  WITH RECURSIVE cycle_check AS (
    SELECT source_id,
           target_id,
           ARRAY[source_id, target_id] AS path,
           false AS is_cycle
    FROM   skill_edge
    WHERE  graph_version_id = graph_id
      AND  edge_type = 'prerequisite'
    UNION ALL
    SELECT c.source_id,
           e.target_id,
           c.path || e.target_id,
           e.target_id = ANY(c.path)
    FROM   cycle_check c
    JOIN   skill_edge e ON e.source_id = c.target_id
    WHERE  e.graph_version_id = graph_id
      AND  e.edge_type = 'prerequisite'
      AND  NOT c.is_cycle
      AND  array_length(c.path, 1) < 20
  )
  SELECT path INTO cycle_path
  FROM   cycle_check
  WHERE  is_cycle
  LIMIT  1;

  IF cycle_path IS NOT NULL THEN
    -- Build human-readable slug path for debuggability (ADR-0007 §Cycle path RAISE form).
    -- LEFT JOIN + COALESCE: concurrent-delete edge case degrades to UUID text safely.
    SELECT string_agg(COALESCE(sn.slug, u.node_id::text), ' → ' ORDER BY u.ord)
    INTO   slug_path
    FROM   unnest(cycle_path) WITH ORDINALITY AS u(node_id, ord)
    LEFT   JOIN skill_node sn
           ON sn.id = u.node_id AND sn.graph_version_id = graph_id;

    RAISE EXCEPTION 'CYCLE_DETECTED: prerequisite cycle in graph %: %',
                    graph_id, slug_path;
  END IF;

  -- STEP 2: G4 data guard — block publish when downstream student data exists.
  -- Each check uses IF to_regclass() + EXECUTE (dynamic SQL) so that Stage 6 table
  -- names (skill_mastery, student_misconception, learning_plan) are never parsed by
  -- PL/pgSQL when the table is absent. A plain SELECT with to_regclass() short-circuit
  -- is insufficient: PL/pgSQL parses the full SQL at execution time regardless of
  -- boolean short-circuit, producing "relation does not exist" for absent tables.
  -- EXECUTE defers parsing until after the to_regclass() guard confirms existence
  -- (ADR-0007 implementation note: EXECUTE required, not plain SELECT short-circuit).
  v_has_downstream := false;

  IF to_regclass('public.skill_mastery') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM skill_mastery LIMIT 1)'
    INTO v_has_downstream;
  END IF;

  IF NOT v_has_downstream AND to_regclass('public.student_misconception') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM student_misconception LIMIT 1)'
    INTO v_has_downstream;
  END IF;

  IF NOT v_has_downstream AND to_regclass('public.learning_plan') IS NOT NULL THEN
    EXECUTE $dyn$SELECT EXISTS (SELECT 1 FROM learning_plan WHERE status = 'active' LIMIT 1)$dyn$
    INTO v_has_downstream;
  END IF;

  IF v_has_downstream THEN
    RAISE EXCEPTION
      'PUBLISH_BLOCKED: downstream student data exists; '
      'run skill_graph_migration worker before publishing a new graph version';
  END IF;

  -- STEP 3: Archive the currently published version (if any)
  UPDATE skill_graph_version
     SET status      = 'archived',
         archived_at = now()
   WHERE status = 'published';

  -- STEP 4: Update node/edge counts and publish the target draft.
  -- Counts are stamped at publish time when the graph content is final.
  SELECT COUNT(*) INTO v_node_count FROM skill_node WHERE graph_version_id = graph_id;
  SELECT COUNT(*) INTO v_edge_count FROM skill_edge WHERE graph_version_id = graph_id;

  UPDATE skill_graph_version
     SET status       = 'published',
         published_at = now(),
         node_count   = v_node_count,
         edge_count   = v_edge_count
   WHERE id     = graph_id
     AND status = 'draft';

  -- Single message covers "graph not found" and "graph not in draft state" —
  -- a SELECT-before-UPDATE would introduce TOCTOU without eliminating the
  -- "concurrent modification" case (ADR-0007 §IF NOT FOUND single-message scope).
  IF NOT FOUND THEN
    RAISE EXCEPTION
      'GRAPH_NOT_DRAFT: graph % not found or not in draft state', graph_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION publish_skill_graph(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION publish_skill_graph(uuid) FROM authenticated;
-- Double REVOKE: Supabase local dev may apply default EXECUTE grants to authenticated
-- on all functions in the public schema. Explicit revoke ensures the intent holds
-- regardless of environment-level defaults. No GRANT to authenticated in v1.
-- If an authenticated admin endpoint is added at Stage 18+, add:
--   GRANT EXECUTE ON FUNCTION publish_skill_graph(uuid) TO authenticated;
--   plus an internal role guard inside the function body (ADR-0008 §Follow-ups).

COMMENT ON FUNCTION publish_skill_graph(uuid) IS
  'Publishes a draft skill graph version. '
  'STEP 1: validates no prerequisite cycles (CYCLE_DETECTED). '
  'STEP 2: G4 guard — blocks publish when downstream student data exists; '
  'to_regclass() + EXECUTE (dynamic SQL) allow callable before Stage 6 tables exist (ADR-0007). '
  'STEP 3: archives current published version. '
  'STEP 4: publishes draft with updated node/edge counts. '
  'SECURITY DEFINER: reads draft edges (hidden to authenticated) and writes '
  'skill_graph_version with no authenticated write policy (ADR-0008).';

-- =============================================================================
-- SECTION 6 — Row-Level Security
-- Per ADR-0008: Pattern F — ENABLE ROW LEVEL SECURITY (no FORCE).
-- FORCE RLS would apply policies to the table owner/service_role, blocking
-- the writes that Pattern F intentionally allows. Standard ENABLE lets
-- service_role bypass all policies. No authenticated write policies are added —
-- all writes are performed via service_role (seed scripts, Edge Functions).
-- Draft graph isolation: fn_graph_version_is_published() SECURITY DEFINER helper.
-- =============================================================================

-- skill_graph_version: only published versions visible to authenticated
ALTER TABLE skill_graph_version ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sgv_published_select" ON skill_graph_version
  FOR SELECT
  USING (status = 'published');

-- ---------------------------------------------------------------------------

-- skill_node: visible when its graph version is published (SECURITY DEFINER helper
-- avoids recursive RLS evaluation per ADR-0005)
ALTER TABLE skill_node ENABLE ROW LEVEL SECURITY;

CREATE POLICY "skill_node_published_select" ON skill_node
  FOR SELECT
  USING (fn_graph_version_is_published(graph_version_id));

-- ---------------------------------------------------------------------------

-- skill_edge: same isolation as skill_node
ALTER TABLE skill_edge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "skill_edge_published_select" ON skill_edge
  FOR SELECT
  USING (fn_graph_version_is_published(graph_version_id));

-- ---------------------------------------------------------------------------

-- skill_migration_map: no authenticated SELECT policy (service_role only reads/writes)
-- Used only by the migration worker (v1.1). RLS enabled; no policy = deny-all to
-- authenticated. Correct — authenticated clients have no business reading raw
-- migration maps.
ALTER TABLE skill_migration_map ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------

-- misconception: public catalog — all authenticated can read
ALTER TABLE misconception ENABLE ROW LEVEL SECURITY;

CREATE POLICY "misconception_select" ON misconception
  FOR SELECT
  USING (true);

-- ---------------------------------------------------------------------------

-- repair_sequence: public catalog — all authenticated can read
ALTER TABLE repair_sequence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "repair_seq_select" ON repair_sequence
  FOR SELECT
  USING (true);

-- ---------------------------------------------------------------------------

-- stimulus: public catalog — all authenticated can read
ALTER TABLE stimulus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stimulus_select" ON stimulus
  FOR SELECT
  USING (true);

-- ---------------------------------------------------------------------------

-- item: public catalog — all authenticated can read
ALTER TABLE item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "item_select" ON item
  FOR SELECT
  USING (true);

-- ---------------------------------------------------------------------------

-- item_version: only current versions visible to authenticated (defence-in-depth).
-- Prior versions are content history irrelevant to assessment. v_item_current already
-- enforces this via JOIN; the RLS policy is an additional layer per ADR-0008.
ALTER TABLE item_version ENABLE ROW LEVEL SECURITY;

CREATE POLICY "item_version_current_select" ON item_version
  FOR SELECT
  USING (is_current = true);
