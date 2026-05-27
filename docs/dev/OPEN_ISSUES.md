# OPEN_ISSUES.md — living list

> Pruned on audit days (every 5 stages). Resolved → ## Resolved with date.
> Use the severity rubric in CLAUDE.md.

## Open

### ISSUE-0068 — teacher/content locked pathway cards non-interactive (pointer-events-none blocks upgrade CTA)

- Status: resolved — 2026-05-24 (Cluster G G3 commit 57c3b95)
- Severity: medium
- Reported: 2026-05-24 (v1.1 polish matrix sweep)
- Area: frontend (apps/web/src/app/(teacher)/teacher/content/page.tsx)
- Tags: upgrade-state · a11y · ux · interactive

**Summary.** teacher/content local `UpgradeState` wrapper applied `opacity-60 pointer-events-none` to the entire locked-pathway card group, making upgrade CTAs unreachable by pointer and keyboard. Renamed to `LockedPathwayCards`, removed `pointer-events-none`, added per-card `<Button aria-label="Upgrade to unlock {name}">` wired to `/billing?intent=upgrade`. Page-level empty-state gate replaced with shared `<UpgradeState>` from `@mm/ui`.

**Fix.** Commit 57c3b95 (Cluster G G3).

Related: ISSUE-0063 (shared UpgradeState primitive)

---

### ISSUE-0071 — New partitions created by pg_partman/manual carve-ups born RLS-disabled

- Status: open
- Severity: medium
- Reported: 2026-05-27 (ISSUE-0060 empirical resolution — partition layout audit)
- Area: infra (supabase/migrations/)
- Tags: rls · security · partition · v1.1

**Summary.** Migration 0025 fixes ISSUE-0060 by enabling RLS + deny-all on the current `_default` partitions (`learning_event_default`, `intelligence_audit_log_default`). However, when v1.1 introduces pg_partman or manual monthly range partitions (e.g., `learning_event_2026_06`, `intelligence_audit_log_2026_06`), each new partition is created without RLS enabled by default — PostgreSQL does not propagate `ENABLE ROW LEVEL SECURITY` from parent to new child partitions. This reopens the same direct-partition read bypass that ISSUE-0060 closed.

**Fix (before first pg_partman or monthly-carve-up migration).** Each new partition creation must be immediately followed by:
```sql
ALTER TABLE <partition_name> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "<prefix>_deny_all" ON <partition_name> FOR ALL USING (false);
```
For pg_partman: configure `after_partition_created_proc` to a stored procedure that applies the above pattern automatically. For manual monthly migrations: include the ALTER/CREATE POLICY in the same migration statement as the `CREATE TABLE ... PARTITION OF`. Never create a partition without immediately applying the deny-all.

**Scope.** Affects any future partition of `learning_event` and `intelligence_audit_log`. Other partitioned tables do not exist in v1 schema.

Related: ISSUE-0060, migration 0025, migration 0004 (`learning_event`), migration 0005 (`intelligence_audit_log`)

---

### ISSUE-0070 — ISSUE-0045 AT announcement carry to preview gate

- Status: open
- Severity: low
- Reported: 2026-05-24 (v1.1 polish matrix sweep)
- Area: frontend (apps/web/src/app/(student)/session/[id]/practice/page.tsx)
- Tags: a11y · screen-reader · preview-gate

**Summary.** Cluster E wired `h1` focus on mount (code fix done, tested in jsdom, commit 5e158f8). The AT announcement — whether a screen reader announces the h1 on navigation — requires manual verification on NVDA/VoiceOver. jsdom cannot test this. Carry to preview gate.

Related: ISSUE-0045

---

### ISSUE-0069 — F5 + F7 visual fidelity carry to preview gate

- Status: open
- Severity: low
- Reported: 2026-05-24 (v1.1 polish matrix sweep)
- Area: frontend (apps/web/src/app/(student)/session-selection/page.tsx, dashboard/page.tsx)
- Tags: loading · visual-fidelity · cls · preview-gate

**Summary.** Two visual-fidelity items deferred to preview gate:

1. **F5 (session-selection):** loading skeleton (3 × `LoadingState variant="card"` in `grid-cols-3`) footprint confirmed matching loaded state. Carry for AT + motion audit in browser — cannot verify in jsdom.

2. **F7 (dashboard QuickStart + PathwayTile locked state):** `PathwayTile` locked state uses inline `opacity-50` div + "Upgrade to access" copy rather than the shared `UpgradeState` primitive. Visual parity decision deferred to preview gate.

Related: ISSUE-0064, ISSUE-0063, Cluster F (e525d2a)

---

### ISSUE-0067 — Local prod build blocked by TLS cert verification failure (Google Fonts)

- Status: open
- Severity: medium
- Reported: 2026-05-22 (v1.1 pre-polish audit P8)
- Area: infra (apps/web/next.config.mjs, apps/web/src/app/layout.tsx)
- Tags: build · tls · next-font · local-env

