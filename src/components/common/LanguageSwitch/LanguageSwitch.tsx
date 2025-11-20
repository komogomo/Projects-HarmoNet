"use client";
import React from 'react';
import type { LanguageSwitchProps, Locale } from './LanguageSwitch.types';
import { useStaticI18n as useI18n } from '@/src/components/common/StaticI18nProvider/StaticI18nProvider';

export const LanguageSwitch: React.FC<LanguageSwitchProps> = ({
  className = '',
  testId = 'language-switch',
}) => {
  const { currentLocale, setLocale } = useI18n();

  const buttons: { code: Locale; label: string }[] = [
    { code: 'ja', label: 'JA' },
    { code: 'en', label: 'EN' },
    { code: 'zh', label: 'ZH' },
  ];

  return (
    <div className={`flex gap-1.5 justify-end ${className}`} data-testid={testId}>
      {buttons.map(({ code, label }) => {
        const active = currentLocale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-label={`${label}に切り替え`}
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
