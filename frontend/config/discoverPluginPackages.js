const { execSync } = require('child_process');

// Avoids running `npm query` multiple times within the same webpack build process,
// since both discoverPluginPackages() and getPluginPackageDetails() need this data.
let cachedWorkspacePackages = null;

/**
 * Get all workspace packages using npm query (memoized).
 * @returns {Array} Array of workspace package objects
 */
function getWorkspacePackages() {
  if (cachedWorkspacePackages) {
    return cachedWorkspacePackages;
  }
  try {
    const stdout = execSync('npm query .workspace --json', {
      encoding: 'utf8',
    });
    cachedWorkspacePackages = JSON.parse(stdout);
    return cachedWorkspacePackages;
  } catch (error) {
    console.warn('Error querying workspaces with npm query:', error.message);
    cachedWorkspacePackages = [];
    return cachedWorkspacePackages;
  }
}

/**
 * Filter workspace packages that have ./extensions export
 * @param {Array} workspaces - Array of workspace package objects
 * @returns {Array} Array of plugin packages
 */
function filterPluginPackages(workspaces) {
  return workspaces.filter((pkg) => pkg.exports?.['./extensions']);
}

/**
 * Discover all monorepo packages that have "./extensions" export in their package.json
 * Can use PLUGIN_PACKAGES environment variable as comma-separated package names,
 * or auto-discover from all workspace packages
 * @returns {string[]} An array of package names.
 */
function discoverPluginPackages() {
  // Get all workspace plugins that have extensions
  const workspacePackages = getWorkspacePackages();
  const pluginPackages = filterPluginPackages(workspacePackages);
  const availablePluginNames = pluginPackages.map((pkg) => pkg.name);

  // If PLUGIN_PACKAGES is provided, use it to filter and order the packages
  if (process.env.PLUGIN_PACKAGES) {
    const wantedPackageNames = process.env.PLUGIN_PACKAGES.split(',')
      .map((name) => name.trim())
      .filter(Boolean);

    const availablePluginsSet = new Set(availablePluginNames);
    const validPackages = [];
    const invalidPackages = [];

    for (const packageName of wantedPackageNames) {
      if (availablePluginsSet.has(packageName)) {
        validPackages.push(packageName);
      } else {
        invalidPackages.push(packageName);
      }
    }

    // If any packages are invalid when explicitly specified, fail the build
    if (invalidPackages.length > 0) {
      console.error('\nError: Invalid package(s) specified in PLUGIN_PACKAGES:');
      invalidPackages.forEach((pkg) =>
        console.error(`  - ${pkg} (not found in workspace or missing ./extensions export)`),
      );
      console.error('\nAvailable workspace packages:');
      availablePluginNames.forEach((pkg) => console.error(`  - ${pkg}`));
      console.error('');
      throw new Error('Invalid packages specified in PLUGIN_PACKAGES');
    }

    return validPackages;
  }

  // Auto-discovery logic (when no PLUGIN_PACKAGES provided)
  return availablePluginNames;
}

/**
 * Get details of plugin packages for webpack chunk grouping.
 * Returns the short name and filesystem location for each plugin package,
 * excluding the host internal package.
 * @returns {{ name: string, shortName: string, location: string }[]}
 */
function getPluginPackageDetails() {
  const workspacePackages = getWorkspacePackages();
  const pluginPackages = filterPluginPackages(workspacePackages);
  return pluginPackages
    .filter((pkg) => {
      if (pkg.name === '@odh-dashboard/internal') {
        return false;
      }
      if (!pkg.path) {
        console.warn(
          `Plugin package ${pkg.name} has no path from npm query, skipping chunk grouping`,
        );
        return false;
      }
      return true;
    })
    .map((pkg) => ({
      name: pkg.name,
      shortName: pkg.name.replace(/^@[^/]+\//, ''),
      location: pkg.path,
    }));
}

/**
 * Filter workspace packages that are feature packages (extensions or module federation).
 * Excludes tooling-only packages like eslint-config, jest-config, tsconfig, cypress, etc.
 * @param {Array} workspaces - Array of workspace package objects
 * @returns {Array} Array of feature packages
 */
function filterFeaturePackages(workspaces) {
  return workspaces.filter((pkg) => pkg.exports?.['./extensions'] || pkg['module-federation']);
}

/**
 * Get version and support level metadata for all feature packages
 * (both static extension plugins and module federation remotes).
 * Used by DefinePlugin to inject package metadata into the frontend bundle.
 * @returns {{ name: string, version: string, supportLevel?: string }[]}
 */
function getPluginPackageVersions() {
  const workspacePackages = getWorkspacePackages();
  const featurePackages = filterFeaturePackages(workspacePackages);
  return featurePackages
    .filter((pkg) => pkg.name !== '@odh-dashboard/internal')
    .map((pkg) => ({
      name: pkg.name,
      version: pkg.version || '0.0.0',
      ...(pkg.supportLevel ? { supportLevel: pkg.supportLevel } : {}),
    }));
}

module.exports = {
  discoverPluginPackages,
  getPluginPackageDetails,
  getPluginPackageVersions,
};
