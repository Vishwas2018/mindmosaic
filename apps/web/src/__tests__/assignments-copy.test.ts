// Stage 39 — copy utility tests for ASSIGN_COPY (assignments.ts).
// Guards computed helpers: due(), questions(), minutes(), modeLabel().

import { describe, it, expect } from 'vitest'
import { ASSIGN_COPY as C } from '../copy/assignments'

describe('ASSIGN_COPY.due()', () => {
  it('returns em-dash for null', () => {
    expect(C.due(null)).toBe('—')
  })

  it('formats an ISO date string in en-AU locale (day Month Year)', () => {
    // 11 May 2026 UTC
    const result = C.due('2026-05-11T00:00:00.000Z')
    expect(result).toMatch(/11/)
    expect(result).toMatch(/May/)
    expect(result).toMatch(/2026/)
  })

  it('does not include time component in output', () => {
    const result = C.due('2026-05-11T15:30:00.000Z')
    expect(result).not.toMatch(/15:/)
    expect(result).not.toMatch(/30/)
  })
})

describe('ASSIGN_COPY.questions()', () => {
  it('returns singular-agnostic "N questions" string', () => {
    expect(C.questions(10)).toBe('10 questions')
    expect(C.questions(1)).toBe('1 questions')
    expect(C.questions(25)).toBe('25 questions')
  })
})

describe('ASSIGN_COPY.minutes()', () => {
  it('returns "N min" for any positive number', () => {
    expect(C.minutes(30)).toBe('30 min')
    expect(C.minutes(15)).toBe('15 min')
  })
})

describe('ASSIGN_COPY.modeLabel()', () => {
  it('replaces underscores with spaces and title-cases each word', () => {
    expect(C.modeLabel('skill_drill')).toBe('Skill Drill')
  })

  it('title-cases a single word', () => {
    expect(C.modeLabel('practice')).toBe('Practice')
  })

  it('handles multi-word underscore string', () => {
    expect(C.modeLabel('at_risk_students')).toBe('At Risk Students')
  })
})

describe('ASSIGN_COPY.steps', () => {
  it('has exactly 5 steps in order', () => {
    expect(C.steps).toHaveLength(5)
    expect(C.steps[0]).toBe('Type')
    expect(C.steps[4]).toBe('Review')
  })
})

describe('ASSIGN_COPY.typeCards', () => {
  it('has exactly 4 cards with unique keys', () => {
    expect(C.typeCards).toHaveLength(4)
    const keys = C.typeCards.map((c) => c.key)
    expect(new Set(keys).size).toBe(4)
  })

  it('skill card key is "skill" (wizard vocabulary, not server mode)', () => {
    const skill = C.typeCards.find((c) => c.key === 'skill')
    expect(skill).toBeDefined()
    expect(skill?.key).toBe('skill')
  })
})

describe('ASSIGN_COPY phase-2 tooltip strings', () => {
  it('attemptsTooltip, startDateTooltip, reminderTooltip all equal phase2Tooltip', () => {
    expect(C.attemptsTooltip).toBe(C.phase2Tooltip)
    expect(C.startDateTooltip).toBe(C.phase2Tooltip)
    expect(C.reminderTooltip).toBe(C.phase2Tooltip)
  })
})
