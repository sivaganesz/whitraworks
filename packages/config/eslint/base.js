module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    'no-console': ['warn', { allow: ['warn', 'error', 'info', 'log'] }],
  },
  overrides: [
    // Golden Rule 7: Frontend apps must NEVER import backend packages or @whitraworks/database
    {
      files: ['apps/ops-admin/**/*.{ts,tsx}', 'apps/tenant-admin/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@whitraworks/database', '@prisma/client', 'apps/api/*'],
                message: 'Golden Rule 7 Violation: Frontend applications must never import database, Prisma, or backend code directly. Use HTTP APIs and @whitraworks/types.',
              },
            ],
          },
        ],
      },
    },
  ],
};
