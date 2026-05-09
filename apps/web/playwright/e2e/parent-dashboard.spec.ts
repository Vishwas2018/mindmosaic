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
  const res = await fetch(`${baseUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anon },
    body: JSON.stringify({ email, password, data: { role: 'parent' } }),
  })
  if (!res.ok) throw new Error(`signup failed: ${res.status}`)
  const body = (await res.json()) as { access_token?: string }
  const token = body.access_token
  if (token === undefined) throw new Error('signup: no access_token in response')
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

  await expect(
    page.getByRole('button', { name: /add your first child/i }),
  ).toBeVisible()
})
