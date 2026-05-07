import { render, fireEvent } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, it, expect, vi } from 'vitest';
import { FocusHeader } from './FocusHeader.js';

describe('FocusHeader', () => {
  it('has no serious/critical axe violations', async () => {
    const { container } = render(<FocusHeader onExit={() => undefined} />);
    const results = await axe(container);
    expect(results).toHaveNoSeriousViolations();
  });

  it('calls onExit when the exit button is clicked', () => {
    const onExit = vi.fn();
    const { getByRole } = render(<FocusHeader onExit={onExit} />);
    fireEvent.click(getByRole('button', { name: /exit session/i }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('renders centre and helper slots', () => {
    const { getByText } = render(
      <FocusHeader
        onExit={() => undefined}
        centre={<span>Centre</span>}
        helper={<span>Helper</span>}
      />,
    );
    expect(getByText('Centre')).toBeTruthy();
    expect(getByText('Helper')).toBeTruthy();
  });

  it('renders a custom exitLabel', () => {
    const { getByRole } = render(
      <FocusHeader onExit={() => undefined} exitLabel="Back to selection" />,
    );
    expect(getByRole('button', { name: /back to selection/i })).toBeTruthy();
  });
});
