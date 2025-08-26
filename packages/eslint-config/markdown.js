module.exports = {
  overrides: [
    {
      files: ['**/*.md'],
      plugins: ['markdown'],
      processor: 'markdown/markdown',
    },
    {
      // Handle virtual files extracted from markdown
      files: ['**/*.md/*.js', '**/*.md/*.jsx', '**/*.md/*.ts', '**/*.md/*.tsx'],
      extends: ['plugin:@typescript-eslint/disable-type-checked'],
      rules: {
        'no-constant-condition': 'off',
        'no-lone-blocks': 'off',
        'no-undef': 'off',
        'no-unused-labels': 'off',
        'no-unused-vars': 'off',
        'react/react-in-jsx-scope': 'off',
        'react/jsx-no-undef': 'off',
        '@typescript-eslint/no-redeclare': 'off',
        '@typescript-eslint/no-unused-expressions': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
  ],
};
