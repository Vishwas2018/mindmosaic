-- =============================================================================
-- Migration 0005 — Intelligence Foundation
-- Stage 6 · 2026-05-03
-- Implements: DEV_PLAN.md Stage 6; Arch §2.8–§2.10
-- Spec refs: Spec §7–§16
-- ADRs: ADR-0011 (Pattern A helpers reused from Migration 0004 — no new helpers)
--       ADR-0012 (partitioned PK — intelligence_audit_log PK includes created_at)
--       ADR-0013 (row-level RLS + app-layer column redaction for audit tables)
-- Deviations from arch (logged in Stage 6 DAILY_LOG):
--   cohort_metric_cache: tenant_id added (not in arch §2.10 DDL); arch §3.2 Pattern G
--     overridden to selective-grant per D3 (§2A Stage 6 approval); tenant_id included in
--     PRIMARY KEY to prevent PK conflicts for aggregate cohort_key values across tenants.
--     Stage 19+ analytics pipeline must populate tenant_id on all INSERTs.
-- intelligence_audit_log: Pattern A (D1 — row-level); app-layer (intelligence-svc, Stage 18+)
--   must enforce column projection — only decision_type, decision_summary, created_at to
--   authenticated clients (NOT input_snapshot, algorithm_version, trace_id). ADR-0013.
-- intervention_alert: no student SELECT in v1 (D4). teacher access via teacher_id = auth_user_id()
--   (direct column ref — no fn_teacher_student_ids() needed; no ADR-0005 recursion risk).
--   If Stage 18+ creates any view exposing intervention_alert to students, that view MUST
--   use WITH (security_invoker = true) per Stage 3 v_item_current precedent.
-- intelligence_audit_log + learning_event: default partition only in v1. Monthly carve-up
--   deferred to v1.1 (or earlier if query latency degrades). pg_partman / manual migration.
-- =============================================================================

-- =============================================================================
-- SECTION 1 — TABLES (FK dependency order)
-- Arch §2.8: skill_mastery, learning_velocity, behaviour_profile,
--             student_misconception, repair_record, intelligence_audit_log
-- Arch §2.9: learning_plan, plan_revision, recommendation, plan_override
-- Arch §2.10: intervention_alert, cohort_metric_cache
-- =============================================================================

CREATE TABLE skill_mastery (
  student_id       uuid NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  skill_id         uuid NOT NULL REFERENCES skill_node(id)   ON DELETE CASCADE,
  tenant_id        uuid NOT NULL REFERENCES tenant(id)       ON DELETE CASCADE,
  mastery_level    real NOT NULL DEFAULT 0.0 CHECK (mastery_level BETWEEN 0 AND 1),
  confidence       real NOT NULL DEFAULT 0.0 CHECK (confidence  BETWEEN 0 AND 1),
  total_attempts   int  NOT NULL DEFAULT 0,
  correct_attempts int  NOT NULL DEFAULT 0,
  last_attempted_at timestamptz,
  streak_current   int  NOT NULL DEFAULT 0,
  streak_best      int  NOT NULL DEFAULT 0,
  history          jsonb NOT NULL DEFAULT '[]',
  updated_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, skill_id)
);

CREATE TABLE learning_velocity (
  student_id  uuid NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  skill_id    uuid NOT NULL REFERENCES skill_node(id)   ON DELETE CASCADE,
  tenant_id   uuid NOT NULL,
  velocity    real NOT NULL DEFAULT 0.0,
  window_days int  NOT NULL DEFAULT 14,
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, skill_id)
);

