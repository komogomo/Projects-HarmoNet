import type { Meta, StoryObj } from '@storybook/react';
import { AppHeader } from './AppHeader';

const meta: Meta<typeof AppHeader> = {
  title: 'Common/AppHeader',
  component: AppHeader,
};

export default meta;

export type Story = StoryObj<typeof AppHeader>;

export const Login: Story = {
  args: { variant: 'login' },
};

export const Authenticated: Story = {
  args: { variant: 'authenticated' },
};
