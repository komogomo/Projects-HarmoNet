import type React from 'react';

export type HomeFeatureTileDefinition = {
  featureKey: 'NOTICE' | 'BOARD' | 'FACILITY' | 'RULES' | 'SURVEY' | 'TENANT_ADMIN' | 'DUMMY';
  labelKey: string;
  descriptionKey: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  isEnabled: boolean;
  onClick?: () => void;
  labelOverride?: string;
  descriptionOverride?: string;
};

export type HomeFeatureTileProps = HomeFeatureTileDefinition;
