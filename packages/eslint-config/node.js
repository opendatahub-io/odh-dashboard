const globals = require('globals');
const { engines } = require('../../package.json');

module.exports = {
  overrides: [
    {
      files: ['**/*.js'],
      extends: ['plugin:n/recommended'],
      parserOptions: {
        ecmaVersion: 2021,
      },
      globals: {
        ...globals.node,
      },
      rules: {
        'n/no-unsupported-features/node-builtins': ['error', { version: engines.node }],
      },
    },
  ],
};
