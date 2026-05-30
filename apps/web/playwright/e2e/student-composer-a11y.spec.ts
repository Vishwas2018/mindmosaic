/**
 * v1.1-S5 a11y — axe-core on /practice + /exam-sim.
 *
 * DoD: zero serious/critical violations on both routes
 * (UI_CONTRACT lines 748–759; ADR-0039 §axe-core gate).
 *
 * Uses @axe-core/playwright to inject axe into a live page and
 * assert no serious or critical violations. All violations are
 * printed verbatim so CI logs are self-explanatory.
 *
 * Env required:
 *   E2E_WEB_URL          Next.js app URL (e.g. http://localhost:3000)
 *   E2E_BASE_URL         Edge Functions base
 *   E2E_SUPABASE_ANON    Anon key
 *
 * Skips when env not provisioned (consistent with ISSUE-0038 pattern).
 */
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { signUpAndInstallSession } from './helpers/auth'

const E2E_WEB_URL = process.env['E2E_WEB_URL']
const E2E_BASE_URL = process.env['E2E_BASE_URL']
const E2E_ANON = process.env['E2E_SUPABASE_ANON']

test.skip(
  E2E_WEB_URL === undefined || E2E_BASE_URL === undefined || E2E_ANON === undefined,
  'v1.1-S5 a11y requires E2E_WEB_URL + E2E_BASE_URL + E2E_SUPABASE_ANON',
)

test.describe('axe-core a11y — /practice', () => {
  test('zero serious/critical violations on /practice (LoadingState → Content)', async ({ page }) => {
    await signUpAndInstallSession(page, E2E_WEB_URL!, E2E_BASE_URL!, E2E_ANON!, 'student', 'student-a11y')
    await page.goto(`${E2E_WEB_URL}/practice`)
    await page.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    )

    if (blocking.length > 0) {
      console.error('axe serious/critical violations on /practice:')
      blocking.forEach((v) => {
        console.error(`  [${v.impact}] ${v.id}: ${v.description}`)
        v.nodes.forEach((n) => console.error(`    → ${n.html}`))
      })
    }

    expect(blocking, `${blocking.length} serious/critical violation(s) found`).toHaveLength(0)
  })
})

test.describe('axe-core a11y — /exam-sim', () => {
  test('zero serious/critical violations on /exam-sim (LoadingState → Content)', async ({ page }) => {
    await signUpAndInstallSession(page, E2E_WEB_URL!, E2E_BASE_URL!, E2E_ANON!, 'student', 'student-a11y')
    await page.goto(`${E2E_WEB_URL}/exam-sim`)
    await page.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    )

    if (blocking.length > 0) {
      console.error('axe serious/critical violations on /exam-sim:')
      blocking.forEach((v) => {
        console.error(`  [${v.impact}] ${v.id}: ${v.description}`)
        v.nodes.forEach((n) => console.error(`    → ${n.html}`))
      })
    }

    expect(blocking, `${blocking.length} serious/critical violation(s) found`).toHaveLength(0)
  })
})
