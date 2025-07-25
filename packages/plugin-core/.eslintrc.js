module.exports = {
  root: true,
  extends: ['@odh-dashboard/eslint-config/react-typescript'],
  rules: {
    'no-barrel-files/no-barrel-files': 'off',

    // TODO enable once the dependency cycle with @odh-dashboard/internal is resolved
    'import/no-extraneous-dependencies': 'off',
  },
};
