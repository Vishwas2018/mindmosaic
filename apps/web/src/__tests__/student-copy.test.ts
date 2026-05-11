// Stage 40 — MODE_ICON_MAP invariant tests (Q-40.UI-5).
// Guards that all known modes resolve to a defined icon and unknown modes fall back to HelpCircle.

import { describe, it, expect } from 'vitest'
import { HelpCircle, Pencil } from 'lucide-react'
import { MODE_ICON_MAP, getModeIcon } from '../copy/student'

describe('MODE_ICON_MAP invariants', () => {
  it('practice maps to the Pencil icon', () => {
    expect(MODE_ICON_MAP['practice']).toBe(Pencil)
  })

  it('all four known modes (practice, diagnostic, exam, skill_drill) have entries', () => {
    const known = ['practice', 'diagnostic', 'exam', 'skill_drill']
    for (const mode of known) {
      expect(MODE_ICON_MAP[mode], `${mode} must be in MODE_ICON_MAP`).toBeDefined()
    }
    expect(Object.keys(MODE_ICON_MAP)).toHaveLength(4)
  })

  it('getModeIcon returns HelpCircle for an unknown mode string', () => {
    expect(getModeIcon('unknown_mode')).toBe(HelpCircle)
    expect(getModeIcon('')).toBe(HelpCircle)
  })
})
