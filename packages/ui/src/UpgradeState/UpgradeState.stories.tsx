import type { Meta, StoryObj } from '@storybook/react';
import { UpgradeState } from './UpgradeState.js';

const meta: Meta<typeof UpgradeState> = { title: 'Layout/UpgradeState', component: UpgradeState };
export default meta;
type Story = StoryObj<typeof UpgradeState>;

export const Default: Story = {
  args: {
    tier: 'Standard',
    onUpgrade: () => {},
  },
};

export const WithDescription: Story = {
  args: {
    tier: 'Standard',
    description: 'This feature requires the Standard plan.',
    onUpgrade: () => {},
  },
};

export const CustomTitle: Story = {
  args: {
    tier: 'Premium',
    title: 'Session limit reached',
    description: "You've used all sessions on the Free plan.",
    onUpgrade: () => {},
  },
};
