import type { Meta, StoryObj } from '@storybook/react';
import { ErrorState } from './ErrorState.js';

const meta: Meta<typeof ErrorState> = { title: 'Layout/ErrorState', component: ErrorState };
export default meta;
type Story = StoryObj<typeof ErrorState>;

export const Default: Story = {
  args: { title: "Couldn't load data" },
};

export const WithDescription: Story = {
  args: {
    title: "Couldn't load recent activity",
    description: 'Your progress is safe.',
  },
};

export const WithRetry: Story = {
  args: {
    title: "Couldn't load recent activity",
    description: 'Your progress is safe.',
    onRetry: () => {},
  },
};

export const NoRetryAction: Story = {
  args: {
    title: "You don't have permission to view this.",
  },
};
