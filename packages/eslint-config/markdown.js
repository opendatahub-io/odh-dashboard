module.exports = {
  overrides: [
    {
      files: ['**/*.md'],
      plugins: ['markdown'],
      processor: 'markdown/markdown',
    },
    {
      // Handle virtual JavaScript files extracted from markdown
      files: ['**/*.md/*.js'],
      rules: {
        'no-lone-blocks': 'off',
        'no-undef': 'off',
        'no-unused-labels': 'off',
        'no-unused-vars': 'off',
      },
    },
  ],
};
