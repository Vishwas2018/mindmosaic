# DAILY_LOG.md — append-only, never pruned

> Newest entry at TOP. Use the template from CLAUDE.md §Templates.

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
