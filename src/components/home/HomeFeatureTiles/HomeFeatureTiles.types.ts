import { Bell, MessageSquare, Calendar, FileText, Settings, MoreHorizontal } from 'lucide-react';
import type { HomeFeatureTileDefinition } from './HomeFeatureTile.types';

export type HomeFeatureTilesProps = {
  tiles: HomeFeatureTileDefinition[];
};

export const HOME_FEATURE_TILES: HomeFeatureTileDefinition[] = [
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
    featureKey: 'NOTIFICATION',
    labelKey: 'home.tiles.notification.label',
    descriptionKey: 'home.tiles.notification.description',
    icon: Settings,
    isEnabled: false,
  },
  {
    featureKey: 'DUMMY',
    labelKey: 'home.tiles.dummy.label',
    descriptionKey: 'home.tiles.dummy.description',
    icon: MoreHorizontal,
    isEnabled: false,
  },
];
