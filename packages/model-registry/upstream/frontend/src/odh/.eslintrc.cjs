module.exports = {
  plugins: ['markdown'],
  overrides: [
    {
      files: ['README.md'],
      processor: 'markdown/markdown',
    },
  ],
};
