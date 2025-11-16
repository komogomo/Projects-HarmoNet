import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { AppFooter } from './AppFooter';
import { StaticI18nProvider } from '@/src/components/common/StaticI18nProvider';

const meta: Meta<typeof AppFooter> = {
  title: 'Common/AppFooter',
  component: AppFooter,
};

export default meta;

type Story = StoryObj<typeof AppFooter>;

export const Default: Story = {
  name: 'Japanese',
  render: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('selectedLanguage', 'ja');
    }
    return (
      <StaticI18nProvider>
        <AppFooter />
      </StaticI18nProvider>
    );
  },
};

export const English: Story = {
  render: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('selectedLanguage', 'en');
    }
    return (
      <StaticI18nProvider>
        <AppFooter />
      </StaticI18nProvider>
    );
  },
};

export const Chinese: Story = {
  render: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('selectedLanguage', 'zh');
    }
    return (
      <StaticI18nProvider>
        <AppFooter />
      </StaticI18nProvider>
    );
  },
};
