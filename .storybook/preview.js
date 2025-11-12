import React from 'react';
import '../app/globals.css';
import { StaticI18nProvider } from '@/components/common/StaticI18nProvider/StaticI18nProvider';

const preview = {
  parameters: {
    controls: { expanded: true },
  },
  decorators: [
    (Story) => (
      <StaticI18nProvider>
        <Story />
      </StaticI18nProvider>
    ),
  ],
};

export default preview;
