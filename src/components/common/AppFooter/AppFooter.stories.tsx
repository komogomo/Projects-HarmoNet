import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { AppFooter } from './AppFooter';
import { StaticI18nProvider } from '@/components/common/StaticI18nProvider';

const meta: Meta<typeof AppFooter> = {
  title: 'Common/AppFooter',
  component: AppFooter,
};

export default meta;

type Story = StoryObj<typeof AppFooter>;

export const Default: Story = {
  name: 'Japanese',
  render: () => (
    <StaticI18nProvider initialLocale="ja">
      <AppFooter />
    </StaticI18nProvider>
  ),
};

export const English: Story = {
  render: () => (
    <StaticI18nProvider initialLocale="en">
      <AppFooter />
    </StaticI18nProvider>
  ),
};

export const Chinese: Story = {
  render: () => (
    <StaticI18nProvider initialLocale="zh">
      <AppFooter />
    </StaticI18nProvider>
  ),
};
