export type Locale = 'ja' | 'en' | 'zh';

export interface LanguageSwitchProps {
  className?: string;
  testId?: string;
  onLanguageChange?: (newLocale: Locale) => void;
  currentLocale?: Locale;
}
