import { render, fireEvent } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, it, expect, vi } from 'vitest';
import { ErrorState } from './ErrorState.js';

describe('ErrorState', () => {
  it('renders title and description', () => {
    const { getByText } = render(
      <ErrorState
        title="Couldn't load recent activity"
        description="Your progress is safe."
      />,
    );
    expect(getByText("Couldn't load recent activity")).toBeDefined();
    expect(getByText('Your progress is safe.')).toBeDefined();
  });

  it('renders retry button only when onRetry is provided', () => {
    const handleRetry = vi.fn();

    const { getByRole, unmount } = render(
      <ErrorState title="Error" onRetry={handleRetry} />,
    );
    const btn = getByRole('button', { name: /try again/i });
    expect(btn).toBeDefined();
    fireEvent.click(btn);
    expect(handleRetry).toHaveBeenCalledOnce();
    unmount();

    const { queryByRole } = render(<ErrorState title="Error" />);
    expect(queryByRole('button')).toBeNull();
  });

  it('has no serious/critical axe violations', async () => {
    const { container } = render(
      <ErrorState
        title="Couldn't load recent activity"
        description="Your progress is safe."
        onRetry={() => {}}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoSeriousViolations();
  });
});
