"use client";
import React from 'react';
import type { LanguageSwitchProps, Locale } from './LanguageSwitch.types';
import { useStaticI18n as useI18n } from '@/src/components/common/StaticI18nProvider/StaticI18nProvider';

export const LanguageSwitch: React.FC<LanguageSwitchProps> = ({
  className = '',
  testId = 'language-switch',
}) => {
  const { currentLocale, setLocale, t } = useI18n();

  const buttons: { code: Locale; label: string; ariaLabelKey: string }[] = [
    { code: 'ja', label: 'JA', ariaLabelKey: 'nav.languageSwitch.toJa' },
    { code: 'en', label: 'EN', ariaLabelKey: 'nav.languageSwitch.toEn' },
    { code: 'zh', label: 'CN', ariaLabelKey: 'nav.languageSwitch.toZh' },
  ];

  return (
    <div className={`flex gap-1.5 justify-end ${className}`} data-testid={testId}>
      {buttons.map(({ code, label, ariaLabelKey }) => {
        const active = currentLocale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-label={t(ariaLabelKey)}
            aria-pressed={active}
            className={`min-w-[40px] min-h-[30px] rounded-lg border text-xs font-semibold px-2.5 py-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 ${
              active
                ? 'bg-white text-blue-600 border-blue-600 border-2'
                : 'bg-white text-gray-500 border-transparent hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

LanguageSwitch.displayName = 'LanguageSwitch';
export default LanguageSwitch;
