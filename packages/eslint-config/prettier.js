module.exports = {
  plugins: ['prettier'],
  extends: ['plugin:prettier/recommended', 'prettier'],
  rules: {
    'prettier/prettier': [
      'error',
      {
        arrowParens: 'always',
        singleQuote: true,
        trailingComma: 'all',
        printWidth: 100,
      },
    ],
  },
};
