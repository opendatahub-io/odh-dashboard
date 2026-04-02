const fs = require('fs');
const path = require('path');

const odhDashboardDir = path.resolve(__dirname, '..', 'node_modules', '@odh-dashboard');

/**
 * Build MF shared entries for all @odh-dashboard/* workspace packages.
 * Scans node_modules/@odh-dashboard to discover packages hoisted by npm workspaces,
 * ensuring they are deduplicated at runtime between host and remotes.
 *
 * @param {Object} options - Additional MF shared options (e.g. { eager: true })
 * @returns {Object} MF shared config entries keyed by package name
 */
const getOdhDashboardShared = (options = {}) => {
  if (!fs.existsSync(odhDashboardDir)) {
    console.warn(
      `@odh-dashboard packages not found at ${odhDashboardDir}. ` +
        'Run "npm install" to ensure workspace packages are hoisted.',
    );
    return {};
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
