"use client";

import React from 'react';
import { LayoutGrid, Bell, MessageSquare, Calendar, FileText, ClipboardList, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/src/components/common/StaticI18nProvider';
import type { HomeFeatureTilesProps } from './HomeFeatureTiles.types';
import type { HomeFeatureTileDefinition } from './HomeFeatureTile.types';
import { HomeFeatureTile } from './HomeFeatureTile';

const FEATURE_TILES: HomeFeatureTileDefinition[] = [
  {
    featureKey: 'NOTICE',
    labelKey: 'home.tiles.notice.label',
    descriptionKey: 'home.tiles.notice.description',
    icon: Bell,
    isEnabled: false,
  },
  {
    featureKey: 'BOARD',
    labelKey: 'home.tiles.board.label',
    descriptionKey: 'home.tiles.board.description',
    icon: MessageSquare,
    isEnabled: false,
  },
  {
    featureKey: 'FACILITY',
    labelKey: 'home.tiles.facility.label',
    descriptionKey: 'home.tiles.facility.description',
    icon: Calendar,
    isEnabled: false,
  },
  {
    featureKey: 'RULES',
    labelKey: 'home.tiles.rules.label',
    descriptionKey: 'home.tiles.rules.description',
    icon: FileText,
    isEnabled: false,
  },
  {
    featureKey: 'SURVEY',
    labelKey: 'home.tiles.survey.label',
    descriptionKey: 'home.tiles.survey.description',
    icon: ClipboardList,
    isEnabled: false,
  },
  {
    featureKey: 'TENANT_ADMIN',
    labelKey: 'home.tiles.tenantAdmin.label',
    descriptionKey: 'home.tiles.tenantAdmin.description',
    icon: Settings,
    isEnabled: false,
  },
];

export const HomeFeatureTiles: React.FC<HomeFeatureTilesProps> = ({ isTenantAdmin = false }) => {
  const { t } = useI18n();
  const router = useRouter();

  // Filter tiles based on role
  const baseTiles = FEATURE_TILES.filter((tile) => {
    if (tile.featureKey === 'TENANT_ADMIN') {
      return isTenantAdmin;
    }
    return true;
  });

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

    if (tile.featureKey === 'FACILITY') {
      return {
        ...tile,
        isEnabled: true,
        onClick: () => {
          router.push('/facilities');
        },
      };
    }

    if (tile.featureKey === 'RULES') {
      return {
        ...tile,
        isEnabled: true,
        onClick: () => {
          router.push('/board?tab=rules');
        },
      };
    }

    if (tile.featureKey === 'TENANT_ADMIN') {
      return {
        ...tile,
        isEnabled: true,
        onClick: () => {
          router.push('/t-admin/users');
        },
      };
    }

    return tile;
  });

  return (
    <section aria-labelledby="home-feature-tiles-title">
      <h2
        id="home-feature-tiles-title"
        className="mb-3 flex items-center gap-1 text-base font-semibold text-gray-900"
      >
        <LayoutGrid
          aria-hidden="true"
          className="h-5 w-5 text-blue-600"
        />
        <span>{t('home.features.title')}</span>
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
