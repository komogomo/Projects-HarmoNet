import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Locale, StaticI18nContextValue, StaticI18nProviderProps, Translations } from './StaticI18nProvider.types';

const I18NContext = createContext<StaticI18nContextValue | null>(null);

const LOCALES: Locale[] = ['ja', 'en', 'zh'];
const DEFAULT_LOCALE: Locale = 'ja';

const cache: Map<Locale, Translations> = new Map();

function getFromLocalStorage(): Locale | null {
  try {
    const v = localStorage.getItem('locale');
    if (v && (LOCALES as string[]).includes(v)) return v as Locale;
    return null;
  } catch {
    return null;
  }
}

async function fetchTranslations(locale: Locale): Promise<Translations> {
  const res = await fetch(`/locales/${locale}/common.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to load translations for ${locale}`);
  return res.json();
}

function resolveKey(obj: Translations, key: string): string | undefined {
  const parts = key.split('.');
  let cur: any = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object' || !(p in cur)) return undefined;
    cur = cur[p];
  }
  return typeof cur === 'string' ? cur : undefined;
}

export function useStaticI18n(): StaticI18nContextValue {
  const ctx = useContext(I18NContext);
  if (!ctx) {
    throw new Error('StaticI18nProvider is missing. Wrap your tree with <StaticI18nProvider>.');
  }
  return ctx;
}

export const StaticI18nProvider: React.FC<StaticI18nProviderProps> = ({
  children,
  initialLocale,
  enablePersistence = true,
}) => {
  const initial = useMemo<Locale>(() => {
    const fromStorage = enablePersistence ? getFromLocalStorage() : null;
    return initialLocale ?? fromStorage ?? DEFAULT_LOCALE;
  }, [initialLocale, enablePersistence]);

  const [currentLocale, setCurrentLocale] = useState<Locale>(initial);
  const [translations, setTranslations] = useState<Translations>({});
  const loadingRef = useRef<Promise<void> | null>(null);

  const load = useCallback(async (locale: Locale) => {
    if (cache.has(locale)) {
      setTranslations(cache.get(locale)!);
      return;
    }
    try {
      const data = await fetchTranslations(locale);
      cache.set(locale, data);
      setTranslations(data);
    } catch (e) {
      console.warn(`[i18n] Failed to load ${locale}, falling back to 'ja'`, e);
      if (locale !== 'ja') {
        // Update locale immediately for UI consistency, then ensure ja translations
        setCurrentLocale('ja');
        if (cache.has('ja')) {
          setTranslations(cache.get('ja')!);
        } else {
          const ja = await fetchTranslations('ja');
          cache.set('ja', ja);
          setTranslations(ja);
        }
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    loadingRef.current = Promise.resolve().then(() => {
      if (active) {
        return load(currentLocale);
      }
      return undefined as unknown as Promise<void>;
    });
    return () => {
      active = false;
    };
  }, [currentLocale, load]);

  useEffect(() => {
    if (!enablePersistence) return;
    try {
      localStorage.setItem('locale', currentLocale);
    } catch {
      // ignore
    }
  }, [currentLocale, enablePersistence]);

  const setLocale = useCallback((locale: Locale) => {
    if (locale === currentLocale) return;
    setCurrentLocale(locale);
  }, [currentLocale]);

  const t = useCallback<StaticI18nContextValue['t']>((key: string) => {
    const val = resolveKey(translations, key);
    if (typeof val === 'string') return val;
    console.warn(`[i18n] Missing key: ${key}`);
    return key;
  }, [translations]);

  const value = useMemo<StaticI18nContextValue>(() => ({ currentLocale, setLocale, t }), [currentLocale, setLocale, t]);

  return (
    <I18NContext.Provider value={value}>
      {children}
    </I18NContext.Provider>
  );
};

StaticI18nProvider.displayName = 'StaticI18nProvider';
