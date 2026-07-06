module.exports = {
  overrides: [
    {
      files: ['**/*.yaml', '**/*.yml'],
      parser: 'yaml-eslint-parser',
      plugins: ['yml'],
      extends: ['plugin:yml/recommended'],
    },
  ],
};
