import { render, fireEvent } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, it, expect, vi } from 'vitest';
import { UpgradeState } from './UpgradeState.js';

describe('UpgradeState', () => {
  it('renders default title, override title, and "Upgrade to {tier}" CTA', () => {
    const { getByText, rerender } = render(
      <UpgradeState tier="Standard" onUpgrade={() => {}} />,
    );
    expect(getByText('Upgrade your plan')).toBeDefined();
    expect(getByText('Upgrade to Standard')).toBeDefined();

    rerender(
      <UpgradeState tier="Premium" title="Session limit reached" onUpgrade={() => {}} />,
    );
    expect(getByText('Session limit reached')).toBeDefined();
    expect(getByText('Upgrade to Premium')).toBeDefined();
  });

  it('calls onUpgrade when CTA is clicked', () => {
    const handleUpgrade = vi.fn();
    const { getByRole } = render(
      <UpgradeState tier="Standard" onUpgrade={handleUpgrade} />,
    );
    fireEvent.click(getByRole('button', { name: /upgrade to standard/i }));
    expect(handleUpgrade).toHaveBeenCalledOnce();
  });

  it('has no serious/critical axe violations', async () => {
    const { container } = render(
      <UpgradeState
        tier="Standard"
        description="This feature requires the Standard plan."
        onUpgrade={() => {}}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoSeriousViolations();
  });
});
