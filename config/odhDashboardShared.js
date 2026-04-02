const fs = require('fs');
const path = require('path');

const odhDashboardDir = path.resolve(__dirname, '..', 'node_modules', '@odh-dashboard');

/**
 * Build MF shared entries for all @odh-dashboard/* workspace packages.
 * Scans node_modules/@odh-dashboard to discover packages hoisted by npm workspaces,
 * ensuring they are deduplicated at runtime between host and remotes.
 *
 * Uses `requiredVersion: '*'` because all @odh-dashboard/* packages are workspace-local
 * and always resolved to a single version by npm hoisting — there is no version mismatch
 * risk, so a pinned range would add maintenance burden with no benefit.
 *
 * @param {Object} options - Additional MF shared options (e.g. { eager: true })
 * @returns {Object} MF shared config entries keyed by package name
 */
const getOdhDashboardShared = (options = {}) => {
  if (!fs.existsSync(odhDashboardDir)) {
    throw new Error(
      `@odh-dashboard packages not found at ${odhDashboardDir}. ` +
        'Run "npm install" at the repository root to hoist workspace packages.',
    );
  }

  return fs
    .readdirSync(odhDashboardDir)
    .filter((name) => !name.startsWith('.'))
    .reduce((acc, name) => {
      acc[`@odh-dashboard/${name}`] = { singleton: true, requiredVersion: '*', ...options };
      return acc;
    }, {});
};

module.exports = { getOdhDashboardShared };
