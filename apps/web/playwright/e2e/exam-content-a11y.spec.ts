/**
 * v1.1-S4 a11y — axe-core on /teacher/content + /teacher/content/new.
 *
 * DoD: zero serious/critical violations on both routes
 * (UI_CONTRACT lines 748–759; ADR-0038 §Implementation Notes).
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
 * Skips when env not provisioned (consistent with other E2E specs).
 */
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { signUpAndInstallSessionAs } from './helpers/auth'

const E2E_WEB_URL = process.env['E2E_WEB_URL']
const E2E_BASE_URL = process.env['E2E_BASE_URL']
const E2E_ANON = process.env['E2E_SUPABASE_ANON']
const E2E_SERVICE_ROLE = process.env['E2E_TEST_SERVICE_ROLE']

test.skip(
  E2E_WEB_URL === undefined ||
    E2E_BASE_URL === undefined ||
    E2E_ANON === undefined ||
    E2E_SERVICE_ROLE === undefined,
  'v1.1-S4 a11y requires E2E_WEB_URL + E2E_BASE_URL + E2E_SUPABASE_ANON + E2E_TEST_SERVICE_ROLE',
)

test.describe('axe-core a11y — /teacher/content', () => {
  test('zero serious/critical violations on /teacher/content (LoadingState → Content)', async ({ page }) => {
    await signUpAndInstallSessionAs(page, E2E_WEB_URL!, E2E_BASE_URL!, E2E_ANON!, 'teacher', 'teacher-a11y')
    await page.goto(`${E2E_WEB_URL}/teacher/content`)
    await page.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    )

    if (blocking.length > 0) {
      console.error('axe serious/critical violations on /teacher/content:')
      blocking.forEach((v) => {
        console.error(`  [${v.impact}] ${v.id}: ${v.description}`)
        v.nodes.forEach((n) => console.error(`    → ${n.html}`))
      })
    }

    expect(blocking, `${blocking.length} serious/critical violation(s) found`).toHaveLength(0)
  })
})

test.describe('axe-core a11y — /teacher/content/new', () => {
  test('zero serious/critical violations on /teacher/content/new (ComposerForm Content state)', async ({ page }) => {
    await signUpAndInstallSessionAs(page, E2E_WEB_URL!, E2E_BASE_URL!, E2E_ANON!, 'teacher', 'teacher-a11y')
    await page.goto(`${E2E_WEB_URL}/teacher/content/new`)
    await page.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    )

    if (blocking.length > 0) {
      console.error('axe serious/critical violations on /teacher/content/new:')
      blocking.forEach((v) => {
        console.error(`  [${v.impact}] ${v.id}: ${v.description}`)
        v.nodes.forEach((n) => console.error(`    → ${n.html}`))
      })
    }

    expect(blocking, `${blocking.length} serious/critical violation(s) found`).toHaveLength(0)
  })
})
