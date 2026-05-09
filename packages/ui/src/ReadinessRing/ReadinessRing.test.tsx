import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, it, expect } from 'vitest';
import { ReadinessRing } from './ReadinessRing.js';

describe('ReadinessRing', () => {
  it('has no serious/critical axe violations', async () => {
    const { container } = render(<ReadinessRing value={0.75} label="Readiness" />);
    const results = await axe(container);
    expect(results).toHaveNoSeriousViolations();
  });

  it('aria-label encodes label and rounded percentage', () => {
    const { getByRole } = render(<ReadinessRing value={0.6} label="Math readiness" />);
    expect(getByRole('img').getAttribute('aria-label')).toBe('Math readiness: 60%');
  });

  it('clamps value above 1 to 100%', () => {
    const { getByRole } = render(<ReadinessRing value={1.5} label="Over" />);
    expect(getByRole('img').getAttribute('aria-label')).toBe('Over: 100%');
  });

  it('clamps value below 0 to 0%', () => {
    const { getByRole } = render(<ReadinessRing value={-0.5} label="Under" />);
    expect(getByRole('img').getAttribute('aria-label')).toBe('Under: 0%');
  });
});
