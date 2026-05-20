import type { Meta, StoryObj } from '@storybook/react';
import { Select } from './Select.js';

const meta: Meta<typeof Select> = { title: 'Forms/Select', component: Select };
export default meta;
type Story = StoryObj<typeof Select>;

const options = [
  { value: 'au_numeracy_y5_format', label: 'Numeracy Y5' },
  { value: 'au_math_paper_c_format', label: 'Math Paper C' },
];

export const Default: Story = { args: { label: 'Assessment', options, placeholder: 'Select assessment…' } };
export const WithValue: Story = { args: { label: 'Assessment', options, value: 'au_numeracy_y5_format' } };
export const WithError: Story = { args: { label: 'Assessment', options, error: 'Please select an assessment.' } };
