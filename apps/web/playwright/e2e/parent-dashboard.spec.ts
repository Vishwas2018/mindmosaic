/**
 * Stage 36 e2e — Parent Dashboard happy path.
 *
 * Flow:
 *   1. Sign up + login a fresh parent account via auth-svc.
 *   2. Navigate to /parent.
 *   3. Assert no-children empty state is shown ("Link your first child").
 *
 * Full end-to-end with linked child deferred — requires child-creation API
 * (POST /users/me/children) wired at Stage 36. This test covers the
 * "no children" branch which is always true for a fresh account.
 *
 * Env required:
 *   E2E_WEB_URL          Next.js app URL
 *   E2E_BASE_URL         Edge Functions base
 *   E2E_SUPABASE_ANON    Anon key
 *
 * Skips when env not provisioned.
 */
import { expect, test } from '@playwright/test'
import { signUpAndGetToken } from './helpers/auth'

const E2E_WEB_URL = process.env['E2E_WEB_URL']
const E2E_BASE_URL = process.env['E2E_BASE_URL']
const E2E_ANON = process.env['E2E_SUPABASE_ANON']

test.skip(
  E2E_WEB_URL === undefined || E2E_BASE_URL === undefined || E2E_ANON === undefined,
  'Stage 36 e2e requires E2E_WEB_URL + E2E_BASE_URL + E2E_SUPABASE_ANON',
)

test('parent dashboard — fresh parent sees no-children empty state', async ({ page }) => {
  const webUrl = E2E_WEB_URL as string
  const baseUrl = E2E_BASE_URL as string
  const anon = E2E_ANON as string

  const token = await signUpAndGetToken(baseUrl, anon, 'parent', 'parent')
  await page.goto(`${webUrl}/parent`)
  await page.evaluate(([t]: string[]) => {
    localStorage.setItem('sb-access-token', t ?? '')
  }, [token])
  await page.goto(`${webUrl}/parent`)

  // Fresh parent has no children — empty state must render.
  await expect(
    page.getByText(/link your first child/i),
  ).toBeVisible({ timeout: 10000 })

  // Invite-only copy replaces the "Add your first child" CTA button (removed in
  // 7ee9565 — CHILDREN_INVITE_ONLY; no /parent/children page exists).
  await expect(
    page.getByText(/child accounts are created by invitation/i),
  ).toBeVisible()
})
