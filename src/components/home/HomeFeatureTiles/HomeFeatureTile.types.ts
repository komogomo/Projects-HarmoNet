import type React from 'react';

export type HomeFeatureTileDefinition = {
  featureKey: 'NOTICE' | 'BOARD' | 'FACILITY' | 'RULES' | 'NOTIFICATION' | 'DUMMY';
  labelKey: string;
  descriptionKey: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  isEnabled: boolean;
  onClick?: () => void;
};

export type HomeFeatureTileProps = HomeFeatureTileDefinition;
