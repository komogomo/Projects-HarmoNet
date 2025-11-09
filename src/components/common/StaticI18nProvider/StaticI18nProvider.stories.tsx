import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { StaticI18nProvider, useStaticI18n } from './index';

function Demo() {
  const { t, currentLocale, setLocale } = useStaticI18n();
  return (
    <div className="p-4 space-y-2">
      <div>locale: {currentLocale}</div>
      <div>{t('common.language')}</div>
      <div className="flex gap-2">
        <button onClick={() => setLocale('ja')}>JA</button>
        <button onClick={() => setLocale('en')}>EN</button>
        <button onClick={() => setLocale('zh')}>ZH</button>
      </div>
    </div>
  );
}

const meta: Meta<typeof StaticI18nProvider> = {
  title: 'Common/StaticI18nProvider',
  component: StaticI18nProvider,
};

export default meta;

type Story = StoryObj<typeof StaticI18nProvider>;

export const Default: Story = {
  render: () => (
    <StaticI18nProvider initialLocale="ja">
      <Demo />
    </StaticI18nProvider>
  ),
};

export const English: Story = {
  render: () => (
    <StaticI18nProvider initialLocale="en">
      <Demo />
    </StaticI18nProvider>
  ),
};

export const Chinese: Story = {
  render: () => (
    <StaticI18nProvider initialLocale="zh">
      <Demo />
    </StaticI18nProvider>
  ),
};

export const WithDynamicSwitch: Story = {
  render: () => (
    <StaticI18nProvider>
      <Demo />
    </StaticI18nProvider>
  ),
};
