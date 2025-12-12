import type { ReactNode } from 'react';

export type Locale = 'ja' | 'en' | 'zh';

export type Translations = Record<string, any>;

export interface StaticI18nContextValue {
  locale: Locale;
  currentLocale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  mergeTranslations: (messages: Record<string, string>) => void;
}

export interface StaticI18nProviderProps {
  children: ReactNode;
}
