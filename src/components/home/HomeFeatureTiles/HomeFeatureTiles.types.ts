import { Bell, MessageSquare, Calendar, FileText, ClipboardList, Settings, MoreHorizontal } from 'lucide-react';
import type { HomeFeatureTileDefinition } from './HomeFeatureTile.types';

export type HomeFeatureTilesProps = {
  isTenantAdmin?: boolean;
  tenantId?: string;
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
