const path = require('path');

const config = {
  stories: ['../src/**/*.stories.@(ts|tsx|mdx)'],
  addons: ['@storybook/test', '@chromatic-com/storybook'],
  staticDirs: ['../public'],

  framework: { name: '@storybook/react-webpack5', options: {} },
  docs: {},

  webpackFinal: async (config) => {
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];

    const includePaths = [
      path.resolve(__dirname, '../app'),
      path.resolve(__dirname, '../src'),
      path.resolve(__dirname, '../components'),
    ];

    // Storybook既定のCSSルールから除外（重複処理を防ぐ）
    const addExclude = (rule) => {
      if (!rule) return;
      if (rule.test && rule.test.toString().includes('css')) {
        rule.exclude = Array.from(new Set([...(Array.isArray(rule.exclude) ? rule.exclude : rule.exclude ? [rule.exclude] : []), ...includePaths]));
      }
      if (Array.isArray(rule.oneOf)) rule.oneOf.forEach(addExclude);
      if (Array.isArray(rule.rules)) rule.rules.forEach(addExclude);
    };
    (config.module.rules || []).forEach(addExclude);

    // Tailwind v4をPostCSSで処理
    config.module.rules.push({
      test: /\.css$/,
      include: includePaths,
      use: [
        require.resolve('style-loader'),
        { loader: require.resolve('css-loader'), options: { importLoaders: 1 } },
        { loader: require.resolve('postcss-loader'), options: { implementation: require('postcss') } },
      ],
    });

    config.module.rules.push({
      test: /\.(js|jsx)$/,
      exclude: /node_modules/,
      use: [{
        loader: require.resolve('babel-loader'),
        options: {
          presets: [
            [require.resolve('@babel/preset-env'), {}],
            [require.resolve('@babel/preset-react'), { runtime: 'automatic' }],
          ],
        },
      }],
    });

    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      exclude: /node_modules/,
      use: [{
        loader: require.resolve('babel-loader'),
        options: {
          presets: [
            [require.resolve('@babel/preset-env'), {}],
            [require.resolve('@babel/preset-typescript'), {}],
            [require.resolve('@babel/preset-react'), { runtime: 'automatic' }],
          ],
        },
      }],
    });

    config.resolve = config.resolve || {};
    config.resolve.extensions = Array.from(new Set([...(config.resolve.extensions || []), '.ts', '.tsx', '.js', '.jsx']));
    const alias = Object.assign({}, config.resolve.alias || {}, {
      '@/src': path.resolve(__dirname, '../src'),
      '@': path.resolve(__dirname, '../src'),
      // Ensure explicit resolution for StaticI18nProvider
      '@/src/components/common/StaticI18nProvider': path.resolve(__dirname, '../src/components/common/StaticI18nProvider'),
      '@/src/components/common/StaticI18nProvider/StaticI18nProvider': path.resolve(__dirname, '../src/components/common/StaticI18nProvider/StaticI18nProvider.tsx'),
      '@corbado/web-js': path.resolve(__dirname, './mocks/corbado-web-js.js'),
    });
    // reorder to prioritize '@/src' over '@'
    config.resolve.alias = {
      '@/src': alias['@/src'],
      '@': alias['@'],
      '@/src/components/common/StaticI18nProvider': alias['@/src/components/common/StaticI18nProvider'],
      '@/src/components/common/StaticI18nProvider/StaticI18nProvider': alias['@/src/components/common/StaticI18nProvider/StaticI18nProvider'],
      '@corbado/web-js': alias['@corbado/web-js'],
    };

    return config;
  },

  typescript: { reactDocgen: 'react-docgen-typescript' },
};

module.exports = config;