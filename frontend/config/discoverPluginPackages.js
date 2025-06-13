const { execSync } = require('child_process');

/**
 * Retrieves all workspace package metadata using the `npm query .workspace --json` command.
 *
 * @returns {Array<Object>} An array of workspace package objects, or an empty array if the query fails.
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
 * Returns workspace packages that export a "./extensions" entry.
 *
 * @param {Array} workspaces - Workspace package objects to filter.
 * @returns {Array} Packages with a "./extensions" export.
 */
function filterPluginPackages(workspaces) {
  return workspaces.filter((pkg) => pkg.exports?.['./extensions']);
}

/**
 * Returns the names of all monorepo workspace packages that export a "./extensions" entry in their package.json.
 *
 * If the `PLUGIN_PACKAGES` environment variable is set, only those package names are returned, in the specified order, after validating that each exists and exports "./extensions". If any specified package is invalid, an error is logged and the function throws to fail the build. If the environment variable is not set, all discovered plugin package names are returned.
 *
 * @returns {string[]} Array of valid plugin package names.
 *
 * @throws {Error} If `PLUGIN_PACKAGES` is set and contains package names that are not found or do not export "./extensions".
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
