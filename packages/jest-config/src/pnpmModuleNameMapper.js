const path = require('path');

// This file lives in packages/jest-config/src, so walk back to the monorepo root.
const repoRoot = path.resolve(__dirname, '../../..');

/**
 * pnpm-safe Jest moduleNameMapper entries for singleton React resolution.
 *
 * Workspace packages such as @odh-dashboard/ui-core can otherwise resolve a
 * second React copy from their own install tree, which breaks hooks in tests.
 */
function pnpmJestModuleNameMapper() {
  return {
    '^react$': path.join(repoRoot, 'node_modules/react'),
    '^react-dom$': path.join(repoRoot, 'node_modules/react-dom'),
  };
}

module.exports = {
  pnpmJestModuleNameMapper,
};