**Summary.** `pnpm turbo build` fails locally with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` when `next/font` fetches `DM Sans` and `DM Serif Display` from `fonts.googleapis.com` at build time. The Node.js TLS stack on the local Windows machine does not trust the certificate chain issued by Google's CA. CI and Vercel deployments use system CAs and are unaffected.

**Workaround (local only).** `NODE_TLS_REJECT_UNAUTHORIZED=0 pnpm turbo build` (disables TLS verification — for local use only, never CI). Alternatively use `NODE_OPTIONS=--use-system-ca` (Node.js 22+).

**Fix.** Add the Google root CA to the local machine's trusted store, or configure `next.config.mjs` to fall back to a self-hosted font if the Google Fonts fetch fails (using `display: 'swap'` and a local fallback). Or upgrade to Node.js 22+ and use `--use-system-ca`.

Related: apps/web/src/app/layout.tsx (DM Sans + DM Serif Display font declarations)

---

### ISSUE-0066 — console.warn in production code path (exam page autosave)

- Status: open
- Severity: low
- Reported: 2026-05-22 (v1.1 pre-polish audit P6)
- Area: frontend (apps/web/src/app/(student)/session/[id]/exam/page.tsx)
- Tags: logging · production · exam-mode

**Summary.** `apps/web/src/app/(student)/session/[id]/exam/page.tsx:333` contains `console.warn('autosave failed', err)` in the autosave error handler. In production builds, browser console output is visible to users via DevTools and may expose internal error objects. Should use structured error reporting (Sentry or equivalent) instead.

**Fix.** Remove `console.warn` or replace with a structured error reporting call. Ensure the autosave failure is surfaced to the user via the UI (e.g., the `SavedPill` component or an inline error indicator) rather than the browser console.

Related: apps/web/src/app/(student)/session/[id]/exam/page.tsx:333

---

### ISSUE-0065 — role="alert" on static overdue banner in assignments page

- Status: open
- Severity: low
- Reported: 2026-05-22 (v1.1 pre-polish audit P5)
- Area: frontend (apps/web/src/app/(student)/assignments/page.tsx)
- Tags: a11y · aria · assignments

**Summary.** `apps/web/src/app/(student)/assignments/page.tsx:327` uses `role="alert"` on an overdue-assignment banner that is conditionally rendered based on `overdueCount > 0`. `role="alert"` triggers an ARIA live-region assertive announcement — appropriate for asynchronously injected urgent notifications, not for a count-based banner rendered on page load. Use `role="status"` (polite live region) or no role if the banner is always present when the page loads.

**Fix.** Replace `role="alert"` with `role="status"` on the overdue banner, or remove the live-region role if the banner is always present when overdueCount > 0 on mount.

Related: ISSUE-0046 (role="alert" misuse in StudentComposerForm)

---

### ISSUE-0064 — LoadingState primitive underutilised: 11+ pages define inline skeletons

- Status: open
- Severity: low
- Reported: 2026-05-22 (v1.1 pre-polish audit P4)
- Area: frontend (apps/web/src/app/)
- Tags: ui-consistency · loading-state · polish

**Summary.** The shared `LoadingState` primitive exists in `packages/ui/src/LoadingState/` but 11+ student and teacher pages define inline skeleton components (`SkeletonCard`, `SkeletonRow`, `PathwaySkeleton`) as page-scoped functions or components. Instances: dashboard/page.tsx:67,351,388,422,510,736; session-selection/page.tsx:44; session/[id]/exam/page.tsx:438; session/[id]/practice/page.tsx:332; results/[id]/page.tsx:60; assignments/page.tsx:209; teacher/page.tsx:39,84,114,210,306; teacher/students/page.tsx:21,222; teacher/content/page.tsx:25.

**Fix.** Replace inline skeleton implementations with `import { LoadingState } from '@mm/ui'` and use the existing `variant` prop. Polish-stage item.

Related: ISSUE-0047 (inline loading on teacher content pages)

---

### ISSUE-0063 — Missing shared UpgradeState primitive: 402 paywall shown as toast, not visual component

- Status: resolved — 2026-05-24 (Cluster A created shared UpgradeState primitive 5144b9a; G3 wired all call sites + teacher/content LockedPathwayCards 57c3b95)
- Severity: medium
- Reported: 2026-05-22 (v1.1 pre-polish audit P4)
- Area: frontend (packages/ui/src/, apps/web/src/app/(student)/session-selection/)
- Tags: ui-consistency · upgrade-state · a11y · pre-launch

**Summary.** No `UpgradeState` component exists in `packages/ui/src/`. UI_CONTRACT §6 row 556 requires a persistent visual upgrade-prompt card (CTA: 'Upgrade to {tier}' → `/billing`) for 402 gate responses. Current implementation: `apps/web/src/app/(student)/session-selection/page.tsx:188-194` handles 402 via a toast notification — ephemeral and inaccessible after dismissal. An inline `UpgradeState()` function exists in `apps/web/src/app/(teacher)/teacher/content/page.tsx:48-69` but is not shared.

**Fix.** Create `packages/ui/src/UpgradeState/` primitive. Update session-selection to render `<UpgradeState />` component instead of toast. Replace teacher/content inline function with shared import.

Related: ISSUE-0039 (402 discrimination on submit), UI_CONTRACT §6

---

### ISSUE-0062 — Missing shared ErrorState primitive: 7+ pages handle errors inline without retry

- Status: resolved — 2026-05-24 (Cluster A created shared ErrorState primitive 5144b9a; Cluster G G1 wired all 11 surfaces across student/teacher/parent/billing 57c3b95)
- Severity: medium
- Reported: 2026-05-22 (v1.1 pre-polish audit P4)
- Area: frontend (packages/ui/src/, apps/web/src/app/)
- Tags: ui-consistency · error-state · ux · pre-launch

**Summary.** No `ErrorState` component exists in `packages/ui/src/`. Seven+ pages implement error UI inline, inconsistently. Critical gap: `apps/web/src/app/(student)/dashboard/page.tsx` has 6 data-bound query hooks (`useRecentSessions`, `usePathways`, `useLearnerProfile`, `useLearningPlan`, `useCausalMap`, `useWeeklyPlan`) with no `isError` handler — errors are silently swallowed and the widget simply shows nothing. `apps/web/src/app/(student)/assignments/page.tsx:225` also has no error handler for `assignments.isError`. UI_CONTRACT §5.3 requires widget-level error cards with retry button.

**Fix.** Create `packages/ui/src/ErrorState/` primitive with title, description, and optional retry callback. Add `isError` handlers to all data-bound sections on dashboard and assignments pages. Replace inline error cards in exam, practice, results, and teacher pages with shared primitive.

Related: ISSUE-0047 (inline LoadingState on teacher content pages), UI_CONTRACT §5.3

---

### ISSUE-0061 — ItemCreateDTOSchema and ItemUpdateDTOSchema use z.string() for DB enum fields

- Status: open
- Severity: medium
- Reported: 2026-05-22 (v1.1 pre-polish audit P2)
- Area: backend (packages/types/src/content.ts)
- Tags: validation · zod · content-api · enum

**Summary.** `ImportManifestItemSchema` was tightened to `z.enum()` for `response_type`, `exam_families`, and `bloom_level` by ISSUE-0057 (commit d2cf946). The admin API input schemas were not updated in the same pass:

- `packages/types/src/content.ts:71` — `ItemCreateDTOSchema.response_type`: `z.string().min(1)` — DB has `response_type` enum (7 values)
- `packages/types/src/content.ts:81` — `ItemCreateDTOSchema.bloom_level`: `z.string().nullable()` — DB has `bloom_level` enum (6 values)
- `packages/types/src/content.ts:97` — `ItemUpdateDTOSchema.bloom_level`: `z.string().nullable()` — same gap

A client calling `POST /content/items` directly with an invalid `response_type` (e.g., `"multiple_choice"`) will receive a 500 INTERNAL_ERROR from the DB constraint violation rather than a 422 VALIDATION_ERROR from Zod. The admin API is not end-user-facing, reducing blast radius, but the contract violation is the same class as ISSUE-0057.

**Fix.** Tighten these three fields to `z.enum([...])` using the same enum values as `ImportManifestItemSchema`. Add tests matching the ISSUE-0057 pattern.

Related: ISSUE-0057 (manifest schema tightening), packages/types/src/content.ts:71,81,97

---

### ISSUE-0059 — Manifest template §3 difficulty bands teach IRT logit scale; spec §6.4 mandates [0,1] normalized

- Status: resolved — 2026-05-22 (commit d2cf946 — fix(types,content): §3 replaced with [0,1] band-midpoint table; IRT logit references removed)
- Severity: medium
- Reported: 2026-05-21 (v1.1-S7.1 Gate III — root cause of ISSUE-0058 difficulty scale mismatch)
- Area: content-ops (docs/content/specs/australian-y5-numeracy.md)
- Tags: content-authoring · difficulty · template · dx · s7.2-blocker

**Summary.** The authoring template `docs/content/specs/australian-y5-numeracy.md §3` documents difficulty bands using IRT logit notation (B1 θ≈-2, B2 θ≈-1, B3 θ≈0, B4 θ≈+1, B5 θ≈+2). This directly caused manifest authors to write difficulty values of -2.0, -1.0, 0.0, 1.0, 2.0 in the Gate III batch, violating the DB `CHECK (difficulty BETWEEN 0 AND 1)` constraint and breaking the live import.

The canonical scale is [0,1] normalized per spec §6.4 and §15.1 (CTT p-value; `new_difficulty = 1.0 - observed_p`). Engine Zod contracts enforce `z.number().min(0).max(1)`. The template must be corrected to the linear band-midpoint mapping adopted as ISSUE-0058 resolution before any S7.2 authoring begins.

**Required template correction (§3 difficulty bands):**

| Band | Label | IRT θ (remove) | [0,1] value (add) |
|------|-------|----------------|-------------------|
| B1   | Foundation / Very Easy | θ ≈ -2 | 0.10 |
| B2   | Developing / Easy      | θ ≈ -1 | 0.30 |
| B3   | Proficient / Average   | θ ≈  0 | 0.50 |
| B4   | Advanced / Hard        | θ ≈ +1 | 0.70 |
| B5   | Expert / Very Hard     | θ ≈ +2 | 0.90 |

Remove all IRT logit references. Replace with [0,1] values and cite spec §6.4 for the canonical scale. Note that IRT/2PL is a Phase 3 deferred path (spec §15.6).

**Fix.** Update `docs/content/specs/australian-y5-numeracy.md §3`. Can be bundled with the S7.1 batch content commit or done as a `docs(content):` chore. Must complete before S7.2 authoring session.

Related: ISSUE-0058 (root cause), spec §6.4, spec §15.1, spec §15.6

---

### ISSUE-0060 — RLS disabled on intelligence_audit_log_default + learning_event_default

- Status: resolved (pending re-run) — 2026-05-27 (migration 0025 filed; confirmation gate = rls-check-e2e.sql exit 0)
- Severity: medium
- Reported: 2026-05-21 (v1.1-S7.1 Gate III — surfaced by `supabase db query` advisory)
- Area: infra (supabase/migrations/)
- Tags: rls · security · audit-log

**Summary.** `supabase db query` advisory reports that `public.intelligence_audit_log_default` and `public.learning_event_default` have Row Level Security disabled. rls-check-e2e.sql q2 + q4 empirical gate confirmed the bypass: both queries returned N_ROWS as `anon`, proving the _default partitions do not inherit the parent's RLS in PostgreSQL 15 when queried directly.

**Resolution.** Migration 0025 (`0025_default_partition_rls.sql`) adds `ENABLE ROW LEVEL SECURITY` + a deny-all `USING(false)` policy (`led_deny_all` / `iald_deny_all`) to each _default partition. Partition policies in PostgreSQL 15 apply only on direct partition access; parent-table queries (the app path) continue to use the parent's full policy sets (migrations 0004/0005) unaffected. Service_role (BYPASSRLS) and SECURITY DEFINER write paths are unaffected. Resolution is confirmed when rls-check-e2e.sql reruns and exits 0 with q2 + q4 = 0_ROWS or ERROR.

**v1.1 follow-up.** See ISSUE-0071 — new partitions created by pg_partman or manual carve-ups are born RLS-disabled and reopen this bypass. The creation path must apply the same ENABLE RLS + deny-all pattern.

Related: migration 0025, ISSUE-0071, rls-check-e2e.sql q2+q4, migration 0004 (le_ policies), migration 0005 (ial_ policies)

---

### ISSUE-0057 — ImportManifestSchema: z.string() for exam_families + bloom_level lets invalid enum values pass dry-run but fail live import

- Status: resolved — 2026-05-22 (commit d2cf946 — fix(types,content): tightened ImportManifestItemSchema to z.enum() for response_type, exam_families, bloom_level; 4 regression tests added)
- Severity: medium
- Reported: 2026-05-21 (v1.1-S7.1 Gate III unblock — exposed by exam_family + bloom_level rejections)
- Area: backend (packages/types/src/content.ts, supabase/functions/content-svc/handlers.ts)
- Tags: validation · zod · manifest · dry-run · content-ops

**Summary.** `ImportManifestSchema` uses `z.string()` for `exam_families` items and `bloom_level`, matching no DB enum constraint. A dry-run passes Zod validation and returns all items `status: "ok"` even with invalid enum values. The live import then fails at the DB INSERT level (`invalid input value for enum exam_family`) — the dry-run gives false confidence. This is the same class of gap as Q-1.1-7.T1A (`response_type`).

**Reproduction.** Gate III: manifest used `exam_families: ["au_numeracy_y5_format"]` against a DB with old enum values (`naplan`/`icas`). Dry-run (no DB writes): 8/8 `status: "ok"`. Live import: 8/8 rejected with `invalid input value for enum exam_family`. The enum mismatch was a stale DB issue, not a manifest bug, but the gap still means a dry-run that passes is not a reliable pre-flight for live import.

**Fields to tighten in `ImportManifestSchema`:**
- `items[].item.exam_families[]` — should be `z.enum(['au_numeracy_y5_format', 'au_math_paper_c_format', 'selective', 'singapore_math', 'olympiad'])`
- `items[].item.bloom_level` — should be `z.enum(['remember', 'understand', 'apply', 'analyse', 'evaluate', 'create'])`
- `items[].item.response_type` — noted in Q-1.1-7.T1A; same fix needed

**Fix deferred.** These enums are stable; tighten in the next content-authoring iteration. Companion test should verify `ImportManifestSchema.safeParse` rejects invalid enum values.

Related: Q-1.1-7.T1A, `packages/types/src/content.ts`, Gate III unblock

---

### ISSUE-0054 — MCQ auto-scoring broken in v1 exam mode: UI submits `{ choice }`, server reads `responseData['option_id']`

- Status: resolved — 2026-05-22 (commit 005f466 — fix(web): correct MCQ response key choice→option_id; 2 scoring contract tests added)
- Severity: high
- Reported: 2026-05-20 (v1.1-S7.1 Gate I — by-product of Q-1.1-S7-RC.1 investigation)
- Area: frontend + backend
- Tags: bug · scoring · exam-mode · pre-launch-blocker

**Summary.** `computeCorrectness` in `assessment-svc/handlers.ts:1064-1073` checks `responseData['option_id']` to determine if a student's MCQ answer is correct. The exam page (`apps/web/src/app/(student)/session/[id]/exam/page.tsx:282`) submits `response_data: { choice: selected }` — the key is `choice`, not `option_id`. As a result, `typeof submitted !== 'string'` is `true` (the `option_id` key is `undefined`), and `computeCorrectness` returns `false` for every MCQ response. MCQ auto-scoring is non-functional in v1 exam mode regardless of `response_config` shape.

**Reproduction.**
1. Start an exam-mode session with an MCQ item whose `response_config.correct_option_id` is set correctly
2. Select the correct option and submit
3. Expected: session records `is_correct: true`; Actual: session records `is_correct: false`

**Root cause.** Field name mismatch between submit path and scoring path:
- `apps/web/src/app/(student)/session/[id]/exam/page.tsx:282` — submits `{ choice: selected }`
- `supabase/functions/assessment-svc/handlers.ts:1070` — reads `responseData['option_id']`

**Fix (preferred — Option A):** Change `exam/page.tsx:282` to submit `{ option_id: selected }` — one-line client fix, keeps server contract stable.

**Pre-launch blocker note.** Items land as `draft` during S7.1 — not served to students in exam mode. This bug does not block S7.1 authoring or import. Blocker activates when any item reaches `active` and enters an exam-mode session.

Related: Q-1.1-S7-RC.1, assessment-svc/handlers.ts:1064-1073, apps/web exam/page.tsx:282

---

### ISSUE-0053 — Skill graph extension: Probability + Statistics skill nodes missing

- Status: open
- Severity: medium
- Reported: 2026-05-20 (v1.1-S7 morning ritual — Q-1.1-7.T1C)
- Area: backend (supabase/seeds/) + content-ops
- Tags: skill-graph · content-ops · s7.2+

**Summary.** The seeded skill graph (`supabase/seeds/01_skill_graph.sql`) contains 6 skill nodes across 2 strands: Number & Algebra (place-value, fractions-decimals, operations, word-problems) and Measurement & Space (geometry, data-interpretation). The AC v9.0 Mathematics curriculum has 6 strands including Probability (AC9M5P) and a richer Statistics strand. No Probability skill node exists in the seed; `data-interpretation` covers some statistics-adjacent content but not the full Statistics strand.

Impact on S7.1: Probability items suppressed (Q-1.1-7.T1C Option A). Statistics items map to `data-interpretation` (skill_id `a0000001-0000-0000-0000-000000000009`); this is an approximate mapping acceptable for S7.1.

**Fix (before S7.2+ Probability/Statistics authoring).**
1. Add `probability` skill node to `skill_graph_version` v1 (or a v2) seed under Number & Algebra strand.
2. Optionally add a richer `statistics` skill node (distinct from `data-interpretation`) for more granular strand coverage.
3. Update `docs/content/specs/australian-y5-numeracy.md §2` strand mix to restore 2 Probability items once the node is seeded.
4. Remove Q-1.1-7.T1C reference from strand-mix note.

Related: Q-1.1-7.T1C, DEV-20260520-1, `supabase/seeds/01_skill_graph.sql`

---

### ISSUE-0052 — Manifest slug→UUID resolution: `importItems` passes `skill_ids` directly to DB

- Status: open
- Severity: medium
- Reported: 2026-05-20 (v1.1-S7 morning ritual — Q-1.1-7.T1B Option C)
- Area: backend (supabase/functions/content-svc/handlers.ts)
- Tags: content-import · skill-graph · dx · post-s7.1

**Summary.** `importItems` in `content-svc/handlers.ts` passes `itemFields.skill_ids` directly to the Supabase INSERT at `item.skill_ids uuid[]` without slug-to-UUID resolution. Authors must supply valid UUIDs from the `skill_node` table. Working with 36-character UUIDs at authoring volume is error-prone; a slug-resolution step would allow authors to use human-readable slug strings (e.g., `"fractions-decimals"`) instead.

The slug-resolution pattern is already proven at [handlers.ts:481–488](../../../supabase/functions/content-svc/handlers.ts#L481) (`selectFromBlueprint` resolves `skill_slugs → skill_ids` via `SELECT id, slug FROM skill_node WHERE slug IN (...)`). The same pattern could be applied inside `importItems` before the `createItem` call.

**Fix (post-S7.1 — after S7.1 pilot proves end-to-end loop).**
1. In `importItems`, before calling `createItem`: batch-resolve all unique slug values across the manifest using `skill_node.slug IN (...)`.
2. Build a `Map<slug, uuid>`. Replace string entries in each item's `skill_ids` array: UUIDs pass through; slugs are resolved; unresolved slugs → per-item rejection with reason `"unknown skill_id: <slug>"`.
3. Update `ImportManifestItemSchema` and `manifest-format.md §3.1` to document slug-or-UUID semantics.
4. Update template §10 example and `manifest-format.md §9` to use slug format once implemented.

Related: Q-1.1-7.T1B, ADR-0041 §Implementation Notes Step T1B addendum, handlers.ts:481

---

### ISSUE-0051 — Trademark strings remain in non-enum surfaces (program column, display_name, slugs, feature_key, UI copy)

- Status: open
- Severity: medium
- Reported: 2026-05-20 (v1.1-S7-prep step 1c chore close — Q-1.1-S7-LEGAL-2.4 carry)
- Area: backend + frontend + content-ops
- Tags: legal · trademark · content-ops

**Summary.** Step 1c (a5140e0) renamed the `exam_family` Postgres enum values from `'naplan'`/`'icas'`
to neutral identifiers `'au_numeracy_y5_format'`/`'au_math_paper_c_format'`. This covers the highest-risk
trademark surface (DB enum + API wire format). The following non-enum surfaces were explicitly deferred
per Q-1.1-S7-LEGAL-2.4 and require separate legal + operational review before remediation is scoped:

1. **`program` column values** — `'NAPLAN'` and `'ICAS'` stored in `item.program[]` array. Present in
   `seeds/03_assessment_config.sql`, `seeds/02_content.sql` (item inserts). API-exposed via
   `GET /pathways` response DTO and item list responses. Internal identifier, but appears in API wire
   format.

2. **`display_name` values** — pathway `display_name` column values include `'NAPLAN Year 5 Numeracy'`
   and `'ICAS Mathematics Paper C'`. Stored in `pathway` table; exposed in `GET /pathways` response
   to all authenticated users. High visibility — likely intentional marketing copy, but flagged for
   legal review.

3. **Pathway slugs** — `naplan-y5-numeracy` and `icas-math-paper-c` used as URL path segments (student
   session-selection) and SDK pathway slug keys. Step 1c explicitly preserved these slugs (Q-2.5 fix
   reads `pathway.exam_family` from DB, not the slug). Slug changes are breaking (URL-visible) and
   require a redirect strategy.

4. **`feature_key` values** — `naplan_y5` and `icas_math_y5` in `framework_config.feature_key` column.
   Internal identifier used for feature-flag lookup; not API-exposed to end users, but present in DB.

5. **UI copy strings** — `apps/web/src/lib/billing.ts` plan description strings and auth-shell copy
   reference `'NAPLAN'`/`'ICAS'` by name. These are marketing/display strings; may be intentional brand
   references (like `display_name`) or may warrant rewriting to generic descriptors.

**Affected files (enumerated from step 1c grep catalogue):**
- `supabase/seeds/02_content.sql` — program column: `'NAPLAN'` ×25, `'ICAS'` ×25
- `supabase/seeds/03_assessment_config.sql` — display_name column, feature_key column, program column
- `apps/web/src/lib/billing.ts` — UI copy strings
- `apps/web/src/app/(student)/session-selection/page.tsx` — `pathway.display_name` render
- `apps/web/src/app/(teacher)/teacher/content/page.tsx` — `p.display_name` render
- `apps/web/src/app/auth/*/` — auth-shell copy (NAPLAN/ICAS mentions)

**Pre-launch blocker status: TBD.** Legal re-review of `docs/content/specs/australian-y5-numeracy.md`
(Step 2 gate) will determine whether any of the above surfaces constitute trademark infringement
risk at the v1.1 launch context (educational platform, non-commercial item names, curriculum-alignment
framing, §0 non-affiliation disclaimer in place). Remediation scope and priority determined after
that review. Owner: operator-side legal; no code action until legal direction received.

**Do not close this issue without legal sign-off on the surface enumeration above.**

Related: Q-1.1-S7-LEGAL-2.4, ADR-0041 §Step 1c addendum, a5140e0

---

### ISSUE-0050 — Cross-import exact-match dedup: cross-DB stem SHA + cross-import external_key

- Status: open
- Severity: medium
- Reported: 2026-05-19 (v1.1-S6 chore close — Q-1.1-6.7 Option C + Q-1.1-6.8 Option B deferrals)
- Area: backend (supabase/functions/content-svc/)
- Tags: content-import · duplicate-detection · post-launch

**Summary.** The S6 import pipeline implements exact-match SHA dedup and external_key dedup within the
submitted manifest only (intra-manifest). Two cross-boundary dedup paths are deferred:

1. **Cross-DB stem SHA dedup (Q-1.1-6.7 Option C):** Compare each incoming item's `normaliseStem` SHA
   against `item_version.stem_sha` (or equivalent) for all `is_current = true` rows already in the DB.
   Would catch re-import of an item already in the bank across distinct manifest submissions.
   Implementation: requires either storing `stem_sha` in `item_version` (new column, migration) and
   indexing it, or computing SHAs at batch-start via a `SELECT stem FROM item_version WHERE is_current`.
   Empty-bank rationale: at S6 launch the bank is empty; cross-lookup has no value.

2. **Cross-import external_key dedup (Q-1.1-6.8 Option B):** Reject items whose `external_key` already
   appears in a prior successful import. Implementation: requires an `import_external_key` lookup table or
   extending the idempotency record with per-item `external_key` tracking. Idempotency-Key replay already
   handles re-submission of the *same manifest*, but a different manifest containing a previously-imported
   `external_key` would not be caught by idempotency.

Both `DUPLICATE_STEM` and `DUPLICATE_EXTERNAL_KEY` outcome codes are reserved in the response schema
(`ImportItemOutcome.status`) as upgrade-path hooks.

**Fix (post-launch).** Implement when content bank reaches meaningful size (~100+ items) or when
cross-batch dedup errors are first observed in S7 operations. Decision between stem_sha DB column vs
batch-start query deferred to implementation. Coordinate with ISSUE-0049 (fuzzy detection) to avoid
redundant migrations.

---

### ISSUE-0049 — Fuzzy/embedding-based duplicate detection in content import pipeline

- Status: open
- Severity: medium
- Reported: 2026-05-19 (v1.1-S6 prep — Q-1.1-6.3 ii resolution, ADR-0041 §Decision 3)
- Area: backend (supabase/functions/content-svc/)
- Tags: content-import · duplicate-detection · copyright · post-launch

**Summary.** The S6 import pipeline implements exact-match SHA deduplication on normalised stem JSON (ADR-0041 §Decision 3). This catches verbatim duplicate imports (same manifest re-imported) but does not detect near-duplicates or paraphrase-level reproduction — the primary copyright risk from the v1.1-phase-plan.md §Critical constraint. The `draft → review` lifecycle gate is the current enforcement mechanism for paraphrase detection, relying on human review.

Fuzzy/embedding-based similarity would detect near-duplicates mechanically. Two candidate approaches:
- **(A) pgvector cosine similarity** — embed stem text via an embedding model; store in `item_version.stem_embedding vector(N)` column (new migration + pgvector extension); flag imports with similarity > threshold as `status: "near_duplicate"`.
- **(B) MinHash/Jaccard shingling** — character-level shingles; approximate similarity without an embedding API; lower accuracy but zero external dependency.

Decision between (A) and (B) deferred to implementation. Value increases with content bank size.

**Fix (post-launch).** Implement Option A or B when content bank exceeds ~500 items or when human review throughput becomes a bottleneck. Coordinate with legal review of threshold definition.

---

### ISSUE-0048 — PROJECT_STATE.md per-package test count discrepancy

- Status: resolved — 2026-05-24 (chore(v1.1-polish) close — PROJECT_STATE overwritten with real pnpm -r test output; corrected baseline 854, current total 945)
- Severity: low
- Reported: 2026-05-18 (v1.1-S5 chore close — P8 audit)
- Area: docs (docs/dev/PROJECT_STATE.md)
- Tags: documentation · test-count

**Summary.** `docs/dev/PROJECT_STATE.md` §Test suite documents the per-package breakdown as `@mm/types=160` and `apps/web=85`. Actual `pnpm -r run test` output at v1.1-S5 close shows `@mm/types=153` and `apps/web=92`. Total 828 is correct in both the docs and the actual run — the discrepancy is in how the +33 S5 delta was distributed across packages. No functional impact; total gate count is correct.

**Fix (documentation).** Correct the per-package breakdown line in `PROJECT_STATE.md` to `@mm/types=153` and `apps/web=92` at next evening-ritual overwrite.

---

### ISSUE-0047 — Inline LoadingState in S4 teacher content pages

- Status: open
- Severity: low
- Reported: 2026-05-18 (v1.1-S5 chore close — P4 audit)
- Area: frontend (apps/web/src/app/(teacher)/content/)
- Tags: components · ui-consistency

**Summary.** `apps/web/src/app/(teacher)/content/page.tsx` and `teacher/content/new/page.tsx` define local inline skeleton `LoadingState()` functions instead of importing the shared `LoadingState` component from `@mm/ui`. This introduces a divergence from the design system — future changes to the shared component will not propagate to these pages.

**Fix.** Replace the inline `LoadingState` definitions with imports from `@mm/ui`. No behavior change — purely an import correction. Address at next S4/teacher-content touch.

---

### ISSUE-0046 — role="alert" misuse on non-urgent form validation messages

- Status: open
- Severity: low
- Reported: 2026-05-18 (v1.1-S5 chore close — P5 audit)
- Area: frontend (apps/web/src/components/student/StudentComposerForm.tsx)
- Tags: a11y · aria · form-validation

**Summary.** `StudentComposerForm.tsx` lines 216, 247, 296, 360 apply `role="alert"` to inline form validation messages (e.g., item count bounds, difficulty sum mismatch). `role="alert"` is semantically reserved for time-sensitive/urgent interruptions (live region, assertive). Non-urgent validation feedback should use `role="status"` (polite) or no live-region role at all when tied to a submit action.

**Fix.** Replace `role="alert"` with `role="status"` on field-level validation messages; reserve `role="alert"` for genuine error conditions. Address at next StudentComposerForm touch.

---

### ISSUE-0045 — Focus management missing on /practice and /exam-sim route entry

- Status: open
- Severity: medium
- Reported: 2026-05-18 (v1.1-S5 chore close — P5 audit)
- Area: frontend (apps/web/src/app/(student)/practice/, exam-sim/)
- Tags: a11y · focus-management · navigation

**Summary.** Neither `/practice/page.tsx` nor `/exam-sim/page.tsx` manage focus on route entry. After navigating to these pages (e.g., via StudentNav), keyboard and screen-reader users land with focus in an indeterminate position. UI_CONTRACT §a11y (lines 748–759) requires focus to land on the page heading or the first interactive element after navigation. The `<SimulationBanner />` on `exam/page.tsx` is correctly handled (it is an inline conditional, not a navigation target) — this issue covers the entry pages only.

**Fix.** Add `useEffect(() => { headingRef.current?.focus() }, [])` on route entry, or use Next.js `router.events` approach per existing pattern in other student routes. Address before launch or at next S5 touch.

---

### ISSUE-0044 — assignments-svc flat error format inconsistent with other services

- Status: open
- Severity: low
- Reported: 2026-05-18 (v1.1-S5 chore close — P3 audit)
- Area: backend (supabase/functions/assignments-svc/handlers.ts)
- Tags: error-format · api-consistency

**Summary.** `assignments-svc/handlers.ts` returns flat error objects `{ data: null, status: 4xx, error: 'CODE' }`. `content-svc` and `assessment-svc` use a tagged-union format `{ ok: false, error: { code, message } }`. The SDK error-handling layer normalises responses, but divergence in raw wire format makes direct debugging and contract testing harder. Found at P3 error-handling audit.

**Fix.** Align `assignments-svc` error shape with the tagged-union format used by other services. Low priority — SDK normalisation masks the discrepancy at runtime. Address when assignments-svc is next touched for S6+ work.

---

### ISSUE-0043 — assessment-svc /respond and /submit missing Idempotency-Key enforcement

- Status: open
- Severity: medium
- Reported: 2026-05-18 (v1.1-S5 chore close — P2 audit)
- Area: backend (supabase/functions/assessment-svc/index.ts)
- Tags: idempotency · api · assessment-svc

**Summary.** `assessment-svc` POST `/sessions/{id}/respond` and POST `/sessions/{id}/submit` do not read or enforce the `Idempotency-Key` header. The CLAUDE.md non-negotiable requires `Idempotency-Key` on every `POST`/`PATCH`/`DELETE`. `assignments-svc` has the same gap (tracked as ISSUE-0023 — logged-only, not enforced). For `/respond`, duplicate delivery without idempotency protection risks double-scoring a session response; for `/submit`, duplicate submission risks double-closing a session. Extends the pattern identified in ISSUE-0023.

**Fix.** Add `Idempotency-Key` header extraction and idempotency-window check (matching the content-svc pattern) to both endpoints. Address before launch — high replay risk in mobile/flaky-network scenarios.

---

### ISSUE-0041 — N+1 query patterns in assignments-svc

- Status: open
- Severity: medium
- Reported: 2026-05-18 (v1.1-S5 chore close — P7 audit)
- Area: backend (supabase/functions/assignments-svc/handlers.ts)
- Tags: performance · n+1 · assignments-svc

**Summary.** Four `await`-in-loop patterns identified in `assignments-svc/handlers.ts`:

1. `publishAssignment` (~lines 570–576): per-`classId` loop calling individual DB queries.
2. `getAssignmentsForStudent` (~lines 716–720): `fetchDisplayName` called per assignment row.
3. `getAssignmentsForClass` (~lines 784–787): `fetchDisplayName` called per assignment row.
4. `getAssignmentTracking` (~lines 813–816): `fetchDisplayName` called per tracking row.

Under small class sizes (v1 launch), these are acceptable. At scale (50+ students per class), these become O(n) DB round-trips per request, violating the `BUILD_CONTRACT §10` dashboard load budget (p95 2000 ms).

**Fix.** Batch `fetchDisplayName` lookups into a single `IN (...)` query per handler; join or use `Promise.all` with a single batch call. Address before launch scaling validation or when assignments-svc performance is next measured.

---

### ISSUE-0040 — SDK hooks missing staleTime causes refetch storms

- Status: open
- Severity: medium
- Reported: 2026-05-18 (v1.1-S5 chore close — P7 audit)
- Area: frontend (packages/sdk/src/hooks/content.ts, session.ts, assignments.ts)
- Tags: performance · react-query · sdk

**Summary.** Three SDK hooks use React Query with `staleTime` defaulting to 0: `usePathways` (`content.ts`), `useSessionState` (`session.ts`), and `useAssignmentsForClass` (`assignments.ts`). With `staleTime: 0`, React Query re-fetches from the server on every window focus event and component remount. On the `/practice` and `/exam-sim` pages, `usePathways` fires a fresh network request every time the user alt-tabs back to the browser. Under `useSessionState` during an active exam, this causes unnecessary re-fetches mid-session. `BUILD_CONTRACT §10` item delivery p95 budget is 200 ms; refetch storms compound latency.

**Fix.** Add appropriate `staleTime` values: `usePathways` 5–10 minutes (reference data), `useSessionState` 0–30 seconds (session data, should be fresh but not every focus), `useAssignmentsForClass` 1–2 minutes. Coordinate with cache invalidation on mutation. Address before launch or when SDK hooks are next touched.

---

### ISSUE-0039 — Submit error does not discriminate 402 Upgrade Required

- Status: open
- Severity: medium
- Reported: 2026-05-18 (v1.1-S5 chore close — P3 + P4 audit)
- Area: frontend (apps/web/src/components/student/StudentComposerForm.tsx, apps/web/src/app/(teacher)/content/new/page.tsx)
- Tags: error-handling · billing · upgrade-flow

**Summary.** `StudentComposerForm.tsx:359–362` and `teacher/content/new/page.tsx:347–354` render a generic error message on any submit failure. Neither handler inspects the response status for 402 and redirects or renders the `<UpgradeState />` component. The 5-state matrix requires the Upgrade (402) state on every data-bound component (UI_CONTRACT:547–557); the form-submit error path is a second entry point where a 402 can surface (e.g., user upgrades plan in another tab, then submits a form — the UI must direct them to upgrade, not show a generic error).

**Fix.** On submit failure, check `error.status === 402` and render `<UpgradeState />` (or route to upgrade page) instead of the generic error message. Applies to both `StudentComposerForm.tsx` and `teacher/content/new/page.tsx`. Address before launch.

---

### ISSUE-0036 — pgTAP test/schema drift for migrations 0012, 0015, 0016 (resolved at Stage 48)

- Status: open → resolved at Stage 48 impl commit
- Severity: medium (blocked pgTAP from running against current schema; regression in test coverage)
- Reported: 2026-06-07 (Stage 48 — D7 pgTAP run)
- Area: tests (supabase/tests/rls/)
- Tags: pgtap · migrations · regression · schema-drift

**Summary.** Running `npx supabase test db` against the local database with migrations 0001–0020 applied revealed 3 failing test files: `004_sessions_events.sql`, `007_new_domains.sql`, `010_outbox_dispatcher.sql`. The failures were caused by test/schema drift introduced by migrations 0012, 0015, and 0016, which were never validated against pgTAP (last clean run was 451/451 against 0001–0013 on 2026-05-03).

**Root causes:**
- `004_sessions_events.sql` — Migration 0012 widened `create_session_response_atomic` from 10-arg to 11-arg (added `p_engine_state jsonb`). Test called old 10-arg signature at lines 590, 649–661, 677–688.
- `007_new_domains.sql` — Migration 0015 added `pathway_id uuid NOT NULL REFERENCES pathway(id)` to `assignment`. Test seed data omitted `pathway_id` (also lacked prerequisite `framework_config` + `pathway` rows).
- `010_outbox_dispatcher.sql` — Migration 0016 replaced dead `assignment.published` event_type branch with `assignment_assigned` (Q-34.1). Test seed data still used old `assignment.published` string.

**Fix.** All 3 test files updated in Stage 48 impl commit:
- `004`: REVOKE check and G17/G18 calls updated to 11-arg signature (added `'{}'::jsonb` as `p_engine_state`).
- `007`: Added `framework_config` + `pathway` seed rows (UUIDs `...-0008-000000000090/91`); assignment INSERT updated with `pathway_id`.
- `010`: Event type updated to `assignment_assigned`; description comments updated.

**Outcome.** pgTAP reruns at 451/451 (Files=10, Tests=451, Result: PASS). Test count unchanged from prior clean run — same assertions, updated to match current schema.

---

### ISSUE-0035 — Playwright spec count documentation error in Phase 2/4 exit reports

- Status: open
- Severity: low
- Reported: 2026-06-07 (Stage 48 — Q-48.5 resolution)
- Area: tests (documentation)
- Tags: playwright · documentation · exit-report

**Summary.** `docs/dev/phase-2-exit-report.md` §10 claims 12 Playwright specs; `docs/dev/phase-4-exit-report.md` §10 claims 13 specs. On-disk count is 11 files in `apps/web/playwright/e2e/`. The Phase 2 exit report overcounted by including Phase 1 Stages (22b–25) spec additions in its "+7 Phase 2 delta" tally; the Phase 4 report inherits this +2 error. All 11 on-disk spec files are accounted for via DAILY_LOG deliverables. No missing files.

**Fix (documentation):** Update both exit reports to reflect 11 specs / 15 tests as ground truth. Low severity — no code is affected; Playwright gate at Stage 49 will use the correct on-disk count.

---

### ISSUE-0034 — `access_downgraded` notification: single-parent fanout only in v1

- Status: open
- Severity: low
- Reported: 2026-06-05 (Stage 46 prep, Q-46.3 resolution)
- Area: backend (billing-svc, notifications-svc)
- Tags: billing-svc · notifications-svc · notification · v1.1 · multi-parent

**Summary.** The `customer.subscription.deleted` webhook handler in billing-svc identifies the `access_downgraded` notification recipient by querying `user_profile WHERE tenant_id = $1 AND role = 'parent' ORDER BY created_at ASC LIMIT 1`. This returns the single earliest-created parent user per tenant. In v1, most tenants have one parent account — this covers the common case. However, a tenant with multiple parent accounts (e.g., two parents co-managing a family subscription) will only notify the first-created parent; the second parent receives no `access_downgraded` notification when the subscription expires.

**Fix (v1.1).** Fan out to all parent users: `SELECT id FROM user_profile WHERE tenant_id = $1 AND role IN ('parent', 'org_admin') ORDER BY created_at ASC` (no LIMIT). Enqueue one `notification.create` job per recipient. Use `idempotency_key: 'nfp-${event.id}-${userId}'` per recipient to prevent duplicates on job retry.

**Tracking pointer.** Q-46.3 resolution. Inline `// ISSUE-0034` comment at parent lookup site in `supabase/functions/billing-svc/handlers.ts`.

---

### ISSUE-0033 — GET /billing/invoices uses LIMIT 50 + truncated flag; cursor pagination deferred

- Status: open
- Severity: low
- Reported: 2026-06-02 (Stage 43 prep, Q-43.2 resolution)
- Area: backend (billing-svc)
- Tags: billing-svc · pagination · v1.1 · invoices

**Summary.** `GET /billing/invoices` returns up to 50 invoice rows ordered by `invoiced_at DESC` with a `truncated: boolean` flag in the response envelope when the result count equals 50. No cursor or offset pagination is implemented in v1. For typical v1 tenant invoice volume (12–24 invoices/year for monthly/yearly billing), 50 rows covers 2–4 years of history — adequate for launch. Q-43.2 Option A resolution per ISSUE-0022 (audit-log) precedent.

**Fix (v1.1).** Cursor-based pagination via `invoiced_at` watermark: `?before=<ISO8601 timestamp>` query param; response includes `next_cursor: string | null`. Removes LIMIT 50 ceiling. Consistent with ISSUE-0022 audit-log cursor proposal.

**Tracking pointer.** Q-43.2 Option A selection. Inline comment at query site in `supabase/functions/billing-svc/handlers.ts`: `// ISSUE-0033: v1 LIMIT 50 + truncated flag; cursor pagination deferred to v1.1.`

---

### ISSUE-0032 — Stripe webhook secret rotation: no dual-secret acceptance window

- Status: open
- Severity: low
- Reported: 2026-06-01 (Stage 42 prep, Q-42.1 / ADR-0034)
- Area: backend (billing-svc)
- Tags: billing-svc · stripe · security · v1.1

**Summary.** billing-svc loads a single `STRIPE_WEBHOOK_SECRET` at startup. Rotating
this secret (e.g., for a security incident or routine rotation) requires redeploying
billing-svc with the new secret. During the redeployment window, in-flight webhook
events signed with the old secret will fail signature verification and return 400,
causing Stripe to retry — which may succeed on the new secret after redeployment
completes. However, the retry delay (typically minutes) means the window between
old-secret billing_events succeeding and new-secret events succeeding creates a
brief gap where webhooks may 400.

Stripe best practice for zero-downtime rotation: accept both old and new secrets
during the rotation window (`stripe.webhooks.constructEvent` called twice with
different secrets; first success wins).

**Fix (v1.1).** Accept array of webhook secrets during rotation:
```ts
// v1.1: try each secret in order; first success wins
for (const secret of [STRIPE_WEBHOOK_SECRET_NEW, STRIPE_WEBHOOK_SECRET_OLD]) {
  try { event = stripe.webhooks.constructEvent(rawBody, sig, secret); break; }
  catch { continue; }
}
```
Inline comment at `STRIPE_WEBHOOK_SECRET` load site in billing-svc/handlers.ts:
`// ISSUE-0032: single-secret; v1.1 needs dual-secret rotation window`

**Risk in v1.** Low. Secret rotation is a manual admin operation. Stripe's retry
schedule (typically 5 attempts over 3 days) means delayed events will be replayed
successfully after redeployment. No data loss; only delayed processing during
rotation window.

**Linked:** ADR-0034 (Stripe integration patterns — Decision 1 consequences).

---

### ISSUE-0031 — Student dashboard: NBA "Next Best Action" hero card omitted v1

- Status: open
- Severity: low
- Reported: 2026-05-11 (Stage 40 T5 checkpoint)
- Area: frontend (apps/web)
- Tags: student-dashboard · v1.1 · screen-7 · nba

**Summary.** SCREEN_SPECS §7 (Student Dashboard v2) includes a "Next Best Action" hero card at the top of the dashboard — a prominently styled card showing the single highest-priority recommendation for the student (e.g., "Continue Fractions Practice", "Complete overdue diagnostic"). No `GET /orchestration/nba/{student_id}` endpoint or equivalent exists in v1 backend. Stage 40 ships the dashboard without the NBA card; the hero slot is vacant (no placeholder rendered).

**Recommended fix (v1.1).**
- Option A: Derive from existing data — compose NBA from `LearningPlanDTO.sessions` (first pending item) or `useLearningPlan` highest-priority item. No new endpoint; purely frontend computation.
- Option B: New endpoint `GET /orchestration/nba/{student_id}` — orchestration-svc returns `{ label, mode, target_skill_names, rationale }` as a dedicated NBA DTO. Cleaner separation; adds backend work.

**Tracking pointer.** Stage 40 T5 operator decision. `apps/web/src/app/(student)/dashboard/page.tsx` — hero slot absent. ISSUE-0031.

---

### ISSUE-0030 — Pathway → strand mapping absent: teacher student detail ships NAPLAN tab only

- Status: open
- Severity: medium
- Reported: 2026-05-28 (Stage 38 prep — Q-38.UI-2)
- Area: frontend (apps/web) + backend (intelligence-svc)
- Tags: teacher-student-detail · intelligence-svc · v1.1 · screen-20 · pathway-tabs

**Summary.** SCREEN_SPECS §20 block 2 specifies pathway tabs (NAPLAN / ICAS / Selective) on the student detail page, with each tab filtering the strand performance bars. `LearningDNADTO.domain_profiles` keys are strand names (e.g., "Numeracy", "Reading") — not pathway slugs. There is no per-pathway strand breakdown in v1: the same strands appear under both NAPLAN and ICAS assessments, and the DTO has no `pathway_id` dimension on domain data. Stage 38 ships the NAPLAN tab only (visible + active); ICAS and Selective tabs are hidden (not rendered). A `// ISSUE-0030` comment marks the tab site.

**Fix (v1.1).** Two options:
1. **Extend `LearningDNADTO`:** add `pathway_domain_profiles: Record<pathwaySlug, Record<strandName, DomainProfile>>` — requires intelligence-svc to split mastery rows by pathway when building the DTO.
2. **New endpoint:** `GET /intelligence/learner-profile/{student_id}/{pathway_slug}` — returns domain_profiles filtered to the specific pathway's strand coverage.

Either option unblocks ICAS and Selective tabs in Screen 20.

**Tracking pointer.** Q-38.UI-2 resolution. Stage 38 implementation marks tab site with `{/* ISSUE-0030: ICAS + Selective tabs deferred — no pathway→strand mapping in LearningDNADTO v1 */}`.

---

### ISSUE-0028 — Screen 18 student performance table: trend sparkline column omitted in v1

- Status: open
- Severity: low
- Reported: 2026-05-27 (Stage 37 prep — Q-37.3)
- Area: frontend (apps/web) + ui (@mm/ui)
- Tags: teacher-dashboard · @mm/ui · v1.1 · sparkline · screen-18

**Summary.** SCREEN_SPECS Screen 18 Block 4 ("student performance table") specifies a "trend sparkline" column showing recent score trajectory per student. No sparkline primitive exists in `@mm/ui` (71 tests green at Stage 37 start). Adding a charting dependency (Recharts) or a hand-rolled inline SVG for a single dashboard column exceeds Stage 37 budget. Stage 37 ships the column with a static last-score value instead of a sparkline.

**Recommended fix (v1.1).** Add a `Sparkline` primitive to `@mm/ui`: accepts `data: number[]` (last N scores, e.g. last 5 session scores), renders a minimal inline SVG polyline (no axes, no labels). Wire into the student performance table as the trend column. Alternatively, leverage Recharts `LineChart` with `width/height` capped to column width.

**Tracking pointer.** Stage 37 prep Q-37.3. Static value placeholder in student performance table trend column in `apps/web/src/app/(teacher)/teacher/page.tsx`.

---

### ISSUE-0027 — Block 5 Topic Mastery Bars (Screen 18) deferred: class-strand-mastery aggregation endpoint absent

- Status: open
- Severity: medium
- Reported: 2026-05-27 (Stage 37 prep — Q-37.6)
- Area: frontend (apps/web) + backend (analytics-svc)
- Tags: teacher-dashboard · analytics-svc · v1.1 · screen-18 · topic-mastery

**Summary.** SCREEN_SPECS Screen 18 Block 5 ("Topic mastery bars — class-wide per strand") requires a class-level aggregation of mastery by skill strand. No existing endpoint provides this: `GET /analytics/auto-groups?class_id=&skill_id=` returns k-means clustering groups keyed on a specific skill, not per-strand mastery averages. A dedicated endpoint is needed, returning `{ strand_slug: string; avg_mastery: number; student_count: number; computed_at: string }[]` aggregated from `skill_mastery` joined via `skill_node.parent_id` grouped by strand. Stage 37 ships a placeholder card ("Topic mastery breakdown — available in a future release") in the Block 5 slot with a `{/* TODO: ISSUE-0027 */}` comment.

**Recommended fix (v1.1).**
- Add `GET /analytics/class-mastery/{class_id}` endpoint to analytics-svc (teacher/admin role-gated, before service-role gate).
- Aggregation query: `class_student JOIN skill_mastery USING(student_id) JOIN skill_node ON skill_mastery.skill_id = skill_node.id` → `GROUP BY skill_node.parent_id` → `AVG(mastery_level), COUNT(DISTINCT student_id)`. Resolve `parent_id` to strand name from `skill_node`.
- Wire Block 5 in teacher dashboard: `useClassMastery(classId)` SDK hook + `SkillBar` row per strand (pattern exists from parent dashboard SubjectAreasSection).
- Remove placeholder card and ISSUE-0027 comment.

**Tracking pointer.** Stage 37 prep Q-37.6. Placeholder in `apps/web/src/app/(teacher)/teacher/page.tsx` Block 5 slot. ISSUE-0021 updated (Block 5 = next auto-groups consumer too; v1.1).

---

### ISSUE-0025 — Notification spam guard: soft dedup window production-tuning deferred

- Status: open
- Severity: low
- Reported: 2026-05-24 (Stage 34 prep, Q-34.4 resolution)
- Area: backend (notifications-svc)
- Tags: notifications-svc · dedup · v1.1 · spam-guard

**Summary.** `createNotification` handler in notifications-svc deduplicates on `(user_id, type, payload->>'aggregate_id')` within a 1-hour window. This prevents duplicate notifications when, e.g., orchestration-svc triggers two rapid replans within the window. The 1h window is a v1 default; production usage may surface cases where the window is too aggressive (legitimate re-notifications suppressed) or too permissive (duplicates slip through due to different aggregate_id). `deduped: true` is emitted as a log field at the dedup check site so the hit-rate can be observed in production. T3 self-resolve: 1h default documented as default; Q-34.4 Option A resolution.

**Fix (v1.1).** Observe dedup hit-rate via `deduped: true` log field over first 30 days of production usage. Revise window and keying strategy (may want `(user_id, type, date_trunc('day', now()))` for daily-cron-triggered types such as `assignment_due_soon`). Consider a dedicated `notification_dedup` table with TTL-indexed rows if the JSONB path query proves slow at scale.

**Tracking pointer.** ISSUE-0025 inline comment at dedup check site in `supabase/functions/notifications-svc/handlers.ts`. DEV_PLAN Stage 34 C-C-D-V.

### ISSUE-0024 — Real-time assignment tracking: v1 uses polling cron (5-min latency)

- Status: open
- Severity: low
- Reported: 2026-05-23 (Stage 33 prep, Q-33.3 resolution)
- Area: backend (assignments-svc)
- Tags: assignments-svc · real-time · v1.1 · assignment-session

**Summary.** `assignment_session.status` transitions from `in_progress` to `completed` via `fn_sync_assignment_completion()` — a pg_cron polling function that runs every 5 minutes (migration 0015). Teacher tracking views (`GET /assignments/{id}/tracking`) may show stale `in_progress` status for up to 5 minutes after a student completes a session. Acceptable for v1 (teacher checking tracking is not latency-sensitive).

**Fix (v1.1).** Upgrade to outbox-driven: when intelligence-svc processes a session (pipeline `processed` state), write `outbox_event` with type `assignment_session_completed`; jobs-worker dispatches new `job_type = pipeline.assignment_session_completed` to `assignments-svc POST /assignments/pipeline/session-completed`; handler does immediate UPDATE on `assignment_session`. Requires ADR-0031 route table amendment + new pipeline endpoint in assignments-svc.

**Tracking pointer.** Q-33.3 Option B resolution. Migration 0015: `fn_sync_assignment_completion()`.

### ISSUE-0023 — Idempotency-Key enforcement on assignments-svc POST endpoints

- Status: open
- Severity: medium
- Reported: 2026-05-23 (Stage 33 prep, Q-33.7 resolution)
- Area: backend (assignments-svc)
- Tags: assignments-svc · idempotency · v1.1 · arch-drift

**Summary.** Arch §4.8 specifies Idempotency-Key on `POST /assignments` (teacher create) and `POST /assignments/{id}/start` (student start). v1 ships without server-side enforcement: the header is parsed and logged (with inline `// DEV-20260523-1 + ISSUE-0023` comment at parse site) but no dedup storage or replay detection is implemented. Duplicate-create risk is theoretical in v1 — no teacher concurrency UX exists; single-user assignment creation has no retry pressure. Q-33.7 Option C resolution.

