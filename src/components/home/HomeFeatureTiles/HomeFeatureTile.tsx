"use client";

import React from 'react';
import { useI18n } from '@/src/components/common/StaticI18nProvider';
import type { HomeFeatureTileProps } from './HomeFeatureTile.types';

export const HomeFeatureTile: React.FC<HomeFeatureTileProps> = ({
  featureKey,
  labelKey,
  descriptionKey,
  icon: Icon,
  isEnabled,
  onClick,
}) => {
  const { t } = useI18n();

  const handleClick = () => {
    if (!isEnabled || !onClick) return;
    onClick();
  };

  const baseClassName =
    'flex flex-col items-start justify-start gap-1 rounded-lg border-2 border-gray-200 px-3 py-3 text-left text-xs bg-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600';
  const enabledClassName = 'cursor-pointer border-blue-100 hover:border-blue-300 hover:bg-blue-50 transition-colors';
  const disabledClassName = 'cursor-default border-gray-100 text-gray-400';
  const iconColorClassName = featureKey === 'NOTICE' ? 'text-yellow-400' : 'text-blue-600';

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${baseClassName} ${isEnabled ? enabledClassName : disabledClassName}`}
      aria-disabled={!isEnabled}
      data-feature-key={featureKey}
    >
      <Icon aria-hidden="true" className={`mb-1 h-5 w-5 ${iconColorClassName}`} />
      <span className="text-xs font-semibold text-gray-900">{t(labelKey)}</span>
      <span className="text-[11px] leading-snug text-gray-500">{t(descriptionKey)}</span>
    </button>
  );
};

HomeFeatureTile.displayName = 'HomeFeatureTile';
