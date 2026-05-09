import type { Meta, StoryObj } from '@storybook/react';
import { ReadinessRing } from './ReadinessRing.js';

const meta: Meta<typeof ReadinessRing> = {
  title: 'Data / ReadinessRing',
  component: ReadinessRing,
  parameters: { layout: 'centered' },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
  },
};
export default meta;
type Story = StoryObj<typeof ReadinessRing>;

export const Empty: Story = { args: { value: 0, label: 'Readiness: 0%', size: 'md' } };
export const Quarter: Story = { args: { value: 0.25, label: 'Readiness: 25%', size: 'md' } };
export const Half: Story = { args: { value: 0.5, label: 'Readiness: 50%', size: 'md' } };
export const ThreeQuarters: Story = { args: { value: 0.75, label: 'Readiness: 75%', size: 'md' } };
export const Full: Story = { args: { value: 1, label: 'Readiness: 100%', size: 'md' } };
export const Small: Story = { args: { value: 0.65, label: 'NAPLAN readiness', size: 'sm' } };
export const Large: Story = { args: { value: 0.65, label: 'NAPLAN readiness', size: 'lg' } };