**Fix (v1.1).** Choose between:

- Option A: Reuse shared `api_idempotency_key` table (owned by assessment-svc per arch §1.2) — requires verifying cross-service write permission and RLS shape.
- Option B: Add `idempotency_key` column to `assignment` and `assignment_session` tables with UNIQUE constraint; enforce dedup at INSERT time in a new migration.

**Recommended:** Option B (self-contained; no cross-service table ownership questions).

**Tracking pointer.** DEV-20260523-1. Parse-and-log site: `supabase/functions/assignments-svc/handlers.ts` (createAssignment + startAssignment).

### ISSUE-0022 — GET /intelligence/audit-log pagination: v1 returns LIMIT 200 + truncated flag

- Status: open
- Severity: low
- Reported: 2026-05-22 (Stage 32 pre-implementation, surfaced at morning ritual)
- Area: backend (intelligence-svc)
- Tags: intelligence-svc · pagination · v1.1 · audit-log

**Summary.** `GET /intelligence/audit-log/{student_id}?layer=&from=&to=` returns a maximum of 200 rows (ORDER BY created_at DESC) with a `truncated: boolean` flag in the response envelope when the result count equals 200. No cursor or offset pagination is implemented in v1. For students with dense audit histories (heavy usage across many algorithm versions), 200 rows covers the most recent ~2–4 weeks of intelligence activity which is sufficient for v1 dashboard use cases.

