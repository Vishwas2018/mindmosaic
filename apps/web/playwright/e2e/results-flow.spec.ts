/**
 * Stage 24 e2e — Results screen happy path (scored mode).
 *
 * Flow (DEV_PLAN Stage 24 deliverable):
 *   1. Sign up + login a fresh student via auth-svc.
 *   2. Navigate to /session-selection.
 *   3. Click the first scored pathway's start button.
 *   4. Assert redirect to /session/{id}/exam.
 *   5. Answer 5 items (click path).
 *   6. Click "End session" → confirm submit.
 *   7. Assert redirect to /results/{id}.
 *   8. Assert page renders:
 *      - a text node containing "%"
 *      - "Start new session" link
 *   9. Tab to "Start new session" button (keyboard focus assertion).
 *
 * Env required (set via .env.test or shell):
 *   E2E_WEB_URL           Next.js app URL
 *   E2E_BASE_URL          Edge Functions base
 *   E2E_SUPABASE_ANON     Anon key
 *   E2E_TEST_PATHWAY_ID   Pathway slug seeded for the test tenant
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
  'Stage 24 e2e requires E2E_WEB_URL + E2E_BASE_URL + E2E_TEST_PATHWAY_ID + E2E_SUPABASE_ANON + E2E_TEST_SERVICE_ROLE',
);

test('results flow — signup → exam → submit → /results/{id} renders score', async ({
  page,
}) => {
  // Guard: skip if env undefined (checked above via test.skip at module level).
  // These casts are safe because test.skip already gates execution.
  const webUrl = E2E_WEB_URL as string;
  const baseUrl = E2E_BASE_URL as string;
  const anon = E2E_ANON as string;

  // 1. Install Supabase session cookie before first navigation.
  await signUpAndInstallSessionAs(page, webUrl, baseUrl, anon, 'student', 'test');
  await page.goto(`${webUrl}/session-selection`);

  // 2. Start a scored session — click first available pathway start button.
  const startBtn = page.getByRole('button', { name: /start|exam/i }).first();
  await startBtn.click();

  // 3. Assert redirect to exam page.
  await page.waitForURL(/\/session\/[^/]+\/exam/);
  const examUrl = page.url();
  const sessionIdMatch = examUrl.match(/\/session\/([^/]+)\/exam/);
  expect(sessionIdMatch).not.toBeNull();
  const sessionId = sessionIdMatch?.[1] ?? '';

  // 4. Answer 5 items by clicking the first radio option and submitting.
  for (let i = 0; i < 5; i++) {
    await page.getByRole('radio').first().click();
    await page.getByRole('button', { name: /submit answer/i }).click();
    // Brief wait for feedback panel + Next button to appear.
    const nextBtn = page.getByRole('button', { name: /next question|see results/i });
    await nextBtn.waitFor({ state: 'visible', timeout: 8000 });
    await nextBtn.click();
  }

  // 5. End session via the End session button.
  await page.getByRole('button', { name: /end session/i }).click();

  // 6. Confirm submit dialog if present.
  const confirmBtn = page.getByRole('button', { name: /submit|confirm/i });
  const confirmVisible = await confirmBtn.isVisible().catch(() => false);
  if (confirmVisible) await confirmBtn.click();

  // 7. Assert redirect to /results/{id}.
  await page.waitForURL(`${webUrl}/results/${sessionId}`, { timeout: 15000 });

  // 8. Assert score % is visible.
  await expect(page.getByText(/%/).first()).toBeVisible({ timeout: 8000 });

  // 9. Assert "Start new session" CTA is present.
  const ctaBtn = page.getByRole('button', { name: /start new session/i });
  await expect(ctaBtn).toBeVisible();

  // 10. Tab focus assertion — keyboard nav reaches the CTA.
  await page.keyboard.press('Tab'); // skip link
  await page.keyboard.press('Tab'); // header back button
  // Tab through stats to CTA — accept that it becomes focused eventually.
  for (let t = 0; t < 6; t++) {
    const focused = await page.evaluate(() => document.activeElement?.textContent ?? '');
    if (/start new session/i.test(focused)) break;
    await page.keyboard.press('Tab');
  }
  const focusedText = await page.evaluate(() => document.activeElement?.textContent ?? '');
  expect(focusedText).toMatch(/start new session/i);
});
