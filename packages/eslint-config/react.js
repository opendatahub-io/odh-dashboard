module.exports = {
  extends: ['plugin:jsx-a11y/recommended', 'plugin:react/recommended'],

  parserOptions: {
    ecmaFeatures: {
      tsx: true,
      jsx: true,
      useJSXTextNode: true,
    },
  },

  env: {
    browser: true,
  },

  plugins: ['react-hooks'],

  settings: {
    react: {
      version: 'detect',
    },
  },

  rules: {
    'jsx-a11y/no-autofocus': ['error', { ignoreNonDOM: true }],
    'jsx-a11y/anchor-is-valid': [
      'error',
      {
        components: ['Link'],
        specialLink: ['to'],
        aspects: ['noHref', 'invalidHref', 'preferButton'],
      },
    ],
    'react/jsx-boolean-value': 'error',
    'react/jsx-fragments': 'error',
    'react/jsx-no-constructed-context-values': 'error',
    'react/no-unused-prop-types': 'error',
    'react/jsx-curly-brace-presence': [2, { props: 'never', children: 'never' }],
    'react/self-closing-comp': 'error',
    'react/prop-types': 'off',
  },
};
