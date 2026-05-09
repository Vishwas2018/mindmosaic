import { describe, it, expect } from 'vitest';
import { buildExplanationCards, EXPLANATION_FORMATTER_VERSION } from './explain-format.js';
import type { MisconceptionInput } from './explain-format.js';

function makeMisconception(override: Partial<MisconceptionInput> = {}): MisconceptionInput {
  return {
    misconception_id: 'mc-001',
    name: 'Place value',
    category: 'number',
    confidence: 0.8,
    severity: 'medium',
    affected_skill_count: 3,
    ...override,
  };
}

describe('buildExplanationCards', () => {
  it('high severity produces non-empty observation, interpretation and suggestion', () => {
    const cards = buildExplanationCards([makeMisconception({ severity: 'high' })]);
    expect(cards).toHaveLength(1);
    expect(cards[0]!.observation.length).toBeGreaterThan(0);
    expect(cards[0]!.interpretation.length).toBeGreaterThan(0);
    expect(cards[0]!.suggestion.length).toBeGreaterThan(0);
  });

  it('medium severity produces non-empty card', () => {
    const cards = buildExplanationCards([makeMisconception({ severity: 'medium' })]);
    expect(cards).toHaveLength(1);
    expect(cards[0]!.observation.length).toBeGreaterThan(0);
    expect(cards[0]!.interpretation.length).toBeGreaterThan(0);
    expect(cards[0]!.suggestion.length).toBeGreaterThan(0);
  });

  it('low severity produces non-empty card', () => {
    const cards = buildExplanationCards([makeMisconception({ severity: 'low' })]);
    expect(cards).toHaveLength(1);
    expect(cards[0]!.observation.length).toBeGreaterThan(0);
    expect(cards[0]!.interpretation.length).toBeGreaterThan(0);
    expect(cards[0]!.suggestion.length).toBeGreaterThan(0);
  });

  it('maps misconception_id to ExplanationCard.id', () => {
    const cards = buildExplanationCards([makeMisconception({ misconception_id: 'mc-xyz-99' })]);
    expect(cards[0]!.id).toBe('mc-xyz-99');
  });

  it('unknown severity falls back to low tier copy', () => {
    const cards = buildExplanationCards([makeMisconception({ severity: 'critical' })]);
    expect(cards).toHaveLength(1);
    expect(cards[0]!.suggestion.length).toBeGreaterThan(0);
  });

  it('returns empty array for empty input', () => {
    expect(buildExplanationCards([])).toEqual([]);
  });

  it('interpolates misconception name into observation', () => {
    const cards = buildExplanationCards([
      makeMisconception({ name: 'Fractions', severity: 'high' }),
    ]);
    expect(cards[0]!.observation).toContain('Fractions');
  });
});

describe('EXPLANATION_FORMATTER_VERSION', () => {
  it('is v1', () => {
    expect(EXPLANATION_FORMATTER_VERSION).toBe('v1');
  });
});
