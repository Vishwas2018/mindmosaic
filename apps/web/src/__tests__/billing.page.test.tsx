// Stage 45 — billing page utility tests.
// Tests formatAud, formatDate, and BILLING_COPY structure.
// Pure function tests only — no React rendering (matches apps/web test pattern).

import { describe, it, expect } from 'vitest'
import { formatAud, formatDate } from '../lib/format'
import { BILLING_COPY } from '../copy/billing'

// ── formatAud ─────────────────────────────────────────────────────────────────

describe('formatAud()', () => {
  it('returns a string containing a dollar sign for zero cents', () => {
    const result = formatAud(0)
    expect(typeof result).toBe('string')
    expect(result).toMatch(/\$/)
  })

  it('formats 100 cents as $1', () => {
    const result = formatAud(100)
    expect(result).toMatch(/1\.00/)
  })

  it('formats 1999 cents correctly (19.99)', () => {
    const result = formatAud(1999)
    expect(result).toMatch(/19/)
    expect(result).toMatch(/99/)
  })

  it('formats 10000 cents as $100', () => {
    const result = formatAud(10000)
    expect(result).toMatch(/100/)
  })

  it('formats large amounts (99900 cents = $999)', () => {
    const result = formatAud(99900)
    expect(result).toMatch(/999/)
  })

  it('includes AUD currency identifier ($ or AUD)', () => {
    const result = formatAud(5000)
    expect(result).toMatch(/\$|AUD/)
  })
})

// ── formatDate ────────────────────────────────────────────────────────────────

describe('formatDate()', () => {
  it('returns a string for a valid ISO date', () => {
    const result = formatDate('2026-06-04T00:00:00.000Z')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('includes the year in the formatted output', () => {
    const result = formatDate('2026-06-04T00:00:00.000Z')
    expect(result).toMatch(/2026/)
  })

  it('includes the day number in the formatted output', () => {
    const result = formatDate('2026-06-04T00:00:00.000Z')
    expect(result).toMatch(/4/)
  })
})

// ── BILLING_COPY.faq ──────────────────────────────────────────────────────────

describe('BILLING_COPY.faq', () => {
  it('has at least 3 FAQ items', () => {
    expect(BILLING_COPY.faq.length).toBeGreaterThanOrEqual(3)
  })

  it('every faq item has a non-empty question string', () => {
    BILLING_COPY.faq.forEach((item) => {
      expect(typeof item.q).toBe('string')
      expect(item.q.trim().length).toBeGreaterThan(0)
    })
  })

  it('every faq item has a non-empty answer string', () => {
    BILLING_COPY.faq.forEach((item) => {
      expect(typeof item.a).toBe('string')
      expect(item.a.trim().length).toBeGreaterThan(0)
    })
  })
})

// ── BILLING_COPY.compareRows ──────────────────────────────────────────────────

describe('BILLING_COPY.compareRows', () => {
  it('has at least 5 comparison rows', () => {
    expect(BILLING_COPY.compareRows.length).toBeGreaterThanOrEqual(5)
  })

  it('every compareRow has feature, free, standard, and premium fields', () => {
    BILLING_COPY.compareRows.forEach((row) => {
      expect(typeof row.feature).toBe('string')
      expect(row.feature.trim().length).toBeGreaterThan(0)
      expect(row.free !== undefined).toBe(true)
      expect(row.standard !== undefined).toBe(true)
      expect(row.premium !== undefined).toBe(true)
    })
  })

  it('free/standard/premium values are boolean or string', () => {
    BILLING_COPY.compareRows.forEach((row) => {
      (['free', 'standard', 'premium'] as const).forEach((tier) => {
        expect(typeof row[tier] === 'boolean' || typeof row[tier] === 'string').toBe(true)
      })
    })
  })

  it('all feature names are unique', () => {
    const features = BILLING_COPY.compareRows.map((r) => r.feature)
    expect(new Set(features).size).toBe(features.length)
  })
})

// ── BILLING_COPY.trustBullets ─────────────────────────────────────────────────

describe('BILLING_COPY.trustBullets', () => {
  it('has exactly 3 trust bullets', () => {
    expect(BILLING_COPY.trustBullets).toHaveLength(3)
  })

  it('all trust bullets are non-empty strings', () => {
    BILLING_COPY.trustBullets.forEach((bullet) => {
      expect(typeof bullet).toBe('string')
      expect(bullet.trim().length).toBeGreaterThan(0)
    })
  })
})

// ── BILLING_COPY.paymentMethodNote ────────────────────────────────────────────

describe('BILLING_COPY.paymentMethodNote', () => {
  it('is a non-empty string', () => {
    expect(typeof BILLING_COPY.paymentMethodNote).toBe('string')
    expect(BILLING_COPY.paymentMethodNote.trim().length).toBeGreaterThan(0)
  })

  it('mentions Stripe', () => {
    expect(BILLING_COPY.paymentMethodNote).toContain('Stripe')
  })
})

// ── BILLING_COPY.cancelDialog ─────────────────────────────────────────────────

describe('BILLING_COPY.cancelDialog', () => {
  it('has a non-empty title', () => {
    expect(typeof BILLING_COPY.cancelDialog.title).toBe('string')
    expect(BILLING_COPY.cancelDialog.title.trim().length).toBeGreaterThan(0)
  })

  it('body is a function', () => {
    expect(typeof BILLING_COPY.cancelDialog.body).toBe('function')
  })

  it('body includes the period end date passed in', () => {
    const result = BILLING_COPY.cancelDialog.body('30 June 2026')
    expect(result).toContain('30 June 2026')
  })

  it('body mentions reverting to Free', () => {
    const result = BILLING_COPY.cancelDialog.body('30 June 2026')
    expect(result).toContain('Free')
  })

  it('confirm label is a non-empty string', () => {
    expect(typeof BILLING_COPY.cancelDialog.confirm).toBe('string')
    expect(BILLING_COPY.cancelDialog.confirm.trim().length).toBeGreaterThan(0)
  })

  it('keep label is a non-empty string', () => {
    expect(typeof BILLING_COPY.cancelDialog.keep).toBe('string')
    expect(BILLING_COPY.cancelDialog.keep.trim().length).toBeGreaterThan(0)
  })
})

// ── BILLING_COPY.pathways ─────────────────────────────────────────────────────

describe('BILLING_COPY.pathways', () => {
  it('is a Record<string, string>', () => {
    expect(typeof BILLING_COPY.pathways).toBe('object')
    Object.entries(BILLING_COPY.pathways).forEach(([key, val]) => {
      expect(typeof key).toBe('string')
      expect(typeof val).toBe('string')
    })
  })

  it('contains naplan_y5_numeracy mapping', () => {
    expect(BILLING_COPY.pathways['naplan_y5_numeracy']).toBeDefined()
    expect(BILLING_COPY.pathways['naplan_y5_numeracy']?.length).toBeGreaterThan(0)
  })

  it('contains icas_math_c mapping', () => {
    expect(BILLING_COPY.pathways['icas_math_c']).toBeDefined()
    expect(BILLING_COPY.pathways['icas_math_c']?.length).toBeGreaterThan(0)
  })
})
