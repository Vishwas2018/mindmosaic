/**
 * Stage 22b e2e — Practice happy path through the UI.
 *
 * Flow (DEV_PLAN Stage 22 deliverable):
 *   1. Sign up a fresh student via auth-svc API (UI signup screen lives in
 *      a later stage — test seeds the auth context directly).
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
 *
 * If env vars are missing the spec is skipped — opt-in alongside the
 * Stage 19 contract-style e2e per Q-19.9 (CI integration deferred to
 * Stage 26).
 */
import { expect, test } from '@playwright/test';

const E2E_WEB_URL = process.env['E2E_WEB_URL'];
const E2E_BASE_URL = process.env['E2E_BASE_URL'];
const E2E_PATHWAY = process.env['E2E_TEST_PATHWAY_ID'];
const E2E_ANON = process.env['E2E_SUPABASE_ANON'];

test.skip(
  E2E_WEB_URL === undefined ||
    E2E_BASE_URL === undefined ||
    E2E_PATHWAY === undefined ||
    E2E_ANON === undefined,
  'Stage 22b e2e requires E2E_WEB_URL + E2E_BASE_URL + E2E_TEST_PATHWAY_ID + E2E_SUPABASE_ANON',
);

test('practice flow — signup → select pathway → 5 responses → end → results', async ({
  page,
  request,
}) => {
  const webUrl = E2E_WEB_URL!;
  const baseUrl = E2E_BASE_URL!;
  const anon = E2E_ANON!;

  // ── 1. Signup via auth-svc API (UI signup is a later stage) ────────────
  const email = `e2e-${Date.now()}@example.com`;
  const password = 'pw-' + Math.random().toString(36).slice(2);
  const signup = await request.post(`${baseUrl}/auth-svc/auth/signup`, {
    headers: { 'Content-Type': 'application/json', apikey: anon },
    data: { email, password, role: 'student' },
  });
  expect(signup.ok(), `signup body: ${await signup.text()}`).toBeTruthy();

  // Login via the UI so the browser cookie/storage matches what the app
  // would see in production. Fallback: seed the Supabase session via JS
  // if a /login UI page is not yet shipped at Stage 22b.
  const loginRes = await request.post(`${baseUrl}/auth-svc/auth/login`, {
    headers: { 'Content-Type': 'application/json', apikey: anon },
    data: { email, password },
  });
  expect(loginRes.ok(), `login body: ${await loginRes.text()}`).toBeTruthy();
  const loginJson = await loginRes.json();
  const accessToken = loginJson?.data?.access_token ?? loginJson?.access_token;
  const refreshToken = loginJson?.data?.refresh_token ?? loginJson?.refresh_token;
  expect(accessToken, 'access token from login').toBeTruthy();

  // Seed the supabase-auth session into localStorage before any nav so
  // the AuthProvider sees an authenticated session on first paint.
  await page.addInitScript(
    ([token, refresh]: [string, string]) => {
      const session = {
        access_token: token,
        refresh_token: refresh,
        token_type: 'bearer',
        expires_in: 3600,
        user: null,
      };
      window.localStorage.setItem(
        'supabase.auth.token',
        JSON.stringify({ currentSession: session }),
      );
    },
    [accessToken, refreshToken] as [string, string],
  );

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
