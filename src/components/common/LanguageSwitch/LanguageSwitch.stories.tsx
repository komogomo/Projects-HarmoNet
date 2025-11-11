import type { Meta, StoryObj } from '@storybook/react';
import { LanguageSwitch } from './LanguageSwitch';

const meta: Meta<typeof LanguageSwitch> = {
  title: 'Common/LanguageSwitch',
  component: LanguageSwitch,
};

export default meta;

type Story = StoryObj<typeof LanguageSwitch>;

export const Default: Story = {};

export const English: Story = {
  render: () => <LanguageSwitch />,
};

export const Chinese: Story = {
  render: () => <LanguageSwitch />,
};
