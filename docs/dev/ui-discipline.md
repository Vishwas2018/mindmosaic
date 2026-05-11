# ui-discipline.md — MindMosaic Implementation Discipline

> Canonised Stage 41 (2026-05-31) from Phase 2 (Stages 28–40) retros.
> Summarised in CLAUDE.md §T-Discipline. This file is the authoritative
> detail document. Living — amend at each audit day (every 5 stages).

---

## Overview

The T-discipline rules emerged from a systematic review of process failures
across Phase 2. They are not aspirational — each rule has a named incident
where its absence caused measurable rework or near-miss. The rules are ordered
by the phase of the implementation cycle where each applies.

Core philosophy: **the cost of the 5-minute check is always lower than the
cost of discovering the miss three stages later.** Every rule has a concrete
upstream intervention that eliminates a class of downstream rework.

---

## T1 — Pre-read target files verbatim

**Rule:** Before writing any C-C-D-V or implementation code, read every file
cited in the deliverable with explicit file:line citations. Verbatim means:

1. Zod schema field names — read the actual `.shape` object, not the DTO type
   alias. Types alias ≠ Zod schema field set.
2. Function signatures — read the actual parameter list, including defaults.
   Spec pseudocode signatures may omit parameters (DEV-20260518-1 precedent).
3. Backend handler body — read the handler, not just its route entry. Handler
   may enforce constraints not visible from the route registration.
4. Enum values — read the migration file, not the TypeScript type alias.

**Do:** `Read packages/types/src/orchestration.ts` → note `LearningPlanDTOSchema`
fields verbatim → cite in C-C-D-V as `plan_id (uuid), plan_type (enum), ...`.

**Don't:** Write C-C-D-V that says "uses `LearningDNADTO.skill_mastery`" without
reading the schema first. `LearningDNADTO` has no `skill_mastery` field — the
field is `domain_profiles`.

### Precedent chain

| Stage | Incident | Catch point | Cost |
|---|---|---|---|
| 28 | `SkillGraphCache.adjacency` edge metadata assumed to have `strength` + `dependency_class` fields — neither present. Q-28.8 filed after implementation began. | Pre-push | Proceeded with Option B (no filtering) — correct, but process gap. |
| 29 | `on_track` field in docstring TODO comment not verified against spec §12.1. Spec explicitly names the field. | Pre-push review | Corrected in same commit. Near-miss only. |
| 30 | `auto_group(max_groups=4)` default not read — k=3 chosen silently. Spec §14.1 pins k=4. | Pre-push verification | k-means rerun. Correct. |
| 36 | `useChildRecentSessions` sent `?student_id=` to backend; backend silently ignored the param. Backend handler gap not caught in T1 pre-read of the handler body. | Stage 38 prep (2 stages later) | Stage 38 Q-38.1 fixed both teacher + parent use cases in one edit. |
| 40 | C-C-D-V D7 cited `learnerProfile.skill_mastery`; actual field is `domain_profiles`. Also: `buildExplanationCards` requires `CausalMapDTO.active_misconceptions` shape (has `category` + `affected_skill_count`) — `LearningDNADTO.active_misconceptions` lacks both. | T5 checkpoint (intra-stage) | Corrected before wiring. No rework to committed code. |

**Process fix (in force from Stage 41):** T1 pre-read must cite the Zod schema
field names verbatim for every DTO cited in a C-C-D-V. Not the TypeScript type
alias — the schema shape. Use `Read` tool with file:line offset before writing
any deliverable description involving that DTO.

---

## T2-tightened — Q-* filing timing

**Rule:** When a self-resolve question is identified mid-implementation, file the
`QUESTIONS.md ## Resolved` entry in the same work session that introduces the
resolving code — before moving to the next handler or component. Pre-push
verification is a backstop, not the first surfacing.

**Do:** Identify that `alert_type='manual'` is missing from the enum while
reading migration 0001 (T1). File Q-38.6 in QUESTIONS.md immediately. Write
migration 0017 `ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'manual'`. Then
write the handler that inserts `alert_type='manual'`.

**Don't:** Write the handler, then note "should file a Q for this" and defer to
the pre-push verification round. The pre-push round is a safety net, not the
intended Q-filing moment.

### Precedent chain

| Stage | Incident | Pattern |
|---|---|---|
| 28 | Q-28.8 — adjacency edge metadata fields not round-tripped. Proceeded without filing. | No Q filed at all (pre-T2). |
| 31 | Q-31.5/6/7 — surfaced during pre-implementation analysis and filed in implementation commit. First stage T3 "honored" per retro. | Correct timing: filed before implementation. |
| 32 | Q-32.3/5/6/7 — surfaced mid-implementation. Filed in evening commit (not same session). | T2 timing gap — filing deferred to close. |
| 34 | Q-34.5/6 — `notification_type` threading + aggregate_id. Filed retroactively at pre-push, not mid-impl. Second occurrence flagged. Tightening imposed for Stage 35. | T2 timing gap — filing deferred to pre-push. |
| 35 | Q-35.1–4 — all filed in prep commit. Zero retroactive. **First clean T2-tightened stage.** | Correct pattern. |
| 38 | Q-38.6 — enum gap caught mid-impl (T1 pre-read of migration 0001). Filed immediately. Migration 0017 created before handler code. T2-tightened working as designed. | Correct pattern. |

