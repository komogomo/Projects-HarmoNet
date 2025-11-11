"use client";
import React from 'react';
import type { LanguageSwitchProps, Locale } from './LanguageSwitch.types';
import { useI18n } from '@/components/common/StaticI18nProvider';

export const LanguageSwitch: React.FC<LanguageSwitchProps> = ({
  className = '',
  testId = 'language-switch',
}) => {
  const { currentLocale, setLocale } = useI18n();

  const buttons: { code: Locale; label: string }[] = [
    { code: 'ja', label: 'JA' },
    { code: 'en', label: 'EN' },
    { code: 'zh', label: '中文' },
  ];

  return (
    <div className={`flex gap-2 ${className}`} data-testid={testId}>
      {buttons.map(({ code, label }) => {
        const active = currentLocale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-label={`${label}に切り替え`}
            aria-pressed={active}
            className={`min-w-[48px] min-h-[36px] rounded-lg border text-sm font-semibold px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 ${
              active
                ? 'bg-blue-50 text-blue-600 border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
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
