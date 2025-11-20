'use client';
import React from 'react';
import type { AppFooterProps } from './AppFooter.types';
import { useI18n } from '@/src/components/common/StaticI18nProvider';

export const AppFooter: React.FC<AppFooterProps> = ({
  className = '',
  testId = 'app-footer',
}) => {
  const { t } = useI18n();

  return (
    <footer
      role="contentinfo"
      data-testid={testId}
      className={`
        fixed bottom-0 left-0 right-0
        z-[900]
        py-0.5
        text-[11px] text-gray-400 text-center
        ${className}
      `}
    >
      {t('common.copyright')}
    </footer>
  );
};

AppFooter.displayName = 'AppFooter';