**The gap is always filing-timing, not classification.** Q-32.3/34.5/34.6 were
all valid T3 self-resolves — the implementation choices were correct. The process
miss was not writing the Q-*.md entry at the moment of resolution.

---

## T3 Option 3 hybrid — Round-trip threshold

**Rule:** Operator round-trip REQUIRED when the Q resolution touches any of:
DTO shape, deliverable scope, database schema, authentication model, or service
boundary. Self-resolve PERMITTED for tight implementation details: numeric
thresholds, filter inclusivity, error code choices, sort order — with documented
options + default cited.

### Hard cases (always round-trip)

1. DTO shape change: adding/removing fields, changing nullability, changing enum
   values. Reason: type changes propagate through SDK, tests, and API contracts
   at compile time.
2. Scope change: delivering more or fewer endpoints than specified. Reason:
   downstream stages may assume the extra endpoint exists or doesn't exist.
3. Schema change: new column, new table, new index, new constraint, new enum
   value (DDL). Reason: one-way in production; irreversible without migration.
4. Auth model change: which roles can access an endpoint, whether service-role
   bypasses apply. Reason: security perimeter — conservative wins.

### Self-resolve permitted

Numeric thresholds (`mastery > 0.7`), filter window semantics (`status IN
('active', 'suspected')`), hash function choices (`${id}:${mode}` composite),
sort order, LIMIT defaults, error message copy.

### Precedent chain

| Stage | Q-* | Classification | Outcome |
|---|---|---|---|
| 28 | Q-28.8 (SkillGraphCache edge fields) | Should have been round-trip (schema/arch gap) | Proceeded as self-resolve Option B. Correct outcome; process gap. |
| 30 | Q-30.3/4/5/6 | Mixed: Q-30.3 (k-means algorithm location) should be round-trip (service boundary); Q-30.4/5/6 are self-resolve (threshold, scope) | All self-resolved. k=4 silent narrowing (separate T1 miss). |
| 32 | Q-32.3 (PathwayReadiness field mapping) | Should have been round-trip (DTO shape — all 4 fields mapped to single composite). | Self-resolved. Third consecutive T3 drift. Pattern named. |
| 33 | Q-33.8 (pathway_id schema gap) | **Correct round-trip** — DTO shape + schema. Blocking. Operator confirmed Option A. | First T3 Option 3 working correctly. Pattern broken. |
| 35 | Q-35.1/2 (DTO shape + auth model) | **Correct round-trip** in prep commit. | T2-tightened + T3 Option 3 both clean. |
| 38 | Q-38.6 (alert_type enum) | **Correct round-trip** (schema + DDL — one-way ALTER TYPE). | T2-tightened + T3 Option 3 both correct. |

---

## T4 — No --amend over pushed commits

**Rule:** After a commit is on `origin/main`, never `git commit --amend`. Any
fix to that commit requires a new commit on top. If a pre-push hook failure
occurs after the previous commit is already pushed, the fix goes in a new commit
— `--amend` would rewrite the published commit and create diverged history.

**Do:** Discover a lint error after `git push`. Stage the fix. `git commit -m
"fix(api): correct handler return type"`. Push the new commit on top.

**Don't:** `git commit --amend` on a commit that `git log --oneline origin/main`
already shows. This creates diverged history requiring force-push to main or a
recovery reset.

### Precedent chain

| Stage | Incident | Recovery |
|---|---|---|
| 30 | Implementation commit accidentally created with `git commit --amend`, rewriting the already-pushed prep commit (9f7b22d). `git push` was diverged. Caught by `git status -b` before push. | `git reset --soft origin/main` — working tree preserved, 13 files re-committed as new commit (8a8ee8a). ISSUE-0019 filed. |
| 35 | T4 fix-before-push applied correctly for `intelligence_audit_log.tenant_id NOT NULL` gap. Caught in working tree before any push. | Fix staged and committed in same pre-push round. No amend needed. |
| 40 | Pre-commit hook blocked AI Co-Authored-By trailer in first commit attempt. Hook exits 1 — commit did NOT happen. New commit created (no --amend). | Correct. BUILD_CONTRACT §11.2 enforced. |

**ISSUE-0019 (open, low):** No automated guard for `--amend` over pushed commits.
Vigilance is the only current guard. Proposed: pre-push hook that detects
diverged local/remote HEAD. Address in Stage 48 hardening pass.

