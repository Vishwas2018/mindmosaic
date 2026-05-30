/**
 * Stage 22b e2e — Practice happy path through the UI.
 *
 * Flow (DEV_PLAN Stage 22 deliverable):
 *   1. Sign up a fresh student via admin-API helper (ISSUE-0073 fix).
 *   2. Navigate to /session-selection.
 *   3. Click a pathway's Practice button.
 *   4. Assert redirect to /session/{id}/practice.
 *   5. Answer 5 items (select first option → Submit answer → Next question).
 *   6. Click End session.
 *   7. Assert redirect to /results/{id}.
 *
 * Env required (set via .env.test or shell):
 *   E2E_WEB_URL           Next.js app URL (e.g. http://localhost:3000)
 *   E2E_BASE_URL          Edge Functions base (e.g.
 *                         http://localhost:54321/functions/v1)
 *   E2E_SUPABASE_ANON     Anon key for the API
 *   E2E_TEST_PATHWAY_ID   Pathway slug seeded for the test tenant
 *   E2E_TEST_SERVICE_ROLE Service-role key for admin user creation
 *
 * If env vars are missing the spec is skipped — opt-in alongside the
 * Stage 19 contract-style e2e per Q-19.9 (CI integration deferred to
 * Stage 26).
 */
import { expect, test } from '@playwright/test';
import { signUpAndInstallSessionAs } from './helpers/auth';

const E2E_WEB_URL = process.env['E2E_WEB_URL'];
const E2E_BASE_URL = process.env['E2E_BASE_URL'];
const E2E_PATHWAY = process.env['E2E_TEST_PATHWAY_ID'];
const E2E_ANON = process.env['E2E_SUPABASE_ANON'];
const E2E_SERVICE_ROLE = process.env['E2E_TEST_SERVICE_ROLE'];

test.skip(
  E2E_WEB_URL === undefined ||
    E2E_BASE_URL === undefined ||
    E2E_PATHWAY === undefined ||
    E2E_ANON === undefined ||
    E2E_SERVICE_ROLE === undefined,
  'Stage 22b e2e requires E2E_WEB_URL + E2E_BASE_URL + E2E_TEST_PATHWAY_ID + E2E_SUPABASE_ANON + E2E_TEST_SERVICE_ROLE',
);

test('practice flow — signup → select pathway → 5 responses → end → results', async ({
  page,
}) => {
  const webUrl = E2E_WEB_URL!;
  const baseUrl = E2E_BASE_URL!;
  const anon = E2E_ANON!;

  // ── 1. Install session cookie for a fresh student account ──────────────
  await signUpAndInstallSessionAs(page, webUrl, baseUrl, anon, 'student', 'e2e-practice');

  // ── 2. /session-selection ──────────────────────────────────────────────
  await page.goto(`${webUrl}/session-selection`);
  await expect(
    page.getByRole('heading', { name: /how do you want to study today/i }),
  ).toBeVisible();

  // ── 3. Click Practice on the first entitled pathway ────────────────────
  const practiceBtn = page.getByRole('button', { name: /^practice$/i }).first();
  await expect(practiceBtn).toBeVisible();
  await practiceBtn.click();

  // ── 4. Redirect to /session/{id}/practice ──────────────────────────────
  await page.waitForURL(/\/session\/[^/]+\/practice$/);
  await expect(
    page.getByRole('heading').filter({ hasText: /question/i }).first(),
  ).toBeVisible();

  // ── 5. Answer 5 items ──────────────────────────────────────────────────
  for (let i = 0; i < 5; i += 1) {
    const firstOption = page.getByRole('radio').first();
    if ((await firstOption.count()) === 0) break;
    await firstOption.check();
    await page.getByRole('button', { name: /submit answer/i }).click();
    const next = page.getByRole('button', { name: /next question|see results/i });
    await next.waitFor({ state: 'visible' });
    await next.click();
  }

  // ── 6. End session ─────────────────────────────────────────────────────
  await page.getByRole('button', { name: /end session/i }).click();

  // ── 7. /results/{id} ───────────────────────────────────────────────────
  await page.waitForURL(/\/results\/[^/]+$/);
});