**Fix (v1.1).** Cursor-based pagination via `created_at` watermark: `?before=<ISO8601 timestamp>` query param; response includes `next_cursor: string | null`. Removes LIMIT 200 ceiling.

**Tracking pointer.** Stage 32 implementation. Inline comment at query site: `// ISSUE-0022: v1 LIMIT 200 + truncated flag; cursor pagination deferred to v1.1.`

### ISSUE-0021 — GET /analytics/auto-groups route shape mismatch with arch §4.7

- Status: open
- Severity: medium
- Reported: 2026-05-22 (Stage 32 morning ritual pre-read; deviation surfaced from Stage 30)
- Area: backend (analytics-svc)
- Tags: analytics-svc · routing · arch-drift · v1.1

**Summary.** Stage 30 shipped `GET /analytics/auto-groups?class_id=&skill_id=` (query params). Arch §4.7 (line 1567) specifies `GET /analytics/auto-groups/{class_id}/{skill_id}` (path params). No consumer existed at Stage 30 time, so the deviation had zero runtime impact. First real consumer is Stage 37 (Teacher Dashboard). Perpetuating the query-param shape to Stage 37 would require coordinating a later breaking change against an established consumer.

**Fix (v1.1 / Stage 37 coordinator).** Migrate analytics-svc route to `/analytics/auto-groups/{class_id}/{skill_id}` path params in the same commit that implements the Stage 37 Teacher Dashboard consumer. Zero-downtime: no external consumers until that stage.

