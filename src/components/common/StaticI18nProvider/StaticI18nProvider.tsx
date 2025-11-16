"use client";

import React, { createContext, useCallback, useContext, useEffect, useEffectEvent, useMemo, useState } from 'react';
import type { Locale, StaticI18nContextValue, StaticI18nProviderProps, Translations } from '@/src/components/common/StaticI18nProvider/StaticI18nProvider.types';

const I18NContext = createContext<StaticI18nContextValue | null>(null);

const FALLBACK_LOCALE: Locale = 'ja';
const LOCALES: Locale[] = ['ja', 'en', 'zh'];

const buildDictionaryPath = (locale: Locale): string => `/locales/${locale}/common.json`;

async function fetchTranslations(locale: Locale): Promise<Translations> {
  const res = await fetch(buildDictionaryPath(locale));
  if (!res.ok) {
    throw new Error('LOAD_FAIL');
  }
  return res.json();
}

function resolveKey(obj: Translations, key: string): string | undefined {
  const parts = key.split('.');
  let current: any = obj;

  for (const part of parts) {
    if (!current || typeof current !== 'object' || !(part in current)) {
      return undefined;
    }
    current = current[part];
  }

  return typeof current === 'string' ? current : undefined;
}

export function useStaticI18n(): StaticI18nContextValue {
  const ctx = useContext(I18NContext);
  if (!ctx) {
    throw new Error('StaticI18nProvider is missing. Wrap your tree with <StaticI18nProvider>.');
  }
  return ctx;
}

export const StaticI18nProvider: React.FC<StaticI18nProviderProps> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(FALLBACK_LOCALE);
  const [translations, setTranslations] = useState<Translations>({});

  const initLocale = useEffectEvent(() => {
    if (typeof window === 'undefined') {
      setLocaleState(FALLBACK_LOCALE);
      return;
    }

    try {
      const saved = window.localStorage.getItem('selectedLanguage') as Locale | null;
      const isValid = saved && (LOCALES as string[]).includes(saved);
      const initial = isValid ? (saved as Locale) : FALLBACK_LOCALE;
      setLocaleState(initial);
    } catch {
      setLocaleState(FALLBACK_LOCALE);
    }
  });

  const loadTranslations = useEffectEvent(async (target: Locale) => {
    try {
      const data = await fetchTranslations(target);
      setTranslations(data);
    } catch (err) {
      console.error('[i18n] Failed to load dictionary:', target, err);
      if (target !== FALLBACK_LOCALE) {
        setLocaleState(FALLBACK_LOCALE);
      }
    }
  });

  useEffect(() => {
    initLocale();
  }, []);

  useEffect(() => {
    loadTranslations(locale);
  }, [locale]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('selectedLanguage', locale);
    } catch {
      // ignore
    }
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      setLocaleState(next);
    },
    [locale],
  );

  const t = useCallback<StaticI18nContextValue['t']>(
    (key: string) => {
      const hasLoadedDictionary = Object.keys(translations).length > 0;

      if (!hasLoadedDictionary) {
        // 初回ロード中は警告を出さずにキーをそのまま返す。
        return key;
      }

      const value = resolveKey(translations, key);
      if (typeof value === 'string') {
        return value;
      }
      console.warn('[i18n] Missing key:', key);
      return key;
    },
    [translations],
  );

  const value = useMemo<StaticI18nContextValue>(
    () => ({
      locale,
      currentLocale: locale,
      setLocale,
      t,
    }),
    [locale, setLocale, t],
  );

  return <I18NContext.Provider value={value}>{children}</I18NContext.Provider>;
};

StaticI18nProvider.displayName = 'StaticI18nProvider';
