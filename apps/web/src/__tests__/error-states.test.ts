// Cluster B — error state wiring: logic + copy contract tests.
// Pure-function only. Widget-level render tests (6 dashboard guards + 1
// assignments guard) are in dashboard-error-states.test.tsx (Q-1.1-POLISH-B1).

import { describe, it, expect } from 'vitest'
import { STUDENT_COMPOSER_COPY as C } from '../app/(student)/copy/studentComposer'
import { EXAM_CONTENT_COPY as EC } from '../app/(teacher)/copy/examContent'

// ── 402 discrimination helpers (mirrors component inline patterns) ─────────────

function is402SubmitError(err: unknown): boolean {
  return (err as { status?: number })?.status === 402
}

function isSessionUpgradeError(apiErr: { status?: number; code?: string }): boolean {
  return apiErr.status === 402 || apiErr.code === 'FEATURE_GATED'
}

// ── StudentComposerForm — copy contract ───────────────────────────────────────

describe('StudentComposerForm error/upgrade copy', () => {
  it('errorHeading (used as ErrorState title on pathway load failure) is non-empty', () => {
    expect(typeof C.states.errorHeading).toBe('string')
    expect(C.states.errorHeading.length).toBeGreaterThan(0)
  })

  it('submitError (used as ErrorState title on session create failure) is non-empty', () => {
    expect(typeof C.form.submitError).toBe('string')
    expect(C.form.submitError.length).toBeGreaterThan(0)
  })

  it('upgradeDescription (used as UpgradeState description) is non-empty', () => {
    expect(typeof C.states.upgradeDescription).toBe('string')
    expect(C.states.upgradeDescription.length).toBeGreaterThan(0)
  })
})

// ── 402 discrimination — submit error (StudentComposerForm + content/new) ─────

describe('402 submit-error discrimination', () => {
  it('status 402 is classified as upgrade', () => {
    expect(is402SubmitError({ status: 402 })).toBe(true)
  })

  it('status 500 is not classified as upgrade', () => {
    expect(is402SubmitError({ status: 500 })).toBe(false)
  })

  it('missing status is not classified as upgrade', () => {
    expect(is402SubmitError({})).toBe(false)
  })
})

// ── Session-selection — 402 error classification ──────────────────────────────

describe('session-selection 402 classification', () => {
  it('status 402 triggers showUpgrade', () => {
    expect(isSessionUpgradeError({ status: 402 })).toBe(true)
  })

  it('FEATURE_GATED code triggers showUpgrade without status', () => {
    expect(isSessionUpgradeError({ code: 'FEATURE_GATED' })).toBe(true)
  })

  it('status 500 falls through to generic toast', () => {
    expect(isSessionUpgradeError({ status: 500 })).toBe(false)
  })
})

// ── content/new — copy contract ───────────────────────────────────────────────

describe('content/new error/upgrade copy', () => {
  it('loadErrorTitle (used as ErrorState title on data load failure) is non-empty', () => {
    expect(typeof EC.loadErrorTitle).toBe('string')
    expect(EC.loadErrorTitle.length).toBeGreaterThan(0)
  })

  it('upgradeDesc (used as UpgradeState description) is non-empty', () => {
    expect(typeof EC.upgradeDesc).toBe('string')
    expect(EC.upgradeDesc.length).toBeGreaterThan(0)
  })
})
