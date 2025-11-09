import type { StorybookConfig } from '@storybook/react';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/test'],
  framework: {
    name: '@storybook/react',
    options: {},
  },
};

export default config;
