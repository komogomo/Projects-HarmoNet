import type { ReactNode } from 'react';

export type Locale = 'ja' | 'en' | 'zh';

export type Translations = Record<string, any>;

export interface StaticI18nContextValue {
  currentLocale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

export interface StaticI18nProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
  enablePersistence?: boolean;
}