---

## T5 — UI fidelity gate

**Rule:** For any UI stage:
1. Mockup-driven layout sketch produced in prep commit (T5 layout sketch).
2. Skeleton checkpoint surfaced to operator at end of layout pass (after routing
   + static structure, before data hook wiring). Operator holds for acknowledgement.
3. Mockup is the primary visual authority (UI_CONTRACT §1.1). Where C-C-D-V
   and mockup diverge, mockup wins for layout/structure; SCREEN_SPECS wins for
   field names and validation rules.

**Do:** Before writing `MasterySnapshotCard`, inspect both the mockup (lines
530-538 show vertical bars: label top, fill below) AND the SkillBar component
props (`layout?: 'vertical' | 'horizontal'`, default vertical). Write C-C-D-V
as "vertical SkillBars (default — no layout prop needed)".

**Don't:** Write C-C-D-V from memory as "horizontal SkillBars". Stage 40 T1
read defect: "horizontal" was architect drift written without inspecting the
component. Q-40.5 surfaced it at T5 checkpoint. The correct orientation is
vertical (SkillBar default), which is what the mockup shows.

### Mockup authority clause

C-C-D-V layout/visual specifications must be derived from two sources
simultaneously: (1) the Claude Design HTML mockup for structure/components, AND
(2) the existing component props for what the component actually supports. If
the two conflict (C-C-D-V wrote "horizontal" but component has no horizontal
mode), the component and mockup win over the C-C-D-V text.

### Precedent chain

| Stage | Incident | Catch point |
|---|---|---|
| 38 | T5 mid-impl skeleton checkpoint skipped — context compaction cut the session before the operator pause point. UI outcome was correct (prep mockup followed) but the operator pause did not occur. | Post-hoc retro only. No rework. Process miss. |
| 39 | T5 checkpoint honored. 5-step wizard skeleton surfaced before data wiring. Q-39.UI-1..6 resolved in prep commit. | Intra-stage. No issues. |
| 40 | T5 checkpoint surfaced Q-40.5 (SkillBar orientation: C-C-D-V said "horizontal", mockup + component say "vertical"). Q-40.6 (dashboardSubheading copy confirmed). Resolved before component code written. | Intra-stage. No rework. |

---

## Pre-push verification round

**Catalogue of verification steps (V1–V11 pattern, Stages 33–40):**

| Step | Check | Command / Method | Stage first required |
|---|---|---|---|
| V1 | Test enumeration: count + verbatim names | `git diff <prep-sha>..<impl-sha> -- "**/*.test.*" \| grep "it(\\|test("` | 33 |
| V2 | T5 mid-impl skeleton checkpoint | Operator hold acknowledged; noted in DAILY_LOG | 38 |
| V3 | Stale-comment grep: prior stage names in new files | `grep -nrE '<prior-stage-symbols>' <new-files>` — expect 0 | 33 |
| V4 | T2-tightened evidence: Q-* entries verbatim | `grep -n "Q-<N>." docs/dev/QUESTIONS.md` | 35 |
| V5 | Migration DDL: one-way DDL deploy notes | Manual review of migration file + DEVIATIONS.md entry | 38 |
| V6 | ADR-0029 SDK prefix: all hooks use service prefix | `grep -n "\.get('\/" packages/sdk/src/hooks/*.ts` — verify prefix present | 33 |
| V7 | Co-Authored-By absent | `grep -i "co-authored-by" <commit-message>` — expect 0 | 39 |
| V8 | Full test output: not tail-truncated | `pnpm -r run test 2>&1 \| tee /tmp/test-out.txt; tail -5 /tmp/test-out.txt` | 28 |
| V9 | Build clean | `pnpm -r run build` — exit 0 | 26 |
| V10 | Mojibake check | `grep -Pn "[^\x00-\x7F]" <new-md-files>` — only intentional § chars | 40 |
| V11 | Cross-stage stale-symbol grep | `grep -nrE '<stale-symbols>' apps/web/src/app/<role>/` — expect 0 | 40 |

**Stages where absent verification caused rework:**

- **Stage 30:** Pre-push verification NOT run for k=3 choice — caught by ad-hoc check. T1 reading §14.2 but not §14.1.
- **Stage 37:** Pre-push verification round SKIPPED entirely — first regression since Stage 33. Recorded as process miss in DAILY_LOG.
- **Stage 38:** Pre-push verification absent for the first time on a UI stage with multiple backend endpoints. Post-hoc V1–V5 captured in DAILY_LOG; all discipline was followed in code. Process miss only.
- **Stage 39:** Pre-push verification reinstated. V1–V9 all surfaced. Held for architect before push. No issues.
- **Stage 40:** V11 (cross-stage grep) added. Push gate two-approval honored. No issues.

