# DAILY_LOG.md — append-only, never pruned

> Newest entry at TOP. Use the template from CLAUDE.md §Templates.

## Stage 2 — 2026-05-01

**Planned (from DEV_PLAN.md Stage 2):** All custom enums + tenancy/identity tables + RLS helpers + handle_new_user + set_updated_at().

**Actually delivered:**

- `supabase/migrations/0001_enums_tenancy_auth.sql` — 37 enum types, 7 tables, 5 SECURITY DEFINER helpers, handle_new_user() G1 parent-only branch, set_updated_at() + triggers on 4 mutable tables, RLS on all 7 tables. Commit e58a925.
- `supabase/migrations/down/0001_enums_tenancy_auth.down.sql` — full reverse in FK dependency order; roundtrip verified clean.
- `supabase/tests/rls/001_tenancy.sql` — pgTAP plan(65), 65/65 pass. Covers G1–G9.
- `scripts/migration-roundtrip.sh` — up→down→verify clean→up roundtrip helper.
- `package.json` — `test:rls` and `test:migration` scripts added.
- ADR-0003, ADR-0004, ADR-0005, ADR-0006 filed (evening ritual).
- ISSUE-0001 opened (UTA-table per-role RLS deferred to Stage 5, medium severity).
- CLAUDE_PROMPTS.md §2A item (e) amended to require pgTAP skeleton forms for new patterns (ADR-0006).

**Time spent:** ~2h

**Surprises / departures:**

1. **plan count 66→65 — planning arithmetic error.** The draft plan counted 66 assertions (7+20+1+4+1+12+4+12+4 is actually 65). Corrected in test file before push. Lesson: verify plan() count by summing group totals before writing the test file; do not carry the number from prose.

2. **DML-CTE nested inside SELECT is a Postgres parse error.** The pattern `SELECT is((WITH x AS (INSERT...) SELECT COUNT(*) FROM x), ...)` fails with "WITH clause containing a data-modifying statement must be at the top level." All G7–G9 DML assertions restructured to top-level `WITH x AS (...) SELECT is((SELECT COUNT(*) FROM x), 0, 'msg')`. Lesson: any §2A pgTAP plan item that involves DML inside `is()`/`ok()` must include a skeleton form; this error is a syntax error, not a logic error, and would have been caught at §2A review time.

3. **admin_action_log INSERT raises SQLSTATE 42501, not silent zero-rows.** When no INSERT policy exists on an RLS-enabled table, Postgres raises `new row violates row-level security policy` (not a silent zero-rows return). UPDATE and DELETE with no SELECT policy silently return 0 rows (rows invisible via no-SELECT-policy filter). G7.2 switched from the DML-CTE zero-rows pattern to `throws_ok(sql, '42501', NULL, description)`. Lesson: INSERT RLS with no policy = exception (42501); UPDATE/DELETE RLS with no policy = filter (0 rows). The distinction is architectural — INSERT has no "row already exists" check to fail silently.

4. **now() is constant within a transaction.** pgTAP trigger tests comparing `updated_at_after > updated_at_before` always fail because `set_updated_at()` calls `now()`, which returns the transaction start time throughout the entire transaction — both reads return the same timestamp. Fixed by inserting with a sentinel `updated_at = '2000-01-01'` and asserting the trigger changed it to `> '2000-01-01'`. Lesson: never compare within-transaction before/after timestamps for trigger tests; use a sentinel past timestamp instead.

**Decisions made (not in stage):**

- ADR-0003: actor_role='parent' for self_service_signup log entries
- ADR-0004: UTA-table RLS minimal tenant-isolation; per-role SELECT deferred to Stage 5
- ADR-0005: SECURITY DEFINER helpers for junction-table RLS (BUILD_CONTRACT §6)
- ADR-0006: §2A pgTAP pattern verification requirement — skeleton forms for new patterns

**Deviations logged:**

- none (plan count discrepancy is a planning-phase arithmetic error, not a scope deviation from DEV_PLAN.md)

