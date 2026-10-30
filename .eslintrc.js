const base = require('@odh-dashboard/eslint-config').recommendedReactTypescript(__dirname);

module.exports = {
  ...base,
  ignorePatterns: [...(base.ignorePatterns ?? []), '**/upstream/**'],
};
