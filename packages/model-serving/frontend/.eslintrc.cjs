const path = require('path');

module.exports = {
  parser: '@typescript-eslint/parser',
  root: true,
  ignorePatterns: ['**/*.yaml', '**/*.yml'],
  env: {
    browser: true,
    node: true,
  },
  parserOptions: {
    tsx: true,
    jsx: true,
    js: true,
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'react-hooks', 'import', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'prettier',
  ],
  settings: {
    react: { version: 'detect' },
  },
  rules: {
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: true,
        optionalDependencies: true,
        packageDir: [__dirname, path.resolve(__dirname, '..'), path.resolve(__dirname, '../../..')],
      },
    ],
    'no-console': 'off',
    'prettier/prettier': ['error', { singleQuote: true, trailingComma: 'all', printWidth: 100 }],
    'react/prop-types': 'off',
  },
  overrides: [
    {
      files: ['config/**/*.js'],
      rules: {
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
    {
      files: ['src/odh/extensions.ts'],
      rules: {
        'no-barrel-files/no-barrel-files': 'off',
      },
    },
  ],
};
