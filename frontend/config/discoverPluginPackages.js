const { execSync } = require('child_process');

/**
 * Get all workspace packages using npm query
 * @returns {Array} Array of workspace package objects
 */
function getWorkspacePackages() {
  try {
    const stdout = execSync('npm query .workspace --json', {
      encoding: 'utf8',
      cwd: process.cwd(),
    });
    return JSON.parse(stdout);
  } catch (error) {
    console.warn('Error querying workspaces with npm query:', error.message);
    return [];
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

module.exports = {
  discoverPluginPackages,
};
