// Stage 40 — jest-axe structural coverage for student route patterns.
// Tests Card+Button (assignments route) and StatTile grid (dashboard route).

import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, it, expect } from 'vitest';
import { Card } from '../Card/Card.js';
import { StatTile } from '../StatTile/StatTile.js';
import { EmptyState } from '../EmptyState/EmptyState.js';
import { Button } from '../Button/Button.js';

describe('Assignments route structural pattern — axe', () => {
  it('assignment card with overdue pill + action button has no serious violations', async () => {
    const { container } = render(
      <Card className="border-l-4 border-l-red-500">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Fractions Practice</span>
              <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">
                Overdue
              </span>
            </div>
            <p className="text-xs">Practice · 10 questions</p>
            <p className="text-xs text-red-600">Was due 1 May</p>
          </div>
          <Button variant="primary" size="sm">
            Start
          </Button>
        </div>
      </Card>,
    );
    const results = await axe(container);
    expect(results).toHaveNoSeriousViolations();
  });

  it('empty state for assignments tab has no serious violations', async () => {
    const { container } = render(
      <EmptyState title="No assignments yet" description="You're all caught up — check back later." />,
    );
    const results = await axe(container);
    expect(results).toHaveNoSeriousViolations();
  });
});

describe('Dashboard route structural pattern — axe', () => {
  it('KPI strip with four StatTiles has no serious violations', async () => {
    const { container } = render(
      <div className="grid grid-cols-4 gap-4">
        <StatTile label="Sessions this week" value={3} />
        <StatTile label="Overall mastery" value="72%" />
        <StatTile label="Last score" value="85%" sentiment="positive" />
        <StatTile label="Weekly progress" value="60%" />
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoSeriousViolations();
  });
});