**Tracking pointer.** DEV-20260522-1. All new Stage 32 endpoints implement arch path-param shape — deviation not perpetuated.

**Stage 37 update (2026-05-27).** Stage 37 confirmed: teacher dashboard does NOT consume `GET /analytics/auto-groups`. Block 5 (Topic Mastery Bars, Screen 18) is deferred to v1.1 per Q-37.6 + ISSUE-0027 — the auto-groups endpoint supplies k-means clustering groups, not strand mastery averages; Block 5 requires a separate `GET /analytics/class-mastery/{class_id}` endpoint. With Block 5 deferred there is no Stage 37 auto-groups consumer. ISSUE-0021 carries forward unchanged; next consumer = v1.1 Block 5 implementation (ISSUE-0027).

### ISSUE-0020 — POST /orchestration/generate-plan synchronous in v1; async upgrade deferred

- Status: open
- Severity: low
- Reported: 2026-05-21 (Stage 31 prep, Q-31.4 resolution)
- Area: backend (orchestration-svc)
- Tags: orchestration-svc · async · v1.1 · generate-plan

**Summary.** `POST /orchestration/generate-plan/{student_id}` calls `processOrchestratorReplan` synchronously in v1 and returns a `LearningPlanDTO` (200). Arch §4.6 describes this endpoint as "trigger regeneration" (ambiguous). The async shape — enqueue `pipeline.orchestration_replan` into job_queue via outbox and return 202 — is architecturally cleaner for a heavy computation but deferred until p95 plan-generation timing is measured in a deployed environment.

