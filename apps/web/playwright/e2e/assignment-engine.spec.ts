/**
 * Stage 39 e2e — Teacher Assignment Engine happy path.
 *
 * Flow:
 *   1. Sign up + login a fresh teacher account via auth-svc.
 *   2. Navigate to /teacher/assignments — expect empty Active tab.
 *   3. Click New Assignment → /teacher/assignments/new.
 *   4. Step 1: select Practice type card.
 *   5. Step 2: Continue (class target, default).
 *   6. Step 3: fill title, continue.
 *   7. Step 4: set due date, continue.
 *   8. Step 5 Review: assert title visible, click Publish Assignment.
 *   9. Assert success view shows "Assignment Published".
 *  10. Click View Assignments → back to /teacher/assignments.
 *
 * Env required:
 *   E2E_WEB_URL          Next.js app URL
 *   E2E_BASE_URL         Edge Functions base URL
 *   E2E_SUPABASE_ANON    Supabase anon key
 *
 * Requires a class seeded with the teacher account (admin fixture).
 * Skips when env not provisioned.
 */

import { expect, test } from '@playwright/test'
import { randomUUID } from 'crypto'

const E2E_WEB_URL = process.env['E2E_WEB_URL']
const E2E_BASE_URL = process.env['E2E_BASE_URL']
const E2E_ANON = process.env['E2E_SUPABASE_ANON']

test.skip(
  E2E_WEB_URL === undefined || E2E_BASE_URL === undefined || E2E_ANON === undefined,
  'Stage 39 e2e requires E2E_WEB_URL + E2E_BASE_URL + E2E_SUPABASE_ANON',
)

async function signUpTeacherAndGetToken(baseUrl: string, anon: string): Promise<string> {
  const email = `teacher-asgn-${randomUUID()}@example.com`
  const password = 'TestPassword123!'
  const res = await fetch(`${baseUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anon },
    body: JSON.stringify({ email, password, data: { role: 'teacher' } }),
  })
  if (!res.ok) throw new Error(`signup failed: ${res.status}`)
  const body = (await res.json()) as { access_token?: string }
  const token = body.access_token
  if (!token) throw new Error('signup: no access_token in response')
  return token
}

test('assignment list — fresh teacher sees empty Active tab', async ({ page }) => {
  const webUrl = E2E_WEB_URL as string
  const baseUrl = E2E_BASE_URL as string
  const anon = E2E_ANON as string

  const token = await signUpTeacherAndGetToken(baseUrl, anon)

  await page.goto(`${webUrl}/teacher/assignments`)
  await page.evaluate((tok: string) => {
    localStorage.setItem('supabase.auth.token', JSON.stringify({ access_token: tok }))
  }, token)
  await page.reload()

  await expect(page).toHaveURL(`${webUrl}/teacher/assignments`, { timeout: 10_000 })
  await expect(page.getByRole('tab', { name: 'Active' })).toBeVisible()
  await expect(page.getByText(/no active assignments/i)).toBeVisible()
})

test('wizard — practice assignment publish flow', async ({ page }) => {
  const webUrl = E2E_WEB_URL as string
  const baseUrl = E2E_BASE_URL as string
  const anon = E2E_ANON as string

  const token = await signUpTeacherAndGetToken(baseUrl, anon)

  await page.goto(`${webUrl}/teacher/assignments/new`)
  await page.evaluate((tok: string) => {
    localStorage.setItem('supabase.auth.token', JSON.stringify({ access_token: tok }))
  }, token)
  await page.reload()

  await expect(page.getByRole('heading', { name: 'Select Assignment Type' })).toBeVisible({
    timeout: 10_000,
  })

  // Step 1: Select Practice
  await page.getByRole('button', { name: /Practice/ }).first().click()
  await page.getByRole('button', { name: 'Continue' }).click()

  // Step 2: Target — leave as Entire Class, continue
  await expect(page.getByRole('heading', { name: 'Select Target' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()

  // Step 3: Configure — fill in a title
  await expect(page.getByRole('heading', { name: 'Configuration' })).toBeVisible()
  const titleInput = page.locator('input').filter({ hasText: '' }).first()
  await titleInput.fill('Fractions Practice E2E')
  await page.getByRole('button', { name: 'Continue' }).click()

  // Step 4: Schedule — set due date (1 day from now)
  await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible()
  const tomorrow = new Date(Date.now() + 25 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16)
  const dueDateInput = page.locator('input[type="datetime-local"]:not([disabled])')
  await dueDateInput.fill(tomorrow)
  await page.getByRole('button', { name: 'Continue' }).click()

  // Step 5: Review — assert title visible, publish
  await expect(page.getByRole('heading', { name: 'Review Assignment' })).toBeVisible()
  await expect(page.getByText('Fractions Practice E2E')).toBeVisible()
  await page.getByRole('button', { name: 'Publish Assignment' }).click()

  // Success view
  await expect(page.getByRole('heading', { name: 'Assignment Published' })).toBeVisible({
    timeout: 15_000,
  })
})

test('wizard — cancel returns to assignments list', async ({ page }) => {
  const webUrl = E2E_WEB_URL as string
  const baseUrl = E2E_BASE_URL as string
  const anon = E2E_ANON as string

  const token = await signUpTeacherAndGetToken(baseUrl, anon)

  await page.goto(`${webUrl}/teacher/assignments/new`)
  await page.evaluate((tok: string) => {
    localStorage.setItem('supabase.auth.token', JSON.stringify({ access_token: tok }))
  }, token)
  await page.reload()

  await expect(page.getByRole('heading', { name: 'Select Assignment Type' })).toBeVisible({
    timeout: 10_000,
  })
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page).toHaveURL(`${webUrl}/teacher/assignments`, { timeout: 5_000 })
})

test('wizard step 1 — Continue disabled until type selected', async ({ page }) => {
  const webUrl = E2E_WEB_URL as string
  const baseUrl = E2E_BASE_URL as string
  const anon = E2E_ANON as string

  const token = await signUpTeacherAndGetToken(baseUrl, anon)

  await page.goto(`${webUrl}/teacher/assignments/new`)
  await page.evaluate((tok: string) => {
    localStorage.setItem('supabase.auth.token', JSON.stringify({ access_token: tok }))
  }, token)
  await page.reload()

  await expect(page.getByRole('heading', { name: 'Select Assignment Type' })).toBeVisible({
    timeout: 10_000,
  })
  const continueBtn = page.getByRole('button', { name: 'Continue' })
  await expect(continueBtn).toBeDisabled()

  // Select a type — Continue should become enabled
  await page.getByRole('button', { name: /Diagnostic/ }).first().click()
  await expect(continueBtn).toBeEnabled()
})
