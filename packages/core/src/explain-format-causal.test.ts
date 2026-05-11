// Stage 40 — Quick Insights integration test.
// Guards that CausalMapDTO.active_misconceptions shape (incl. category + affected_skill_count)
// passes cleanly through buildExplanationCards as used by the student dashboard D7.

import { describe, it, expect } from 'vitest';
import { buildExplanationCards } from './explain-format.js';
import type { MisconceptionInput } from './explain-format.js';

// Mirrors the exact shape of CausalMapDTOSchema.active_misconceptions from @mm/types.
type CausalMapMisconception = {
  misconception_id: string;
  name: string;
  category: string;
  confidence: number;
  severity: string;
  affected_skill_count: number;
};

describe('buildExplanationCards — CausalMapDTO integration (Stage 40 Quick Insights)', () => {
  it('maps CausalMapDTO.active_misconceptions shape to ExplanationCard[] correctly', () => {
    const causalMisconceptions: CausalMapMisconception[] = [
      {
        misconception_id: 'mc-fractions-001',
        name: 'Equivalent fractions',
        category: 'number',
        confidence: 0.75,
        severity: 'high',
        affected_skill_count: 4,
      },
      {
        misconception_id: 'mc-place-002',
        name: 'Place value',
        category: 'number',
        confidence: 0.6,
        severity: 'medium',
        affected_skill_count: 2,
      },
      {
        misconception_id: 'mc-angles-003',
        name: 'Angle measurement',
        category: 'geometry',
        confidence: 0.4,
        severity: 'low',
        affected_skill_count: 1,
      },
    ];

    // Dashboard slices to max 3 — verify all 3 map cleanly.
    const cards = buildExplanationCards(causalMisconceptions as MisconceptionInput[]).slice(0, 3);

    expect(cards).toHaveLength(3);

    // First card (high severity) — id sourced from misconception_id.
    expect(cards[0]!.id).toBe('mc-fractions-001');
    expect(cards[0]!.observation).toContain('Equivalent fractions');
    expect(cards[0]!.suggestion.length).toBeGreaterThan(0);

    // Second card (medium severity).
    expect(cards[1]!.id).toBe('mc-place-002');
    expect(cards[1]!.observation).toContain('Place value');

    // Third card (low severity).
    expect(cards[2]!.id).toBe('mc-angles-003');
  });
});
