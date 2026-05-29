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
import { randomUUID } from 'crypto'

const E2E_WEB_URL = process.env['E2E_WEB_URL']
const E2E_BASE_URL = process.env['E2E_BASE_URL']
const E2E_ANON = process.env['E2E_SUPABASE_ANON']

test.skip(
  E2E_WEB_URL === undefined || E2E_BASE_URL === undefined || E2E_ANON === undefined,
  'Stage 36 e2e requires E2E_WEB_URL + E2E_BASE_URL + E2E_SUPABASE_ANON',
)

async function signUpParentAndGetToken(baseUrl: string, anon: string): Promise<string> {
  const email = `parent-${randomUUID()}@example.com`
  const password = 'TestPassword123!'

  // Use auth-svc (not raw /auth/v1/signup) so the synchronous app_metadata write
  // fires and the resulting JWT carries tenant_id + role. Tests the real success
  // path: children returns 200 [] (not 403 FORBIDDEN from a missing role claim).
  const signupRes = await fetch(`${baseUrl}/auth-svc/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anon },
    body: JSON.stringify({ email, password, fullName: 'Test Parent', role: 'parent' }),
  })
  if (!signupRes.ok) throw new Error(`signup failed: ${signupRes.status}`)

  // auth-svc returns { data: { message } } — login separately to get the JWT
  const loginRes = await fetch(`${baseUrl}/auth-svc/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anon },
    body: JSON.stringify({ email, password }),
  })
  if (!loginRes.ok) throw new Error(`login failed: ${loginRes.status}`)
  const loginBody = (await loginRes.json()) as { data?: { access_token?: string } }
  const token = loginBody.data?.access_token
  if (token === undefined) throw new Error('login: no access_token in response')
  return token
}

test('parent dashboard — fresh parent sees no-children empty state', async ({ page }) => {
  const webUrl = E2E_WEB_URL as string
  const baseUrl = E2E_BASE_URL as string
  const anon = E2E_ANON as string

  const token = await signUpParentAndGetToken(baseUrl, anon)
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
