module.exports = {
  extends: [
    '../../.eslintrc.js', // Extend from frontend eslint config
  ],
  rules: {
    // Allow more flexibility for utility package that bridges different type systems
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/consistent-type-assertions': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    'comma-dangle': 'off',

    // Console logs are expected in test utilities
    'no-console': 'off',
  },
};