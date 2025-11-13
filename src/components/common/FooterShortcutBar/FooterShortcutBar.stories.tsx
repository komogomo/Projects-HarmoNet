import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { FooterShortcutBar } from './FooterShortcutBar';
import type { UserRole } from './FooterShortcutBar.types';
import { StaticI18nProvider } from '@/src/components/common/StaticI18nProvider';

const meta: Meta<typeof FooterShortcutBar> = {
  title: 'Common/FooterShortcutBar',
  component: FooterShortcutBar,
  argTypes: {
    role: {
      control: { type: 'select' },
      options: ['general_user', 'tenant_admin', 'system_admin'] satisfies UserRole[],
    },
  },
  args: {
    role: 'general_user',
  },
};

export default meta;

type Story = StoryObj<typeof FooterShortcutBar>;

export const Default: Story = {
  name: 'Japanese',
  render: (args) => (
    <StaticI18nProvider initialLocale="ja">
      <div style={{ paddingBottom: 64 }}>
        <FooterShortcutBar {...args} />
      </div>
    </StaticI18nProvider>
  ),
};

export const English: Story = {
  render: (args) => (
    <StaticI18nProvider initialLocale="en">
      <div style={{ paddingBottom: 64 }}>
        <FooterShortcutBar {...args} />
      </div>
    </StaticI18nProvider>
  ),
};

export const Chinese: Story = {
  render: (args) => (
    <StaticI18nProvider initialLocale="zh">
      <div style={{ paddingBottom: 64 }}>
        <FooterShortcutBar {...args} />
      </div>
    </StaticI18nProvider>
  ),
};