**Issues opened / closed / questions raised:**

- ISSUE-0001 opened: UTA-table SELECT policies are tenant-scoped only; per-role granularity absent until Stage 5 (ADR-0004). Severity: medium.

**Quality gates at close:**

- Lint ✅ · Typecheck ✅ · Tests ✅ (6/6 workspaces) · Build ✅ (cached from Stage 1, no TS changes) · RLS ✅ (pgTAP 65/65, 7/7 tables)

**Tomorrow — first thing:**
Stage 3 — Migration 0002 — Content & Skill Graph. Run §2A pre-implementation review (schema stage, mandatory) before C-C-D-V.

---

## Stage 1 — 2026-04-30

**Planned (from DEV_PLAN.md Stage 1):** Turborepo + pnpm workspaces + TypeScript strict + ESLint + Prettier + Husky + GitHub Actions matrix + Supabase au-syd project configured.

**Actually delivered:**

- Root scaffold: `turbo.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `package.json` (Node >=20, pnpm >=9, packageManager pnpm@10.30.3), `.npmrc` (shamefully-hoist), `.eslintrc.json`, `.prettierrc`, `.prettierignore`, `.gitmessage`
- `apps/web`: Next.js 14.2.35 App Router + Tailwind 3 + TypeScript strict
- 5 packages scaffolded: `@mm/types`, `@mm/sdk`, `@mm/ui`, `@mm/core`, `@mm/engines` — each with tsconfig (NodeNext) + empty `src/index.ts`
- `.husky/pre-commit` (mode 100755) — runs typecheck + lint
- `.github/workflows/ci.yml` — 4 jobs: lint / typecheck / unit / migration-dryrun (stub)
- ADR-0001 filed: engines-client deferred to Stage 15
- DEV-20260430-1 filed: same decision with today's date (supersedes legacy ID DEV-20260426-1 in DEV_PLAN.md)

**Time spent:** ~1h

**Surprises / departures:**

- pnpm 10 (not 9) installed locally; satisfies `>=9` engines constraint — no impact.
- pnpm 10 blocks all postinstall scripts by default (new in pnpm 9+); esbuild native binary install was silently skipped until `pnpm approve-builds` surfaced the block. Resolved by adding `pnpm.onlyBuiltDependencies: [esbuild, unrs-resolver]` to root `package.json`. Without this, vitest would silently fail at runtime.
- `apps/web/.eslintrc.json` added in addition to root `.eslintrc.json`. `next/core-web-vitals` bundles its own `eslint-config-next` plugin chain and needs its own config file to avoid conflict with the root TypeScript-only config. These two configs coexist: root applies to all `packages/*`; `apps/web` config applies to the Next.js app only.
- Vite CJS deprecation warning in vitest output; cosmetic, exits 0. Will address with ESM vitest config in Stage 11.

**Decisions made (not in stage):**

- ADR-0002: `.npmrc` pnpm hoisting policy. Used `public-hoist-pattern[]=*eslint*/*prettier*/typescript/*vitest*` (targeted, not `shamefully-hoist=true`) to make dev toolchain binaries available in workspace scripts without per-workspace devDep declarations. See `docs/dev/decisions/0002-npmrc-hoist-policy.md`.
- Added `pnpm.onlyBuiltDependencies: [esbuild, unrs-resolver]` to unlock postinstall scripts blocked by pnpm 10 default policy.

**Deviations logged:**

- DEV-20260430-1 (packages/engines-client deferred to Stage 15)

**Issues opened / closed / questions raised:**

- none

**Quality gates at close:**

- Lint ✅ · Typecheck ✅ · Tests ✅ (0 tests, pass-with-no-tests) · Build ✅ (Next.js 14.2.35 + 5 packages) · RLS n/a (no migrations)

**Tomorrow — first thing:**

Stage 2 — Migration 0001 (enums + tenancy + auth). Run §2A pre-implementation review before C-C-D-V — it is a schema/policy stage.
