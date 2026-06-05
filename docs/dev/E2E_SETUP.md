# E2E Setup — CI Secrets Provisioning Checklist

> ISSUE-0079: CI E2E merge gate wired in ROUND J (`.github/workflows/ci.yml` `e2e` job).
> This checklist must be completed by the operator before the E2E gate passes.

The `e2e` job runs on every push/PR to `main` and `v1.1/**`. It will fail loudly if any
secret below is absent — a missing secret produces a seed failure or silent skip, not a
false green.

---

## 7 GitHub Actions Secrets Required

Navigate to:
**GitHub → repository → Settings → Secrets and variables → Actions → New repository secret**

| Secret name | Description | Where to get the value |
|---|---|---|
| `SUPABASE_URL` | Supabase project REST + Edge Functions base URL (no trailing slash). Format: `https://<project-ref>.supabase.co` | Supabase Dashboard → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — used by `seed-e2e.ts` to write fixture data (bypasses RLS). | Supabase Dashboard → Project Settings → API → `service_role` (secret) key |
| `E2E_BASE_URL` | Edge Functions base URL. Format: `https://<project-ref>.supabase.co/functions/v1` | Append `/functions/v1` to `SUPABASE_URL` |
| `E2E_SUPABASE_URL` | Supabase REST base URL (no `/functions/v1`). Same value as `SUPABASE_URL`. Used by `session-flow.spec.ts` for outbox assertion. | Same as `SUPABASE_URL` |
| `E2E_SUPABASE_ANON` | Supabase anon (public) key. Note: specs read `E2E_SUPABASE_ANON`, not `ANON_KEY`. | Supabase Dashboard → Project Settings → API → `anon` (public) key. Same value as Vercel `NEXT_PUBLIC_SUPABASE_ANON_KEY`. |
| `E2E_TEST_SERVICE_ROLE` | Service role key — used by `signUpAndInstallSessionAs` to create non-parent test users (student/teacher roles). Same value as `SUPABASE_SERVICE_ROLE_KEY`. | Same as `SUPABASE_SERVICE_ROLE_KEY` |

> `E2E_WEB_URL` and `E2E_TEST_PATHWAY_ID` are **hardcoded** in the workflow and do not
> need to be set as secrets:
> - `E2E_WEB_URL` = `https://mindmosaic-web-git-v11-exam-content-vishwas2018s-projects.vercel.app`
> - `E2E_TEST_PATHWAY_ID` = `00000000-e2e0-0000-0000-000000000002` (deterministic from `seed-e2e.ts`)

---

## Seed step

Before Playwright runs, `scripts/seed-e2e.ts` is executed:

```
pnpm tsx scripts/seed-e2e.ts
```

This upserts deterministic fixture data (fixed UUIDs, idempotent). Safe to re-run on every
CI push. If the seed step exits non-zero the job fails immediately — this catches Supabase
connectivity or schema drift before any spec runs.

---

## Local E2E run

Copy `apps/web/.env.e2e.example` to `apps/web/.env.e2e` and fill in values (same keys as
the table above). Then:

```bash
pnpm tsx scripts/seed-e2e.ts      # seed once; re-run is idempotent
pnpm --filter @mm/web e2e         # run all specs
```

---

## Test isolation note

The suite runs serially (`workers: 1`, `fullyParallel: false`). Each test user is created
with a `randomUUID()` email prefix — no collision between concurrent CI runs on different
PRs. Seed data uses fixed UUIDs with `ignoreDuplicates: true`. A dedicated CI Supabase
project is not required pre-launch (ISSUE-0079).

---

## IDE warnings

The VS Code GitHub Actions extension emits "Context access might be invalid: SECRET_NAME"
for every `secrets.*` reference that is not yet provisioned in the repository. These are
expected until the 7 secrets above are added. They do not indicate a YAML syntax error.
