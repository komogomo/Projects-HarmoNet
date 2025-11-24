"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/src/components/common/StaticI18nProvider';
import type { HomeFeatureTilesProps } from './HomeFeatureTiles.types';
import { HOME_FEATURE_TILES } from './HomeFeatureTiles.types';
import { HomeFeatureTile } from './HomeFeatureTile';

export const HomeFeatureTiles: React.FC<HomeFeatureTilesProps> = ({ tiles }) => {
  const { t } = useI18n();
  const router = useRouter();

  const baseTiles = tiles && tiles.length > 0 ? tiles : HOME_FEATURE_TILES;

  const effectiveTiles = baseTiles.map((tile) => {
    if (tile.featureKey === 'NOTICE') {
      return {
        ...tile,
        isEnabled: true,
        onClick: () => {
          router.push('/board?tab=important');
        },
      };
    }

    if (tile.featureKey === 'BOARD') {
      return {
        ...tile,
        isEnabled: true,
        onClick: () => {
          router.push('/board');
        },
      };
    }

    return tile;
  });

  return (
    <section aria-labelledby="home-feature-tiles-title">
      <h2 id="home-feature-tiles-title" className="mb-3 text-base font-semibold text-gray-900">
        {t('home.features.title')}
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {effectiveTiles.map((tile) => (
          <HomeFeatureTile key={tile.featureKey} {...tile} />
        ))}
      </div>
    </section>
  );
};

HomeFeatureTiles.displayName = 'HomeFeatureTiles';