**Trigger for upgrade.** If `POST /orchestration/generate-plan` p95 > 2 s (dashboard load budget per BUILD_CONTRACT §10), upgrade to async: `outbox_event` INSERT → outbox-dispatcher enqueue → job_queue → worker → orchestration-svc batch handler → 202 with `job_id`. Idempotency-Key at the HTTP layer remains the dedup mechanism (arch §4.6).

**Tracking pointer.** Stage 31 close commit. Q-31.4 resolved to Option A (sync).

### ISSUE-0019 — Tooling guard: amend-over-pushed-commit pattern (no automated guard)

- Status: open
- Severity: low
- Reported: 2026-05-20 (Stage 30 close)
- Area: tooling / process
- Tags: git · pre-push · near-miss · evening-ritual

**Summary.** During Stage 30 implementation, the implementation commit was accidentally created with `git commit --amend`, rewriting the already-pushed prep commit (9f7b22d) rather than creating a new commit on top of it. `git push` would have been rejected (diverged history) or required force-push to main. Caught by checking `git status -b` before push; recovered via `git reset --soft origin/main` (working tree preserved, 13 files re-committed as 8a8ee8a). Recovery was clean but the guard is vigilance-only — there is no hook or automated check that warns when `--amend` would rewrite a commit already present on origin/main.

**Proposed fix.** Add a `pre-push` or `commit-msg` hook that checks whether the current HEAD's parent matches origin/main's HEAD — if an amend rewrites a published commit, abort with: "ERROR: --amend would rewrite a commit already on origin/main. Use a new commit instead." Alternatively, a standing pre-commit check `git merge-base --is-ancestor HEAD origin/main` can detect the diverge before it happens.

**Impact.** No code loss, no force-push occurred. Process gap only.

### ISSUE-0011 — Results screen content blocks deferred pending DTO + service shipments

- Status: open
- Severity: medium
- Reported: 2026-05-14 (Stage 24 §2A)
- Area: frontend (apps/web) + types (@mm/types) + backend (assessment-svc, intelligence-svc, analytics-svc)
- Tags: results-screen · dto-discipline · v1.1

**Summary.** SCREEN_SPECS §11 specifies five content blocks for the Results screen
(`/results/[id]`) that cannot be built in Stage 24 because their data sources are
not yet available in v1 DTOs or service layers:

(a) **Topic breakdown** — requires per-topic correct/incorrect counts in
`SessionSummaryDTO`; current shape carries only `raw_score` and `skills_touched_count`
with no topic-level breakdown.

(b) **Performance insights** — requires an `ExplanationDTO` SDK hook and the
`packages/core/src/explain-format.ts` helper (file does not exist; `packages/core/src/index.ts`
is empty). intelligence-svc has `ExplanationDTOSchema` at `packages/types/src/intelligence.ts:80`
but no v1 endpoint returns one via the SDK.

(c) **Question review block** — requires `useContentItem` hook + per-response answer state
(which choice was selected, whether correct) accessible from the Results page.
Assessment-svc returns per-response data within the session, but no DTO surface currently
exposes the full response list at results time.

(d) **Practice mastery delta card** — requires intelligence-svc Stages 28+ endpoints
(`/intelligence/mastery-delta/{session_id}` or equivalent) and a corresponding SDK hook.
Not available in v1.

(e) **Diagnostic proficiency map** — requires analytics-svc proficiency data
(`ProficiencyMapDTOSchema` exists in `packages/types/src/proficiency.ts:9` but no
analytics-svc endpoint or SDK hook is built in v1).

(f) **Student Dashboard mastery snapshot** — needs intelligence-svc
`/learner-profile` endpoint (Stage 28+). All three intelligence SDK hooks
(`useLearningDNA`, `useSkillProgress`, `useCausalMap`) are gated Stage 28+.
Stage 25 ships a `StatTile` with aggregated `skills_touched_count` from
`SessionSummaryDTO[]` + "Full mastery data in a future release" micro-copy.

**Effect.** Stage 24 ships stubs for all five blocks: a `{/* TODO: ISSUE-0011x */}` placeholder
comment in each slot, hidden via `{false && ...}` guard so the page renders cleanly without
the block. The hero ring (scored mode), a "Skill progress" placeholder card (practice mode),
and proficiency band labels (diagnostic mode) ship per the Q-24.6 resolution using
`SessionSummaryDTO.raw_score`.

**Recommended fix (post-Stage 28 / v1.1).**
(a) Extend `SessionSummaryDTO` with `topic_breakdown: { topic_id: string; correct: number; total: number }[]`.
(b) Add `useSessionExplanations(sessionId)` SDK hook; build `packages/core/src/explain-format.ts` helper.
(c) Add `useSessionResponses(sessionId)` SDK hook returning per-response state.
(d) Add `useMasteryDelta(sessionId)` SDK hook once intelligence-svc v2 ships (Stage 28+).
(e) Add `useProficiencyMap(studentId, pathwayId)` SDK hook once analytics-svc ships.
(f) Add `useLearnerProfile(studentId)` SDK hook + intelligence-svc `/learner-profile`
endpoint once intelligence-svc v2 ships (Stage 28+); replace Dashboard `StatTile`
stub with real mastery bars.

### ISSUE-0010 — adaptive section-boundary banner pending server-authoritative `current_testlet_id` in `SessionStateDTO` + `RecordResponseResponse`

- Status: open
- Severity: medium
- Reported: 2026-05-13 (Stage 23 §2A)
- Area: types (`@mm/types`) + backend (assessment-svc) + frontend (apps/web Exam Engine)
- Tags: adaptive · dto-discipline · v1.1

**Summary.** UI_CONTRACT §5.1 + SCREEN_SPECS §9 call for two
adaptive-engine-aware behaviours on the Exam Engine page:
1. A "section boundary banner" that appears as the student crosses
   from one adaptive testlet to the next.
2. A `QuestionMap` jump rule that **blocks cross-testlet navigation**
   for adaptive sessions while permitting free jumping for linear.

Neither `SessionStateDTO` nor `RecordResponseResponse` currently
carries an explicit testlet identifier. ADR-0024 (adaptive testlet
routing) defines the routing model server-side, but the boundary
signal is not exposed in the public DTO surface.

**Effect.** Stage 23 ships a **forward-only** jump rule based on
`sequence_number > current_question_index` (per Q-23.4 resolution).
This is conservative — strictly correct for both linear and adaptive
(linear users can simply re-jump after answering forward) but loses
the linear-mode affordance of free back-jumping until the boundary
field exists. The "section boundary banner" is **deferred entirely**
in v1.

**Why not in Stage 23.** The fix needs a DTO change (new optional
field), an assessment-svc handler change to populate it from the
adaptive engine state, and a contract test. That's a backend +
types + handler sweep that doesn't fit the Stage 23 budget and risks
the a11y gate (the merge-blocker). Q-23.4 = defer.

**Recommended fix (v1.1 or earlier if a backend stage gets there
first).** Two parts:
1. **DTO**: add `current_testlet_id: string | null` to
   `SessionStateDTOSchema` and `RecordResponseResponseSchema` in
   `packages/types/src/session.ts` (nullable so linear sessions
   continue to round-trip cleanly).
2. **assessment-svc**: populate the field from the engine state
   row (linear → null; adaptive → current testlet id).
3. **Frontend**: replace the forward-only sequence-number check
   with `currentItem.testlet_id === target.testlet_id` for
   adaptive; render the "Section N" banner on transition.

Add a contract test: assert the field is present in 200 responses
from `/sessions/{id}/state` and `/sessions/{id}/respond` for both
modes.

**Reproduction.**
```bash
grep -nE "testlet|section" packages/types/src/session.ts
# Returns: zero hits.
grep -nE "current_testlet_id" supabase/functions/assessment-svc/handlers.ts
# Returns: zero hits.
```

### ISSUE-0009 — upgrade offline persistence to IndexedDB queue + service-worker shell cache in v1.1

- Status: open
- Severity: medium
- Reported: 2026-05-13 (Stage 23 §2A)
- Area: frontend (apps/web Exam Engine)
- Tags: offline · pwa · v1.1

**Summary.** ADR-0030 (Stage 23) ships an **in-memory**
`useResponseQueue` for offline `/respond` queuing — the minimum
shape that satisfies UI_CONTRACT §5.1's "do not block the user
from answering while offline" rule and the DEV_PLAN exit criterion
("answer 3 offline items, replay on reconnect"). Two pieces of
the original UI_CONTRACT §5.1 contract are **deferred to v1.1**:

