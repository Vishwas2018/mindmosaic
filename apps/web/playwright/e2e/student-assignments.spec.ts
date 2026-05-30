/**
 * Stage 40 e2e — Student Assignments + Dashboard (Screen 13 + Screen 7).
 *
 * Flow:
 *   1. Sign up + login a fresh student account via auth-svc.
 *   2. Navigate to /assignments — expect heading "My Assignments" and Assigned tab visible.
 *   3. Verify In Progress and Completed tabs are present.
 *   4. Navigate to /dashboard — expect dashboard heading visible.
 *   5. Verify nav links for Assignments and Results are present.
 *
 * Env required:
 *   E2E_WEB_URL          Next.js app URL
 *   E2E_BASE_URL         Edge Functions base URL
 *   E2E_SUPABASE_ANON    Supabase anon key
 *
 * Skips when env not provisioned.
 */

import { expect, test } from '@playwright/test'
import { signUpAndInstallSession } from './helpers/auth'

const E2E_WEB_URL = process.env['E2E_WEB_URL']
const E2E_BASE_URL = process.env['E2E_BASE_URL']
const E2E_ANON = process.env['E2E_SUPABASE_ANON']

test.skip(
  E2E_WEB_URL === undefined || E2E_BASE_URL === undefined || E2E_ANON === undefined,
  'Stage 40 e2e requires E2E_WEB_URL + E2E_BASE_URL + E2E_SUPABASE_ANON',
)

test('assignments page — fresh student sees heading and three tabs', async ({ page }) => {
  const webUrl = E2E_WEB_URL as string
  const baseUrl = E2E_BASE_URL as string
  const anon = E2E_ANON as string

  await signUpAndInstallSession(page, webUrl, baseUrl, anon, 'student', 'student-asgn')
  await page.goto(`${webUrl}/assignments`)

  await expect(page).toHaveURL(`${webUrl}/assignments`, { timeout: 10_000 })
  await expect(page.getByRole('heading', { name: 'My Assignments' })).toBeVisible()
  await expect(page.getByRole('tab', { name: /Assigned/i })).toBeVisible()
  await expect(page.getByRole('tab', { name: /In Progress/i })).toBeVisible()
  await expect(page.getByRole('tab', { name: /Completed/i })).toBeVisible()
})

test('assignments page — empty Assigned tab shows empty state copy', async ({ page }) => {
  const webUrl = E2E_WEB_URL as string
  const baseUrl = E2E_BASE_URL as string
  const anon = E2E_ANON as string

  await signUpAndInstallSession(page, webUrl, baseUrl, anon, 'student', 'student-asgn')
  await page.goto(`${webUrl}/assignments`)

  await expect(page.getByRole('heading', { name: 'My Assignments' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/No assignments yet/i)).toBeVisible()
})

test('dashboard — student nav contains Assignments link', async ({ page }) => {
  const webUrl = E2E_WEB_URL as string
  const baseUrl = E2E_BASE_URL as string
  const anon = E2E_ANON as string

  await signUpAndInstallSession(page, webUrl, baseUrl, anon, 'student', 'student-asgn')
  await page.goto(`${webUrl}/dashboard`)

  await expect(page).toHaveURL(`${webUrl}/dashboard`, { timeout: 10_000 })
  await expect(page.getByRole('link', { name: 'Assignments' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Results' })).toBeVisible()
})
