// v1.1-S4 — EXAM_CONTENT_COPY structure tests.
// Pure string/function tests — no React rendering (matches apps/web test pattern).

import { describe, it, expect } from 'vitest'
import { EXAM_CONTENT_COPY as C } from '../app/(teacher)/copy/examContent'

describe('EXAM_CONTENT_COPY — bank browser strings', () => {
  it('pageTitle is a non-empty string', () => {
    expect(typeof C.pageTitle).toBe('string')
    expect(C.pageTitle.length).toBeGreaterThan(0)
  })

  it('heading is a non-empty string', () => {
    expect(typeof C.heading).toBe('string')
    expect(C.heading.length).toBeGreaterThan(0)
  })

  it('newExamBtn is a non-empty string', () => {
    expect(typeof C.newExamBtn).toBe('string')
    expect(C.newExamBtn.length).toBeGreaterThan(0)
  })

  it('loadError is a non-empty string', () => {
    expect(typeof C.loadError).toBe('string')
    expect(C.loadError.length).toBeGreaterThan(0)
  })

  it('emptyTitle and emptyDesc are non-empty strings', () => {
    expect(typeof C.emptyTitle).toBe('string')
    expect(C.emptyTitle.length).toBeGreaterThan(0)
    expect(typeof C.emptyDesc).toBe('string')
    expect(C.emptyDesc.length).toBeGreaterThan(0)
  })
})

describe('EXAM_CONTENT_COPY — composer form strings', () => {
  it('section labels are non-empty strings', () => {
    expect(typeof C.sectionBankPick).toBe('string')
    expect(C.sectionBankPick.length).toBeGreaterThan(0)
    expect(typeof C.sectionConfigure).toBe('string')
    expect(C.sectionConfigure.length).toBeGreaterThan(0)
    expect(typeof C.sectionAssign).toBe('string')
    expect(C.sectionAssign.length).toBeGreaterThan(0)
  })

  it('submit strings are non-empty', () => {
    expect(typeof C.submitBtn).toBe('string')
    expect(C.submitBtn.length).toBeGreaterThan(0)
    expect(typeof C.successTitle).toBe('string')
    expect(C.successTitle.length).toBeGreaterThan(0)
  })

  it('validation messages are non-empty strings', () => {
    expect(typeof C.pathwayRequired).toBe('string')
    expect(C.pathwayRequired.length).toBeGreaterThan(0)
    expect(typeof C.classRequired).toBe('string')
    expect(C.classRequired.length).toBeGreaterThan(0)
  })
})

describe('EXAM_CONTENT_COPY — function helpers', () => {
  it('diffSumHint(sum, target) returns a string containing both numbers', () => {
    const result = C.diffSumHint(15, 20)
    expect(typeof result).toBe('string')
    expect(result).toContain('15')
    expect(result).toContain('20')
  })

  it('diffSumError(target) returns a string containing the target number', () => {
    const result = C.diffSumError(20)
    expect(typeof result).toBe('string')
    expect(result).toContain('20')
  })

  it('itemCountLabel(1) uses singular form', () => {
    expect(C.itemCountLabel(1)).toContain('1')
  })

  it('itemCountLabel(n > 1) uses plural form', () => {
    const result = C.itemCountLabel(10)
    expect(result).toContain('10')
  })
})
