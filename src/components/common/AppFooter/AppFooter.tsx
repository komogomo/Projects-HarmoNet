'use client';
import React from 'react';
import type { AppFooterProps } from './AppFooter.types';
import { useI18n } from '@/components/common/StaticI18nProvider';

export const AppFooter: React.FC<AppFooterProps> = ({ className = '', testId = 'app-footer' }) => {
  const { t } = useI18n();

  return (
    <footer
      role="contentinfo"
      data-testid={testId}
      className={`
        fixed bottom-0 left-0 right-0
        h-12
        bg-white
        border-t border-gray-200
        z-[900]
        flex items-center justify-center
        text-xs text-gray-400
        ${className}
      `}
    >
      {t('common.copyright')}
    </footer>
  );
};

AppFooter.displayName = 'AppFooter';
