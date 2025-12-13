import next from 'eslint-config-next';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: ['node_modules', '.next', 'dist', '**/*.bak_*'],
  },
  {
    rules: {
      'no-console': 'error',
    },
  },
  {
    files: ['src/lib/logging/log.util.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  ...next,
  prettier,
];
