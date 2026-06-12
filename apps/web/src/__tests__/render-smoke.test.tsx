// Cluster B render-test toolchain smoke test (Item 4, R-FIX-LOCK-V2).
// Verifies that jsdom + @testing-library/react + @mm/ui component resolve
// correctly inside apps/web vitest. Not a behavioural test — just confirms
// the toolchain is wired end-to-end.

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorState } from '@mm/ui';

describe('render-smoke — @mm/ui ErrorState in apps/web jsdom', () => {
  it('renders role="alert" with the supplied title', () => {
    render(<ErrorState title="Something went wrong" />);
    const alert = screen.getByRole('alert', { name: /something went wrong/i });
    expect(alert).toBeDefined();
  });
});