1. **IndexedDB persistence**: queue survives page reload during
   offline. v1 stores in-memory only; reload during offline = lost
   queue. Mitigated by 30s autosave cadence; documented in
   `OfflineBanner` microcopy ("Don't reload this page until
   reconnected").
2. **Service worker shell cache**: pre-cache the Exam Engine route
   shell so a cold-start during offline still shows the shell
   chrome. v1 has none; first load offline is unsupported (and not
   a real exam-taker scenario in v1).

**Effect.** v1 students who go offline mid-session and reload the
page will see the resume flow (cold cache, refetch state on
reconnect) instead of an instant restore. The session is not
corrupted — assessment-svc state machine + autosave cadence carry
the worst-case loss to < 30s of in-flight respond writes. ISSUE-0009
is therefore a **degraded UX, not a correctness issue**.

**Why not in v1.** ADR-0030 documents the rationale: spending
half the Stage 23 budget on offline plumbing inverts the priority
DEV_PLAN sets (a11y > offline-resilience > offline-persistence).
Stage 23 buys the resilience; persistence waits.

**Recommended fix (v1.1).** Replace `useResponseQueue`'s in-memory
storage with an IndexedDB-backed `idb-keyval` (or similar) layer
behind the same hook API (`enqueue` / `flush` / `pendingCount`).
Add a service worker registration via `next-pwa` (or a hand-rolled
`sw.ts`) with a runtime caching strategy for the Exam Engine route
shell. Add Playwright e2e: queue persists across page reload during
offline; cold-start during offline shows the shell.

Affects: `apps/web/src/components/exam/useResponseQueue.ts`,
`apps/web/src/components/exam/OfflineBanner.tsx`,
`apps/web/next.config.js` (or `next-pwa.config.js`),
`apps/web/public/sw.js` (new),
`apps/web/playwright/e2e/exam-flow-offline.spec.ts` (new).

**Reproduction.**
```bash
grep -rn "IndexedDB\|idb-keyval\|next-pwa\|sw\.js\|serviceWorker" apps/web/
# Returns: zero hits in source (only references in node_modules).
```

### ISSUE-0014 — exam_date column on user_profile missing; §12.1 projection branch incomplete

- Status: open
- Severity: medium
- Reported: 2026-05-19 (Stage 29)
- Area: backend (intelligence-svc, migration) + frontend (teacher/student UI)
- Tags: predictive · dto-discipline · v1.1

**Summary.** Spec §12.1 `predict_exam_readiness(student, pathway, exam_date)` requires `exam_date` as a projection horizon. No migration adds this column to `user_profile`. Stage 29 implements the projection branch conditionally: when `exam_date` is null (the default for v1 launch), `projected_readiness` and `on_track` are returned as null; all other predictive outputs (`current_readiness_score`, per-skill mastery levels, gap skills, mastery timelines) are computed.

**Recommended fix (v1.1).** (1) Migration 0015: `ALTER TABLE user_profile ADD COLUMN exam_date date;`. (2) Build teacher/student UI to set exam date per pathway. (3) Wire payload from `user_profile.exam_date` in the predictive-refresh job creation path. (4) Restore the `projected_readiness` + `on_track` computation in `processPredictiveRefresh`. Linked: DEV-20260519-1, Q-29.2.

### ISSUE-0015 — cohort_metric_cache reused for per-student predictions (category mismatch)

- Status: open
- Severity: low
- Reported: 2026-05-19 (Stage 29)
- Area: backend (intelligence-svc, analytics-svc)
- Tags: architecture · v1.1

**Summary.** Stage 29 stores per-student readiness predictions in `cohort_metric_cache` per DEV_PLAN directive (`cohort_key = student_id::text`). The table is semantically a cohort analytics aggregate read-model owned by `analytics-svc` per the arch ownership table; its RLS grants teacher/org_admin/platform_admin access only — no student SELECT. Intelligence-svc bypasses RLS via service-role, so the functional v1 path is correct. However, accumulated per-student rows will grow unboundedly and won't be pruned by any analytics sweeper. Cache write site is marked `// ISSUE-0015` for grep-ability.

**Recommended fix (v1.1).** Introduce `student_prediction_cache (student_id, pathway_slug, tenant_id, value jsonb, computed_at timestamptz, PRIMARY KEY (student_id, pathway_slug))` with appropriate RLS (student SELECT own rows; teacher/admin SELECT any). Migrate Stage 29 prediction writes to this table. Add a sweeper cron to prune rows older than 7 days.

### ISSUE-0017 — High-fatigue intervention alert deferred (per-session data not directly queryable)

- Status: open
- Severity: low
- Reported: 2026-05-20 (Stage 30)
- Area: backend (analytics-svc, intelligence-svc)
- Tags: teacher-intelligence · intervention-alert · v1.1

**Summary.** Spec §14.2 defines a "High fatigue" intervention alert trigger: "Avg fatigue onset < 15 min over last 5 sessions." `behaviour_profile.avg_fatigue_onset_minutes` is a rolling average over all sessions; it does not expose the per-session window needed to evaluate the last-5-session condition. Loading per-session fatigue onset requires joining `learning_event` or `behaviour_signal` events (event_type added migration 0013), neither of which is a direct column read on `behaviour_profile`. Stage 30 implements 5 of 6 §14.2 trigger types; `high_fatigue` is omitted with an inline `// ISSUE-0017:` comment at the trigger-evaluation site in `analytics-svc/handlers.ts`.

**Recommended fix (v1.1).** (1) Extend `behaviour_profile` with a `fatigue_onset_last_5_sessions real[] DEFAULT '{}'` column populated by the L2 behaviour intelligence handler on each session close. (2) Implement the `high_fatigue` alert trigger in `processTeacherRefresh`: `AVG(fatigue_onset_last_5_sessions) < 15` minutes. Linked: Spec §14.2, `behaviour_profile` schema (migration 0005), ADR-0032 Stage 30 amendment, ISSUE-0016.

### ISSUE-0016 — async_pipeline_event and analytics_audit_log tables for full observability parity (post ADR-0032)

- Status: open
- Severity: low
- Reported: 2026-05-19 (Stage 29)
- Updated: 2026-05-20 (Stage 30) — audit_log gap added; scope extended.
- Area: backend (intelligence-svc, analytics-svc, migration)
- Tags: observability · pipeline · v1.1

**Summary.** Two separate `NOT NULL` FK constraints block observability writes from non-session-scoped and non-student-scoped pipeline stages:

1. **`pipeline_event.session_id NOT NULL`** (migration 0006) — blocks L5/L7/L9 pipeline steps, which operate at student+pathway or class+skill scope (no session). ADR-0032 (Stage 29) resolves this by skipping `pipeline_event` for L5 and using `intelligence_audit_log` instead. Steps 5 and 7 are absent from `pipeline_event` coverage.

2. **`intelligence_audit_log.student_id NOT NULL`** (migration 0005) — blocks L7 class-scoped writes. ADR-0032 Stage 30 amendment resolves this by skipping `intelligence_audit_log` for L7 too. Observability for L7 is provided entirely by `intervention_alert` inserts + `cohort_metric_cache` UPSERT (domain artifacts as observability surface). Any future pipeline stage that is neither session-scoped nor student-scoped faces the same gap.

**Recommended fix (v1.1).** Introduce two tables:
- `async_pipeline_event (id uuid PK, scope_type text, scope_id uuid, step int, step_name text, status text, started_at timestamptz, completed_at timestamptz, error text, created_at timestamptz)` — covers L5/L7/L9 and any future non-session step; `scope_type` = `'student_pathway'` | `'class_skill'`; `scope_id` = student_id or class_id as applicable.
- `analytics_audit_log (id uuid PK, scope_type text, scope_id uuid, event_type text, input_snapshot jsonb, output jsonb, algorithm_version text, trace_id uuid, created_at timestamptz)` — class-scoped audit log for analytics pipeline stages without `student_id` constraint.

L5 writes `async_pipeline_event` (scope_type='student_pathway'); L7/L9 write both. L1/L2/L3a/L3b continue writing `pipeline_event`. Linked: ADR-0032, ADR-0033, Q-29.4, Q-30.2, ISSUE-0017.

---

### ISSUE-0038 — v1.1-S4 axe-core E2E live run pending

- Status: open
- Severity: info
- Reported: 2026-05-18 (v1.1-S4 close)
- Area: tests (apps/web — Playwright)
- Tags: playwright · a11y · axe-core · exam-content

**Summary.** axe-core E2E spec authored at `apps/web/playwright/e2e/exam-content-a11y.spec.ts`. Spec uses `test.skip()` guard when `E2E_WEB_URL` is absent (codebase pattern) — 2 tests covering `/teacher/content` and `/teacher/content/new`. UI_CONTRACT DoD (lines 748–759) requires zero serious/critical violations on both new teacher content routes — gate is enforced when the spec runs live. No code action required; resolves on first green preview/CI run.

**Tracking pointer.** v1.1-S4 impl commit b8b8290. Spec covers `/teacher/content` and `/teacher/content/new`. ADR-0038 §Implementation Notes.

## Resolved

### ISSUE-0058 — Content manifest difficulty scale mismatch: manifest uses IRT logit notation, DB enforces [0,1] normalized p-value

- Status: resolved — 2026-05-21 (v1.1-S7.1 Gate III r2 — Option 1 linear band-midpoint transform applied)
- Severity: high
- Reported: 2026-05-21 (v1.1-S7.1 Gate III — `item_difficulty_check` constraint failures on items 001/002/003/008)
- Area: content-ops (docs/content/manifests/) + infra (supabase/migrations/0002_content_skill_graph.sql)
- Tags: content-authoring · difficulty · schema · manifest

**Summary.** Gate III live import: 4/8 items rejected with `item_difficulty_check` constraint violation. Manifest used IRT logit notation (-2.0 to +2.0); DB `CHECK (difficulty BETWEEN 0 AND 1)`. Engine Zod contracts (`contracts.ts:88`: `z.number().min(0).max(1)`), DiagnosticEngine binary search, SkillEngine clamps, and band selector (handlers.ts:113–117 `easy:[0,0.35]`, `mid:[0.35,0.7]`, `hard:[0.7,1.0]`) all confirm [0,1] is canonical. Spec §6.4 mandates 0.0–1.0 float; §15.1 uses CTT p-value recalibration (`new_difficulty = 1.0 - observed_p`). Seed data (02_content.sql): all values 0.3/0.55/0.8.

**Resolution.** Option 1 (linear band-midpoint) applied: `-2→0.10`, `-1→0.30`, `0→0.50`, `+1→0.70`, `+2→0.90`. 4 partial rows (items 004–007) deleted by UUID before clean re-import. Gate III r2: HTTP 200, imported: 8, rejected: 0. DB verification: 8 rows at difficulty `0.1, 0.3, 0.3, 0.5, 0.5, 0.7, 0.7, 0.9`.

**Follow-ups filed.** ISSUE-0059 (template correction for S7.2), ISSUE-0060 (RLS advisory).

Related: Gate III r2, ISSUE-0057, ISSUE-0059, `supabase/migrations/0002_content_skill_graph.sql:167`

---

### ISSUE-0055 — Edge runtime BOOT_ERROR: @mm/types symlink path mismatch + .js extension failure

- Status: resolved — 2026-05-21 (v1.1-S7.1 Gate II unblock)
- Severity: critical (blocked all content-svc local dev requests)
- Area: infra
- Tags: edge-runtime · import-map · deno · symlink

**Summary.** pnpm workspace symlinks `@mm/types` using Git Bash path `/c/Users/...`, which doesn't exist inside Docker (container mounts as `/Users/...`). Node-modules resolution failed. Import map with `src/index.ts` pointer failed next because Deno can't resolve `.js` extension relative imports inside `.ts` source files (TypeScript ESM convention); import map scopes cannot intercept relative specifiers. `deno.json` `unstable: ["sloppy-imports"]` failed because the edge runtime pre-compiles to `/var/tmp/sb-compile-edge-runtime/` where `.ts` source files are absent.

**Fix.** `supabase/functions/deno.json` (newly created) provides the import map via its `imports` key — this is what the edge runtime worker ACTUALLY reads (not `import_map.json` from `SUPABASE_INTERNAL_FUNCTIONS_CONFIG`, which is ignored by workers). Both `@mm/types` and `@mm/engines` point to `../../packages/types/dist/index.js` and `../../packages/engines/dist/index.js` respectively. Compiled `.js` files in `dist/` contain relative `.js` imports that resolve to sibling `.js` files — no extension remapping needed. `packages/types` dist was rebuilt (`pnpm --filter @mm/types build`) to include `ImportManifestSchema` added in v1.1.

**Files.** `supabase/functions/deno.json` (created), `supabase/functions/import_map.json` (updated — was previously unused by workers; retained for CLI tooling). `import_map.json` `scopes` section removed (scopes cannot intercept relative specifiers per WHATWG spec).

**Gate II unblocked.** HTTP 200, `dry_run: true`, `rejected: 0`, all 8 items `status: ok`.

---

### ISSUE-0056 — content-svc route dispatcher 404 in local dev: URL prefix not stripped

- Status: resolved — 2026-05-21 (v1.1-S7.1 Gate II unblock, BUG-0001)
- Severity: critical (all routes returned 404 in local dev)
- Area: backend
- Tags: edge-runtime · routing · local-dev

**Summary.** The Supabase edge runtime v1.73.13 passes `req.url` with pathname `/content-svc/<rest>` (no `/functions/v1/` prefix) in local dev. `content-svc/index.ts:96` stripped only `/functions/v1/content-svc`, so `path` was always `/content-svc/content/import` instead of `/content/import`. Every route check failed; all requests fell through to the catch-all 404.

**Fix.** Regex changed from `/^\/functions\/v1\/content-svc/` to `/^\/(functions\/v1\/)?content-svc/` — makes the `/functions/v1/` prefix optional. Both production and local dev URL forms now reduce correctly to the bare `/route` path. Regression test added: `contract.test.ts` describe block `'content-svc — route prefix stripping (BUG-0001)'` (5 cases: production form, local-dev form, no-prefix passthrough incl. `/functions/v1/billing-svc/x`, mid-path anchor, bare `/content-svc` → empty string).

**Files.** `supabase/functions/content-svc/index.ts:96`, `supabase/functions/content-svc/__tests__/contract.test.ts`.

---

### ISSUE-0042 — Zod parse gap at content-svc and assessment-svc API boundaries

- Status: resolved — 2026-05-19 (commit b3eb668)
- Severity at resolution: high
- Reported: 2026-05-18 (v1.1-S5 chore close — P2 audit)
- Area: backend (supabase/functions/content-svc/handlers.ts, assessment-svc/index.ts)
- Tags: validation · zod · api-boundary · security

**Summary.** Two API boundary violations of the CLAUDE.md non-negotiable "Zod validation at every API boundary":

1. **content-svc `createItem` / `updateItem`** (`handlers.ts:840–848`): assertion-based checks instead of `ItemCreateDTOSchema.parse()`.
2. **assessment-svc `createSession`** (`index.ts:222`): `as CreateSessionRequest` type assertion with no Zod parse.

**Resolution.** content-svc scope closed at b3eb668 (2026-05-19): `createItem` and `updateItem` now use `ItemCreateDTOSchema.safeParse()` / `ItemUpdateDTOSchema.safeParse()`; 422 VALIDATION_ERROR returned on failure with first-issue field-path message. +3 contract tests. content-svc scope only; assessment-svc `index.ts:222` type-assertion gap carries non-blocking per ADR-0040.

---

### ISSUE-0037 — `sb_secret_*` literal observed in local working tree of `apps/web/.env.local.example`

- Status: resolved — 2026-05-15 (ISSUE-0037 remediation, this commit on v1.1/exam-content)
- **Severity at resolution: info** (downgraded from initial filing's "high" — see Findings)
- Reported: 2026-05-15 (v1.1-S2 impl — surfaced during pre-push V16 diff inspection)
- Area: infra · security · template-hygiene
- Tags: secrets · supabase · env-template · pre-commit-guard

**Initial filing** asserted: a committed `sb_secret_*` service_role credential in `apps/web/.env.local.example`, propagating to every clone via git history, requiring rotation + scrub + history rewrite + CI guard. Severity = high.

**Findings at remediation** (two, both reducing severity):

1. **Never-committed.** `git log --all -S "sb_secret_N7UND0UgjKTVK" -- apps/web/.env.local.example` returns **empty**. HEAD's `.env.local.example` always carried the original `your-anon-key` / `your-service-role-key` placeholder strings (see commits `5e3e1f0` Stage 14, `75984c6` Stage 26, `3a782fc` Stage 42 — only three modifications, none introducing the literal). The `sb_*` literals existed only in the operator's local unstaged working tree and never reached origin. The single attempt to commit them — embedded as evidence inside the ISSUE-0037 description block in `OPEN_ISSUES.md:21` during the v1.1-S2 chore — was correctly blocked by GitHub push-protection; that chore landed clean at `f72a7a8` after redaction.

2. **CLI shared defaults, not project secrets.** `npx supabase start` output on this project includes the explicit banner: *"API keys and JWT secrets are shared defaults. Do not use in production."* The exact `sb_publishable_*` and `sb_secret_*` values printed by the CLI (suffixes redacted here so this doc itself does not carry the literal — `npx supabase status` reveals them on any developer's machine) are built into the Supabase CLI itself and byte-identical across every install running the new-format key flag. `stop && start` cannot rotate them by design (would defeat the CLI's consistent-dev-keys UX). They are not exclusive credentials.

**Combined severity profile after findings:** info / template-hygiene defect. No incident, no exposure beyond what every Supabase CLI user already has locally, no rotation possible. The original "high" rating assumed an exclusive credential in committed history; both legs of that assumption were wrong.

**Remediation delivered (this commit):**

- **D1 N/A (rotation impossible).** `npx supabase stop && npx supabase start` was run and confirmed the keys are byte-identical CLI defaults. No actual rotation; documented as N/A above.
- **D2 scrub.** `apps/web/.env.local.example` now uses placeholders of identical shape: `sb_publishable_REPLACE_WITH_LOCAL_ANON_KEY` / `sb_secret_REPLACE_WITH_LOCAL_SERVICE_ROLE_KEY` + a comment block telling contributors to retrieve live values via `npx supabase status`. Stripe placeholders already correct. The HEAD-vs-working-tree divergence that triggered the filing is closed: working tree now matches a clean template.
- **D3 pre-commit guard.** `.githooks/pre-commit` rejects any staged line `KEY=<prefix><value>` where `<prefix>` ∈ {`sb_secret_`, `sb_publishable_`, `sk_live_`, `sk_test_`, `eyJ`} AND `<value>` contains BOTH lowercase letters AND digits (the real-key entropy heuristic). Tested: placeholders pass, real key shape rejected. Documented in `CLAUDE.md §Pre-commit secret guard`. Active per clone after `git config core.hooksPath .githooks` (same activation as the existing commit-msg hook).
- **D4 this entry.** Severity downgraded high → info; resolution paragraph written.

**Operator follow-ups (none required for security):**
- If desired, a future migration to a per-project JWT signing secret (override the CLI shared default) would create truly project-exclusive keys. Out of v1.1 scope; would need an ADR if pursued.
- If GitHub repository-level secret-scanning rules ever produce a false-positive backlog because of the CLI's shared-default values appearing in dev tooling output, document an allowlist exception for that specific known value.

**Cross-refs.** `CLAUDE.md §Pre-commit secret guard`; `.githooks/pre-commit`; `apps/web/.env.local.example` HEAD post-remediation; commit `f72a7a8` (v1.1-S2 chore, where the literal was first redacted-on-attempt by GitHub push-protection).

---

### ISSUE-0029 — Stage close typecheck gate may return stale turbo-cached green when node_modules drift

- Status: resolved — 2026-05-31 (Stage 41)
- Severity: medium
- Reported: 2026-05-27 (Stage 37 prep — DEV-20260527-1)
- Area: tooling / process
- Resolution: `CLAUDE.md §Evening ritual` step 9 + `§Close-ritual cache-bust` section canonised. `pnpm install && pnpm turbo typecheck --force` mandatory at every stage close. Resolves DEV-20260527-1.

### ISSUE-0026 — useLearningPlan SDK hook path malformed: double-svc segment + missing {student_id}

- Status: resolved — 2026-05-11 (Stage 40 D1)
- Severity: low
- Reported: 2026-05-26 (Stage 36 pre-read R7)
- Area: frontend (packages/sdk)
- Resolution: Path corrected to `/orchestration-svc/orchestration/plan/${encodeURIComponent(studentId)}/current`. Regression-guarded by `useLearningPlan — ISSUE-0026 path fix` test in `packages/sdk/src/__tests__/stage40.test.ts`. Commit: 0af5afb. Moved to Resolved at Stage 41 audit triage (2026-05-31).

### ISSUE-0018 — Env var documentation gap: 5 service URL env vars undocumented

- Status: resolved — 2026-05-31 (Stage 41)
- Severity: low
- Reported: 2026-05-20 (Stage 30 pre-push verification)
- Area: infra / docs
- Resolution: `docs/dev/deployment.md` created with all 5 service URL vars + fallback resolution logic + migration 0017 deploy-order note. Closes ISSUE-0018.

### ISSUE-0013 — Evening ritual test count methodology (tail truncation drift)

- Status: resolved — 2026-05-31 (Stage 41 audit triage)
- Severity: low
- Reported: 2026-05-18 (Stage 28 close)
- Area: tooling / process
- Resolution: Full `pnpm -r run test` output captured at every stage close since Stage 28. Per-package line counts included in DAILY_LOG.md Stage 28+ entries. Methodology drift was Stage 22a–27 only; no functional impact. Fix applied in practice from Stage 28 onward.

### ISSUE-0006 — intelligence-svc L3a bypasses skill-graph cache (architectural inconsistency vs arch §9.3)

- Status: resolved
- Severity: medium
- Reported: 2026-05-09 (Stage 21 §2A)
- Closed: 2026-05-18 (Stage 28)
- Area: backend (intelligence-svc)
- Tags: architectural-consistency · cache · pre-launch

**Resolution (Stage 28).** `runCausalScoped` in `intelligence-svc/handlers.ts`
now reads graph data via `skillGraph?.adjacency ?? new Map()` (injected by
`processSession` from the skill-graph-cache) instead of a direct `skill_edge`
query. `ProcessSessionInput` accepts `skillGraph?: SkillGraphCache | null`
(test path) or `graphLoader?: SkillGraphCacheLoader` (production path). The
`index.ts` dispatcher creates the loader via `createDbLoader(db)` and injects
it. After this fix there are zero direct `skill_edge` queries in
`intelligence-svc/handlers.ts`. Verified by `grep -n "skill_edge"
supabase/functions/intelligence-svc/handlers.ts` → no matches.

### ISSUE-0008 — assessment-svc dispatcher emits `CONFLICT` / `LOCK_CONFLICT` codes not in `@mm/types` `ErrorCodeSchema`

- Status: resolved
- Severity: medium
- Reported: 2026-05-12 (Stage 22b)
- Closed: 2026-05-16 (Stage 26)
- Commit: `75984c6`
- Resolution: Added `LOCK_CONFLICT` as 16th `ErrorCodeSchema` value. Replaced all 11 bare
  `'CONFLICT'` strings in `assessment-svc/handlers.ts` + `intelligence-svc/handlers.ts` with
  canonical codes (`ACTIVE_SESSION_EXISTS`, `VERSION_CONFLICT`, `SESSION_CONFLICT`). Updated
  4 contract test assertions to match. Scope note: `auth-svc`/`users-svc` don't exist in v1;
  `content-svc` was already clean — only 2 files required changes. All tests green.

### ISSUE-0007 — SDK record/checkpoint/abandon hooks do not plumb `X-Session-Lock` header per ADR-0026

- Status: resolved
- Severity: medium
- Reported: 2026-05-12 (Stage 22b)
- Closed: 2026-05-16 (Stage 26)
- Commit: `75984c6`
- Resolution: Added `lockToken` to `MmClient` public + private methods. Updated `useRecordResponse`
  (lockTokenRef + auto-rotation from response), `useCheckpoint` (lockTokenRef, no rotation).
  Added `useAbandon` hook. Exam page seeds lock_token via `useEffect` on `sessionState.data`.
  Added `AbandonSessionResponseSchema` to `@mm/types`. 5 new ADR-0026 header tests in
  `client.test.ts`. ADR-0031 NOT filed (mechanical fulfilment of ADR-0026; idiomatic React).
  All tests green.

### ISSUE-0005 — `apps/web/.env.local.example` populated with real Supabase URL + anon JWT

- Status: resolved
- Severity: medium
- Reported: 2026-05-08 (Stage 19)
- Closed: 2026-05-16 (Stage 26)
- Commit: `75984c6`
- Resolution: Restored `apps/web/.env.local.example` to placeholder values
  (`https://your-project.supabase.co` / `your-anon-key`). D5 of Stage 26.

### ISSUE-0012 — `.git/hooks/pre-commit` absent; BUILD_CONTRACT §11.2 trailer prohibition unenforced

- Status: resolved
- Severity: low
- Reported: 2026-05-14 (Stage 24 close)
- Closed: 2026-05-15 (Stage 25 audit day)
- Resolution: Stage 25 side-task. `.githooks/commit-msg` hook created and tracked in the repo
  at `.githooks/commit-msg`. Hook scans the commit message file for `Co-Authored-By:` lines
  and exits 1 if found (BUILD_CONTRACT §11.2). Activated for this clone via
  `git config core.hooksPath .githooks`. Run once per fresh clone to re-activate.
  Commit: `975e815`.

### ISSUE-0004 — outbox_event 7-day cleanup not wired (arch §5.6)

- Status: resolved
- Severity: low
- Reported: 2026-05-03 (Stage 10)
- Closed: 2026-05-04 (Stage 14 close)
- Resolution: Migration 0011 adds `fn_cleanup_outbox()` (DELETEs processed outbox_events
  older than 7 days) and schedules `outbox.cleanup` cron via `cron.schedule()` at `'15 4 * * *'`
  (04:15 UTC daily). Commit: c3df874.

### ISSUE-0003 — GitHub Actions internal Node.js 20 runtime — upstream action upgrade required before 2026-06-02

- Status: resolved
- Severity: medium
- Reported: 2026-05-02 (post Stage 5 close)
- Closed: 2026-05-03 (Stage 10 audit day)
- Resolution: Bumped `actions/checkout`, `pnpm/action-setup`, `actions/setup-node` from @v4
  to @v5 in `.github/workflows/ci.yml`. All 4 jobs (lint, typecheck, unit, migration-dryrun)
  updated. No ADR filed — no non-trivial behavior change (version bump only).
  Commit: 9eb2f4b. Well ahead of 2026-06-02 forced-upgrade deadline.

### ISSUE-0002 — SECURITY DEFINER helpers: Stage 2/3 helpers missing `REVOKE EXECUTE FROM anon`

- Status: resolved
- Severity: low
- Reported: 2026-05-02 (Stage 5)
- Closed: 2026-05-03 (Stage 10 audit day)
- Resolution: Migration 0009 adds REVOKE FROM authenticated + REVOKE FROM anon + GRANT TO
  authenticated for all 6 Stage 2/3 SECURITY DEFINER helpers. 009_security_definer_retrofit.sql
  pgTAP tests confirm anon denial + authenticated access (440/440 green). No ADR filed —
  A1 triple-REVOKE pattern already documented in BUILD_CONTRACT §6 and PGTAP_PATTERNS P3.
  Commit: 75ac299.

### ISSUE-0001 — CI node-version: GitHub Actions Node 20 deprecation; upgrade to Node 22 LTS

- Status: resolved
- Severity: medium
- Reported: 2026-05-02 (Stage 3 morning reconciliation)
- Closed: 2026-05-02 (Stage 5 audit day)
- Resolution: Bumped `node-version` to `"22"` in all three CI runner jobs (lint, typecheck, unit);
  updated `package.json` `engines.node` to `>=22`; created `.nvmrc` with `22`.
  ADR-0010 filed. Commit: this audit day commit.

### ISSUE-0001 (original, 2026-05-01) — UTA-table SELECT policies: tenant-scoped only, per-role absent until Stage 5

- Status: wont-fix
- Severity: medium (at close)
- Reported: 2026-05-01 (Stage 2)
- Closed: 2026-05-02
- Rationale: Duplicate of ADR-0004 deferral. ADR-0004 fully documents the scope decision and
  the Stage 5 obligation. The same forward-flag is recorded in PROJECT_STATE.md "Notes for next
  session". A separate issue entry added noise without adding information. Node-runtime CI bump
  refiled as ISSUE-0001 — that issue has a hard external deadline (2026-06-02) that warrants
  an open issue; the RLS deferral does not (it is a planned Stage 5 deliverable, not a deadline risk).