---

## Push gate

**Protocol:** After pre-push verification round is surfaced, architect responds
with the literal phrase **"create the commit"** before any commit is created or
pushed. Applies to each commit separately:

1. Prep commit — research + Q-filings + C-C-D-V.
2. Impl commit — all D1..DN deliverables.
3. Chore-close commit — DAILY_LOG + PROJECT_STATE + dev context docs.

No bundled approvals. If a verification gap is found between one approval and
the next (e.g., a second grep check at chore-close time), the additional finding
must be surfaced before the chore commit is created.

**Evolution:**

| Stage | Push gate compliance |
|---|---|
| 38 | ❌ Pre-push verification skipped; no gate surfaced. Discovered post-merge. |
| 39 | ✅ Push gate reinstated; all V* checks run and surfaced. |
| 40 | ✅ Explicit two-approval gate (impl + chore). V11 cross-stage grep cleared before first commit. |

---

## Stale-comment guard

**Pattern:** When a new file in role group `(student)/`, `(teacher)/`, or
`(parent)/` is committed, grep for symbols from the PREVIOUS stage's files
that should not appear in the new file.

```bash
# Stage 40 example — grep for Stage 38/39 teacher symbols in new student files:
grep -nrE 'useChildRecentSessions|useMyChildren|ChildSwitcher|ParentDashboard|InterventionAlert|AssignmentWizardState' \
  apps/web/src/app/(student)/
# Expect: 0 hits
```

Common stale-symbol classes:
- Hook names from prior role group (`useMyChildren` in student page)
- State type names from prior wizard (`AssignmentWizardState` in student context)
- Component names that are role-specific (`ClassKpiStrip` in parent context)
- Copy module keys from prior stage (`ASSIGNMENT_COPY.wizard` in student page)

---

## C-C-D-V drift warning

**Definition:** C-C-D-V architect drift occurs when a deliverable description
is written from memory rather than from simultaneous inspection of (1) the
mockup and (2) the existing component props/API.

**Stage 40 example (canonical warning case):**

C-C-D-V D7 specified: `"Mastery Snapshot: horizontal SkillBars"`

Reality:
- Mockup `docs/mockups/02-dashboard.html` lines 530-538: label at top, fill bar
  below — vertical bars.
- `packages/ui/src/SkillBar/SkillBar.tsx`: `layout?: 'vertical' | 'horizontal'`
  where default is `'vertical'`. No `layout="horizontal"` mode exists.

Result: C-C-D-V claimed a prop value that conflicts with both the mockup and the
component's actual default. The correct value was `vertical` (the default — no
prop needed). Q-40.5 resolved this at T5 checkpoint. If not caught, the component
would have rendered vertically (matching the mockup) while the C-C-D-V said
horizontal — confusing for any reviewer checking compliance.

**Prevention:** For every layout/orientation/variant specified in C-C-D-V,
verify against component props file AND mockup before writing the C-C-D-V line.
Do not author from memory.

---

## References

| Topic | Source |
|---|---|
| T1 precedent: SkillGraphCache edge fields | Q-28.8 in QUESTIONS.md |
| T1 precedent: k=3 silent narrowing | Stage 30 DAILY_LOG retro (a) |
| T1 precedent: domain_profiles vs skill_mastery | Stage 40 DAILY_LOG retro |
| T2 tightening origin | Stage 34 DAILY_LOG retro (a): "T2 timing gap — second occurrence" |
| T3 Option 3 proposal | Stage 32 DAILY_LOG retro (a): three options presented |
| T3 Option 3 first clean stage | Stage 33 DAILY_LOG retro (a): Q-33.8 round-trip |
| T4 near-miss | Stage 30 DAILY_LOG retro (c); ISSUE-0019 |
| T5 skipped (context compaction) | Stage 38 DAILY_LOG retro (b) |
| T5 C-C-D-V drift | Stage 40 DAILY_LOG retro: "C-C-D-V horizontal SkillBar drift" |
| Pre-push V absent | Stage 37 DAILY_LOG retro: "PRE-PUSH VERIFICATION ROUND SKIPPED" |
| Push gate reinstated | Stage 38 DAILY_LOG retro: "Reinstate from Stage 39 without exception" |
| Push gate two-approval | Stage 40 DAILY_LOG retro: "Push gate honored" |
| Amend near-miss | Stage 30 DAILY_LOG retro (c); Stage 35 DAILY_LOG retro (b) |
| ADR-0029 service prefix | ADR-0029 (SDK service-prefix routing) |
| UI_CONTRACT mockup authority | UI_CONTRACT §1.1 |
| ISSUE-0019 (no amend hook) | OPEN_ISSUES.md |
| ISSUE-0029 (stale turbo cache) | OPEN_ISSUES.md; DEV-20260527-1 |
