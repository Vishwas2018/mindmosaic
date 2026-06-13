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
  // Question heading lands by its stable anchor; the <h1> renders the item
  // stem text, not the literal word "question".
  await expect(page.locator('#practice-question-heading')).toBeVisible();

  // ── 5. Answer the first item with the KNOWN-CORRECT option and assert
  //    positive feedback. Regression net for ISSUE-0090: the practice page
  //    must submit `option_id` (not `choice`) or `computeCorrectness` reads
  //    undefined and scores a correct answer as wrong. The seed's first option
  //    is the correct one (correct_option_id matches the first option). The
  //    `toBeVisible()` guard on the radio also catches the option-render gap:
  //    if items render as "not supported" (no radios), this fails loudly
  //    instead of silently skipping — the absence of BOTH checks let the bug
  //    pass the 16/4/0 gate.
  const firstOption = page.getByRole('radio').first();
  await expect(firstOption).toBeVisible();
  await firstOption.check();
  await page.getByRole('button', { name: /submit answer/i }).click();
  await expect(page.getByText(/^correct!$/i)).toBeVisible();
  await page
    .getByRole('button', { name: /next question|see results/i })
    .click();

  // ── 5b. Drive remaining items to the terminal "See results" click ──────
  // Loops to the actual item count — not hardcoded 5. The seed has exactly
  // 2 items, so this iterates once (item 2 is the terminal).
  //
  // waitForResponse is registered BEFORE the Submit click (Playwright best
  // practice) so the response is captured regardless of latency. A non-2xx
  // status surfaces as a descriptive assertion failure instead of a 60-second
  // timeout on the feedback panel — correctly distinguishes a product bug from
  // a test-timing race. This applies the ISSUE-0090 lesson: surface the layer
  // that actually broke, don't mask it by widening timeouts.
  //
  // The background `alert` in the snapshot is the ISSUE-0088 billing-svc 500
  // toast container. It does not interfere: the waitForResponse filter keys on
  // url().includes('/respond') which billing-svc URLs do not match, and the
  // "Correct!" / "See results" locators are semantically unambiguous.
  let reachedResults = false;
  for (let i = 1; i < 20 && !reachedResults; i += 1) {
    if (page.url().includes('/results/')) { reachedResults = true; break; }

    const radio = page.getByRole('radio').first();
    if (!(await radio.isVisible())) break;
    await radio.check();

    const submitBtn = page.getByRole('button', { name: /submit answer/i });
    await expect(submitBtn).toBeEnabled();

    const respondPromise = page.waitForResponse(
      (resp) => resp.url().includes('/respond'),
      { timeout: 10_000 },
    );
    await submitBtn.click();
    const respondResp = await respondPromise;

    // Non-2xx = product bug in the multi-item respond path, not a test race.
    // Most likely on a fresh session: idempotency key reuse across items —
    // useRecordResponse holds one per-mount UUID, so item 2+ sends the same
    // Idempotency-Key with a different body → 422 IDEMPOTENCY_MISMATCH.
    // This throw replaces the silent 60-second waitFor timeout.
    if (respondResp.status() >= 300) {
      throw new Error(
        `/respond returned HTTP ${respondResp.status()} on loop iteration ${i} (item ${i + 1}). ` +
          `Expected 2xx. Likely cause: idempotency key reuse across items in useRecordResponse. ` +
          `Product bug — not a test-timing issue.`,
      );
    }

    const nextBtn = page.getByRole('button', { name: /next question|see results/i });
    await expect(nextBtn).toBeVisible({ timeout: 5_000 });

    const btnText = (await nextBtn.textContent()) ?? '';
    await nextBtn.click();
    if (/see results/i.test(btnText)) {
      // Terminal item: clicking "See results" calls handleEndSession() internally
      // and navigates to /results/{id} — no manual "End session" click needed.
      reachedResults = true;
    }
  }

  // ── 6. End session — only if loop exited before reaching terminal ──────
  // Normal path: "See results" already triggered navigation. This fallback
  // exercises the early-exit button for pool-exhausted or truncated sessions.
  if (!reachedResults) {
    await page.getByRole('button', { name: /end session/i }).click();
  }

  // ── 7. /results/{id} ───────────────────────────────────────────────────
  await page.waitForURL(/\/results\/[^/]+$/);
});