CREATE TABLE behaviour_profile (
  student_id                 uuid PRIMARY KEY REFERENCES user_profile(id) ON DELETE CASCADE,
  tenant_id                  uuid NOT NULL,
  avg_guess_rate             real NOT NULL DEFAULT 0.1,
  avg_fatigue_onset_minutes  int  NOT NULL DEFAULT 20,
  persistence_score          real NOT NULL DEFAULT 0.5,
  avg_cognitive_load_comfort real NOT NULL DEFAULT 0.4,
  time_pressure_sensitivity  real NOT NULL DEFAULT 0.3,
  session_length_sweet_spot  int  NOT NULL DEFAULT 20,
  data_points                int  NOT NULL DEFAULT 0,
  computed_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE student_misconception (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       uuid NOT NULL REFERENCES user_profile(id)   ON DELETE CASCADE,
  tenant_id        uuid NOT NULL REFERENCES tenant(id)         ON DELETE CASCADE,
  misconception_id uuid NOT NULL REFERENCES misconception(id)  ON DELETE RESTRICT,
  detected_at      timestamptz NOT NULL DEFAULT now(),
  evidence         jsonb NOT NULL DEFAULT '{}',
  confidence       real NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  status           misconception_status NOT NULL DEFAULT 'suspected',
  repair_attempts  int NOT NULL DEFAULT 0,
  resolved_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE repair_record (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id              uuid NOT NULL REFERENCES user_profile(id)     ON DELETE CASCADE,
  tenant_id               uuid NOT NULL REFERENCES tenant(id)           ON DELETE CASCADE,
  repair_sequence_id      uuid NOT NULL REFERENCES repair_sequence(id)  ON DELETE RESTRICT,
  misconception_id        uuid REFERENCES misconception(id)             ON DELETE SET NULL,
  root_cause_skill_id     uuid REFERENCES skill_node(id)               ON DELETE SET NULL,
  status                  repair_status NOT NULL DEFAULT 'queued',
  started_at              timestamptz,
  completed_at            timestamptz,
  stages_completed        int NOT NULL DEFAULT 0,
  total_stages            int NOT NULL DEFAULT 0,
  mastery_check_score     real,
  follow_up_assessment_at timestamptz,
  follow_up_result        follow_up_result,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- intelligence_audit_log: PARTITIONED BY RANGE(created_at) per arch §2.8.
-- PRIMARY KEY (id, created_at) per ADR-0012 — partitioned PK must include all partition key cols.
-- Append-only (arch §1.3): only INSERT; no UPDATE/DELETE. Service_role (INT) is sole writer.
-- v1 ships with default partition only. Monthly carve-up deferred to v1.1 (CLARIFICATION 1).
CREATE TABLE intelligence_audit_log (
  id                uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id        uuid NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  tenant_id         uuid NOT NULL REFERENCES tenant(id)       ON DELETE CASCADE,
  event_type        text NOT NULL,
  input_snapshot    jsonb NOT NULL,
  output            jsonb NOT NULL,
  explanation       jsonb,
  layer             text NOT NULL,
  algorithm_version text NOT NULL,
  trace_id          uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE intelligence_audit_log_default
  PARTITION OF intelligence_audit_log DEFAULT;

CREATE TABLE learning_plan (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id                  uuid NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  tenant_id                   uuid NOT NULL REFERENCES tenant(id)       ON DELETE CASCADE,
  plan_type                   plan_type  NOT NULL,
  status                      plan_status NOT NULL DEFAULT 'active',
  valid_until                 timestamptz NOT NULL,
  sessions                    jsonb NOT NULL DEFAULT '[]',
  constraints_applied         jsonb NOT NULL DEFAULT '{}',
  milestones                  jsonb,
  generated_algorithm_version text NOT NULL,
  stale_since                 timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- plan_revision: append-only (arch §1.3); Pattern G RLS (D2 — deny-all authenticated).
-- Service_role (ORC) is sole writer. Application never exposes plan_revision to clients directly.
CREATE TABLE plan_revision (
  plan_id      uuid NOT NULL REFERENCES learning_plan(id) ON DELETE CASCADE,
  revision     int  NOT NULL,
  reason       text NOT NULL,
  diff_summary jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_id, revision)
);

CREATE TABLE recommendation (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       uuid NOT NULL REFERENCES user_profile(id)    ON DELETE CASCADE,
  tenant_id        uuid NOT NULL REFERENCES tenant(id)          ON DELETE CASCADE,
  plan_id          uuid REFERENCES learning_plan(id)            ON DELETE SET NULL,
  mode             session_mode NOT NULL,
  target_skills    uuid[] NOT NULL,
  difficulty_range jsonb,
  rationale        text NOT NULL,
  priority         text NOT NULL DEFAULT 'medium',
  status           plan_session_status NOT NULL DEFAULT 'pending',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE plan_override (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  tenant_id  uuid NOT NULL REFERENCES tenant(id)       ON DELETE CASCADE,
  actor_id   uuid NOT NULL REFERENCES user_profile(id) ON DELETE RESTRICT,
  type       plan_override_type NOT NULL,
  target     jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- intervention_alert: Pattern A variant (D4 — no student SELECT policy).
-- teacher_id is NOT NULL (X1 confirmed — all alerts are addressed to a specific teacher).
-- Teacher access via teacher_id = auth_user_id() — direct column ref, no cross-table join,
-- no ADR-0005 recursion risk. fn_teacher_student_ids() not needed for this table.
CREATE TABLE intervention_alert (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       uuid NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  tenant_id        uuid NOT NULL REFERENCES tenant(id)       ON DELETE CASCADE,
  class_id         uuid REFERENCES class_group(id)          ON DELETE SET NULL,
  teacher_id       uuid NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  alert_type       alert_type   NOT NULL,
  severity         alert_severity NOT NULL DEFAULT 'info',
  status           alert_status   NOT NULL DEFAULT 'active',
  detail           jsonb NOT NULL DEFAULT '{}',
  suggested_action text,
  explanation      jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  acknowledged_at  timestamptz,
  resolved_at      timestamptz
);

-- cohort_metric_cache: arch §2.10 has no tenant_id and arch §3.2 lists as Pattern G.
-- D3 (§2A Stage 6 approval) overrides: tenant_id added for RLS tenant isolation.
-- tenant_id added to PRIMARY KEY to prevent PK conflicts for aggregate cohort_key values
-- (e.g. 'year:5:naplan') that would otherwise collide across tenants.
-- Arch §3.2 Pattern G overridden to selective-grant: teacher/org_admin/platform_admin SELECT
-- with tenant isolation; no student/parent/anon access.
CREATE TABLE cohort_metric_cache (
  cohort_key  text NOT NULL,
  metric_key  text NOT NULL,
  time_bucket text NOT NULL,
  tenant_id   uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  value       jsonb NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cohort_key, metric_key, time_bucket, tenant_id)
);

-- =============================================================================
-- SECTION 2 — UPDATED_AT TRIGGERS
-- Mutable tables: skill_mastery, behaviour_profile, student_misconception,
--                 repair_record, learning_plan, recommendation, intervention_alert.
-- No trigger on: learning_velocity (computed_at only), intelligence_audit_log (append-only),
--                plan_revision (append-only), plan_override (created_at only),
--                cohort_metric_cache (computed_at only).
-- =============================================================================

CREATE TRIGGER trg_skill_mastery_updated_at
  BEFORE UPDATE ON skill_mastery
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_behaviour_profile_updated_at
  BEFORE UPDATE ON behaviour_profile
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_student_misconception_updated_at
  BEFORE UPDATE ON student_misconception
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_repair_record_updated_at
  BEFORE UPDATE ON repair_record
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_learning_plan_updated_at
  BEFORE UPDATE ON learning_plan
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_recommendation_updated_at
  BEFORE UPDATE ON recommendation
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_intervention_alert_updated_at
  BEFORE UPDATE ON intervention_alert
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- SECTION 3 — INDEXES
-- =============================================================================

CREATE INDEX idx_mastery_tenant ON skill_mastery(tenant_id);
CREATE INDEX idx_mastery_level  ON skill_mastery(student_id, mastery_level);

CREATE INDEX idx_sm_student_status ON student_misconception(student_id, status);
CREATE INDEX idx_sm_active         ON student_misconception(student_id)
  WHERE status IN ('active', 'suspected');

CREATE INDEX idx_repair_student_status ON repair_record(student_id, status);

-- C7 concurrency guard: prevent double-queuing same misconception or same root-cause skill.
-- Exact predicates per Arch §2.3 change log C7 (DEV_PLAN Stage 6 risk note).
CREATE UNIQUE INDEX idx_repair_one_open_per_misc ON repair_record(student_id, misconception_id)
  WHERE status IN ('queued', 'in_progress') AND misconception_id IS NOT NULL;
CREATE UNIQUE INDEX idx_repair_one_open_per_skill ON repair_record(student_id, root_cause_skill_id)
  WHERE status IN ('queued', 'in_progress') AND root_cause_skill_id IS NOT NULL;

CREATE INDEX idx_audit_student ON intelligence_audit_log(student_id, created_at DESC);
CREATE INDEX idx_audit_type    ON intelligence_audit_log(event_type,  created_at DESC);

-- Partial unique: one active plan per student per plan_type.
CREATE UNIQUE INDEX idx_plan_active  ON learning_plan(student_id, plan_type) WHERE status = 'active';
CREATE        INDEX idx_plan_expiry  ON learning_plan(valid_until) WHERE status = 'active';

CREATE INDEX idx_rec_student          ON recommendation(student_id, status);
CREATE INDEX idx_plan_override_active ON plan_override(student_id, type, expires_at);
CREATE INDEX idx_alert_teacher_status ON intervention_alert(teacher_id, status);

CREATE INDEX idx_cmc_cohort ON cohort_metric_cache(cohort_key, computed_at DESC);
CREATE INDEX idx_cmc_tenant ON cohort_metric_cache(tenant_id);

-- =============================================================================
-- SECTION 4 — RLS + POLICIES
--
-- Pattern A (all tables with student_id + tenant_id):
--   Reuses fn_my_child_ids() and fn_teacher_student_ids() from Migration 0004 (ADR-0011).
--   No new SECURITY DEFINER helpers (§2A item iii confirmed at Stage 6 §2A review).
--   USING expression: student_id = auth_user_id()
--                  OR student_id = ANY(fn_my_child_ids())
--                  OR student_id = ANY(fn_teacher_student_ids())
--                  OR auth_role() IN ('org_admin', 'platform_admin') [scoped by tenant_id]
--
-- Special cases:
--   intelligence_audit_log — Pattern A D1: student/parent/teacher SELECT only;
--     org_admin/platform_admin FOR ALL. App-layer column redaction per ADR-0013.
--   intervention_alert — Pattern A D4: no student SELECT; teacher via teacher_id col.
--   plan_revision — Pattern G: deny-all authenticated.
--   cohort_metric_cache — D3: teacher/org_admin/platform_admin SELECT with tenant isolation.
-- =============================================================================

-- --- skill_mastery (Pattern A) ---
ALTER TABLE skill_mastery ENABLE ROW LEVEL SECURITY;

CREATE POLICY sm_student_select ON skill_mastery
  FOR SELECT USING (auth_role() = 'student' AND student_id = auth_user_id());
CREATE POLICY sm_parent_select ON skill_mastery
  FOR SELECT USING (auth_role() = 'parent' AND student_id = ANY(fn_my_child_ids()));
CREATE POLICY sm_teacher_select ON skill_mastery
  FOR SELECT USING (auth_role() IN ('teacher', 'tutor') AND student_id = ANY(fn_teacher_student_ids()));
CREATE POLICY sm_org_admin ON skill_mastery
  FOR ALL USING (auth_role() = 'org_admin' AND tenant_id = auth_tenant_id());
CREATE POLICY sm_platform_admin ON skill_mastery
  FOR ALL USING (auth_role() = 'platform_admin');

-- --- learning_velocity (Pattern A; tenant_id denormalized — no FK, but used in RLS) ---
ALTER TABLE learning_velocity ENABLE ROW LEVEL SECURITY;

CREATE POLICY lv_student_select ON learning_velocity
  FOR SELECT USING (auth_role() = 'student' AND student_id = auth_user_id());
CREATE POLICY lv_parent_select ON learning_velocity
  FOR SELECT USING (auth_role() = 'parent' AND student_id = ANY(fn_my_child_ids()));
CREATE POLICY lv_teacher_select ON learning_velocity
  FOR SELECT USING (auth_role() IN ('teacher', 'tutor') AND student_id = ANY(fn_teacher_student_ids()));
CREATE POLICY lv_org_admin ON learning_velocity
  FOR ALL USING (auth_role() = 'org_admin' AND tenant_id = auth_tenant_id());
CREATE POLICY lv_platform_admin ON learning_velocity
  FOR ALL USING (auth_role() = 'platform_admin');

-- --- behaviour_profile (Pattern A; tenant_id denormalized — no FK) ---
ALTER TABLE behaviour_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY bp_student_select ON behaviour_profile
  FOR SELECT USING (auth_role() = 'student' AND student_id = auth_user_id());
CREATE POLICY bp_parent_select ON behaviour_profile
  FOR SELECT USING (auth_role() = 'parent' AND student_id = ANY(fn_my_child_ids()));
CREATE POLICY bp_teacher_select ON behaviour_profile
  FOR SELECT USING (auth_role() IN ('teacher', 'tutor') AND student_id = ANY(fn_teacher_student_ids()));
CREATE POLICY bp_org_admin ON behaviour_profile
  FOR ALL USING (auth_role() = 'org_admin' AND tenant_id = auth_tenant_id());
CREATE POLICY bp_platform_admin ON behaviour_profile
  FOR ALL USING (auth_role() = 'platform_admin');

-- --- student_misconception (Pattern A) ---
ALTER TABLE student_misconception ENABLE ROW LEVEL SECURITY;

CREATE POLICY stm_student_select ON student_misconception
  FOR SELECT USING (auth_role() = 'student' AND student_id = auth_user_id());
CREATE POLICY stm_parent_select ON student_misconception
  FOR SELECT USING (auth_role() = 'parent' AND student_id = ANY(fn_my_child_ids()));
CREATE POLICY stm_teacher_select ON student_misconception
  FOR SELECT USING (auth_role() IN ('teacher', 'tutor') AND student_id = ANY(fn_teacher_student_ids()));
CREATE POLICY stm_org_admin ON student_misconception
  FOR ALL USING (auth_role() = 'org_admin' AND tenant_id = auth_tenant_id());
CREATE POLICY stm_platform_admin ON student_misconception
  FOR ALL USING (auth_role() = 'platform_admin');

-- --- repair_record (Pattern A) ---
ALTER TABLE repair_record ENABLE ROW LEVEL SECURITY;

CREATE POLICY rr_student_select ON repair_record
  FOR SELECT USING (auth_role() = 'student' AND student_id = auth_user_id());
CREATE POLICY rr_parent_select ON repair_record
  FOR SELECT USING (auth_role() = 'parent' AND student_id = ANY(fn_my_child_ids()));
CREATE POLICY rr_teacher_select ON repair_record
  FOR SELECT USING (auth_role() IN ('teacher', 'tutor') AND student_id = ANY(fn_teacher_student_ids()));
CREATE POLICY rr_org_admin ON repair_record
  FOR ALL USING (auth_role() = 'org_admin' AND tenant_id = auth_tenant_id());
CREATE POLICY rr_platform_admin ON repair_record
  FOR ALL USING (auth_role() = 'platform_admin');

-- --- intelligence_audit_log (Pattern A D1: student/parent/teacher SELECT only) ---
-- No INSERT/UPDATE/DELETE for authenticated roles — service_role (INT) is the sole writer.
-- Column-level redaction (input_snapshot, algorithm_version, trace_id) is application-layer
-- responsibility per ADR-0013. Stage 18+ intelligence-svc must enforce column projection.
ALTER TABLE intelligence_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY ial_student_select ON intelligence_audit_log
  FOR SELECT USING (auth_role() = 'student' AND student_id = auth_user_id());
CREATE POLICY ial_parent_select ON intelligence_audit_log
  FOR SELECT USING (auth_role() = 'parent' AND student_id = ANY(fn_my_child_ids()));
CREATE POLICY ial_teacher_select ON intelligence_audit_log
  FOR SELECT USING (auth_role() IN ('teacher', 'tutor') AND student_id = ANY(fn_teacher_student_ids()));
CREATE POLICY ial_org_admin ON intelligence_audit_log
  FOR ALL USING (auth_role() = 'org_admin' AND tenant_id = auth_tenant_id());
CREATE POLICY ial_platform_admin ON intelligence_audit_log
  FOR ALL USING (auth_role() = 'platform_admin');

-- --- learning_plan (Pattern A) ---
ALTER TABLE learning_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY lp_student_select ON learning_plan
  FOR SELECT USING (auth_role() = 'student' AND student_id = auth_user_id());
CREATE POLICY lp_parent_select ON learning_plan
  FOR SELECT USING (auth_role() = 'parent' AND student_id = ANY(fn_my_child_ids()));
CREATE POLICY lp_teacher_select ON learning_plan
  FOR SELECT USING (auth_role() IN ('teacher', 'tutor') AND student_id = ANY(fn_teacher_student_ids()));
CREATE POLICY lp_org_admin ON learning_plan
  FOR ALL USING (auth_role() = 'org_admin' AND tenant_id = auth_tenant_id());
CREATE POLICY lp_platform_admin ON learning_plan
  FOR ALL USING (auth_role() = 'platform_admin');

-- --- plan_revision (Pattern G — deny-all authenticated; service_role bypasses RLS) ---
ALTER TABLE plan_revision ENABLE ROW LEVEL SECURITY;
-- No policies — deny all. Service_role (ORC) writes via API; app never exposes plan_revision
-- to authenticated clients directly.

-- --- recommendation (Pattern A) ---
ALTER TABLE recommendation ENABLE ROW LEVEL SECURITY;

CREATE POLICY rec_student_select ON recommendation
  FOR SELECT USING (auth_role() = 'student' AND student_id = auth_user_id());
CREATE POLICY rec_parent_select ON recommendation
  FOR SELECT USING (auth_role() = 'parent' AND student_id = ANY(fn_my_child_ids()));
CREATE POLICY rec_teacher_select ON recommendation
  FOR SELECT USING (auth_role() IN ('teacher', 'tutor') AND student_id = ANY(fn_teacher_student_ids()));
CREATE POLICY rec_org_admin ON recommendation
  FOR ALL USING (auth_role() = 'org_admin' AND tenant_id = auth_tenant_id());
CREATE POLICY rec_platform_admin ON recommendation
  FOR ALL USING (auth_role() = 'platform_admin');

-- --- plan_override (Pattern A) ---
ALTER TABLE plan_override ENABLE ROW LEVEL SECURITY;

CREATE POLICY po_student_select ON plan_override
  FOR SELECT USING (auth_role() = 'student' AND student_id = auth_user_id());
CREATE POLICY po_parent_select ON plan_override
  FOR SELECT USING (auth_role() = 'parent' AND student_id = ANY(fn_my_child_ids()));
CREATE POLICY po_teacher_select ON plan_override
  FOR SELECT USING (auth_role() IN ('teacher', 'tutor') AND student_id = ANY(fn_teacher_student_ids()));
CREATE POLICY po_org_admin ON plan_override
  FOR ALL USING (auth_role() = 'org_admin' AND tenant_id = auth_tenant_id());
CREATE POLICY po_platform_admin ON plan_override
  FOR ALL USING (auth_role() = 'platform_admin');

-- --- intervention_alert (Pattern A variant — D4: no student SELECT) ---
-- teacher_id is NOT NULL (X1 confirmed). Teacher access uses teacher_id = auth_user_id()
-- (direct column comparison — no fn_teacher_student_ids() needed; no ADR-0005 risk).
ALTER TABLE intervention_alert ENABLE ROW LEVEL SECURITY;

-- No ia_student_select policy (D4).
CREATE POLICY ia_parent_select ON intervention_alert
  FOR SELECT USING (auth_role() = 'parent' AND student_id = ANY(fn_my_child_ids()));
CREATE POLICY ia_teacher_select ON intervention_alert
  FOR SELECT USING (auth_role() IN ('teacher', 'tutor') AND teacher_id = auth_user_id());
CREATE POLICY ia_org_admin ON intervention_alert
  FOR ALL USING (auth_role() = 'org_admin' AND tenant_id = auth_tenant_id());
CREATE POLICY ia_platform_admin ON intervention_alert
  FOR ALL USING (auth_role() = 'platform_admin');

-- --- cohort_metric_cache (D3: selective-grant with tenant isolation) ---
-- service_role (ANL) writes via RLS bypass. No student/parent/anon access.
ALTER TABLE cohort_metric_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY cmc_teacher_select ON cohort_metric_cache
  FOR SELECT USING (auth_role() IN ('teacher', 'tutor') AND tenant_id = auth_tenant_id());
CREATE POLICY cmc_org_admin ON cohort_metric_cache
  FOR ALL USING (auth_role() = 'org_admin' AND tenant_id = auth_tenant_id());
CREATE POLICY cmc_platform_admin ON cohort_metric_cache
  FOR ALL USING (auth_role() = 'platform_admin');
