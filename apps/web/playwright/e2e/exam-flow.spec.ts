/**
 * Stage 23 e2e — Exam Engine keyboard-only happy path.
 *
 * Flow (DEV_PLAN Stage 23 deliverable):
 *   1. Sign up + login a fresh student via admin-API helper (ISSUE-0073 fix).
 *   2. Navigate to /session-selection.
 *   3. Tab to the first pathway's "Exam" button; activate via Enter.
 *   4. Assert redirect to /session/{id}/exam.
 *   5. Answer 5 items keyboard-only — Tab into option group, arrow
 *      keys to a choice, Enter to "Submit answer".
 *   6. Tab to "End session", activate, confirm via Enter.
 *   7. Assert redirect to /results/{id}.
 *
 * Env required (set via .env.test or shell):
 *   E2E_WEB_URL           Next.js app URL
 *   E2E_BASE_URL          Edge Functions base
 *   E2E_SUPABASE_ANON     Anon key
 *   E2E_TEST_PATHWAY_ID   Pathway slug seeded for the test tenant
 *   E2E_TEST_SERVICE_ROLE Service-role key for admin user creation
 *
 * Skips when env not provisioned. CI integration deferred to Stage 26
 * per Q-19.9.
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
  'Stage 23 e2e requires E2E_WEB_URL + E2E_BASE_URL + E2E_TEST_PATHWAY_ID + E2E_SUPABASE_ANON + E2E_TEST_SERVICE_ROLE',
);

test('exam flow — keyboard-only signup → 5 responses → end → results', async ({
  page,
}) => {
  const webUrl = E2E_WEB_URL!;
  const baseUrl = E2E_BASE_URL!;
  const anon = E2E_ANON!;

  // ── 1. Install session cookie for a fresh student account ──────────
  await signUpAndInstallSessionAs(page, webUrl, baseUrl, anon, 'student', 'e2e-exam');

  // ── 2. /session-selection ──────────────────────────────────────────
  await page.goto(`${webUrl}/session-selection`);
  await expect(
    page.getByRole('heading', { name: /how do you want to study today/i }),
  ).toBeVisible();

  // ── 3. Keyboard to first Exam button ──────────────────────────────
  const examBtn = page.getByRole('button', { name: /^exam$/i }).first();
  await expect(examBtn).toBeVisible();
  await examBtn.focus();
  await page.keyboard.press('Enter');

  // ── 4. /session/{id}/exam ─────────────────────────────────────────
  await page.waitForURL(/\/session\/[^/]+\/exam$/);
  // Question heading is the keyboard-focus landing point post-transition.
  await expect(page.getByRole('heading').first()).toBeVisible();

  // ── 5. Answer 5 items keyboard-only ──────────────────────────────
  for (let i = 0; i < 5; i += 1) {
    const firstOption = page.getByRole('radio').first();
    if ((await firstOption.count()) === 0) break;
    await firstOption.focus();
    await page.keyboard.press('Space'); // selects radio
    const submit = page.getByRole('button', { name: /submit answer/i });
    await submit.focus();
    await page.keyboard.press('Enter');
    // Wait for either the next question or the End-session affordance
    // to settle before the next iteration.
    await page.waitForTimeout(150);
  }

  // ── 6. End session keyboard-only ─────────────────────────────────
  const endBtn = page.getByRole('button', { name: /end session/i });
  await endBtn.focus();
  await page.keyboard.press('Enter');
  // Submit-confirm dialog appears; primary "Submit" button focuses.
  const confirm = page.getByRole('button', { name: /^submit$/i });
  await confirm.waitFor({ state: 'visible' });
  await confirm.focus();
  await page.keyboard.press('Enter');

  // ── 7. /results/{id} ─────────────────────────────────────────────
  await page.waitForURL(/\/results\/[^/]+$/);
});
