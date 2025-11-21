'use client';
import React from 'react';
import { LanguageSwitch } from '@/src/components/common/LanguageSwitch';
import { useStaticI18n as useI18n } from '@/src/components/common/StaticI18nProvider/StaticI18nProvider';
import type { AppHeaderProps } from './AppHeader.types';
import Image from 'next/image';

export const AppHeader: React.FC<AppHeaderProps> = ({
  variant = 'login',
  className = '',
  testId = 'app-header',
}) => {
  const { currentLocale, setLocale } = useI18n();
  return (
    <header
      className={`
        fixed top-0 left-0 right-0
        h-[60px]
        bg-white
        border-b border-gray-200
        z-[1000]
        ${className}
      `}
      data-testid={testId}
      role="banner"
    >
      {/* ★ ここをフレーム化 */}
      <div className="w-full max-w-[500px] mx-auto px-5 h-full flex items-center justify-between">

        {/* ロゴ */}
        <div className="flex items-center">
          <Image
            src="/images/logo-harmonet.png"
            alt="HarmoNet"
            width={128}
            height={32}
            data-testid={`${testId}-logo`}
            priority
          />
        </div>

        {/* 右側要素 */}
        <div className="flex items-center gap-4">

          {variant === 'authenticated' && (
            <button
              className="
                relative
                w-10 h-10
                flex items-center justify-center
                text-gray-600
                hover:bg-gray-100
                rounded-lg
                transition-colors
              "
              aria-label="通知を表示"
              data-testid={`${testId}-notification`}
            >
              <span className="text-2xl" aria-hidden="true">🔔</span>
            </button>
          )}

          <LanguageSwitch testId={`${testId}-language-switch`} />
        </div>

      </div>
    </header>
  );
};

AppHeader.displayName = 'AppHeader';
