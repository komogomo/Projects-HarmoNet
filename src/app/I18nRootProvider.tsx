"use client";
import React from 'react';
import { StaticI18nProvider } from '@/components/common/StaticI18nProvider';

export default function I18nRootProvider({ children }: { children: React.ReactNode }) {
  return <StaticI18nProvider initialLocale="ja">{children}</StaticI18nProvider>;
}
