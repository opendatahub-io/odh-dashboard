/**
 * Checks whether a file path is an extension definition file within any
 * of the known plugin packages.
 *
 * Extension files follow naming patterns such as:
 *   extensions.ts, extensions/foo.ts, path/to/odh/extensions.ts
 *
 * @param {string} resource - Absolute path to the module file
 * @param {Array<{ location: string }>} pluginPackageDetails
 * @returns {boolean}
 */
function isExtensionFile(resource, pluginPackageDetails) {
  return pluginPackageDetails.some((pkg) => {
    if (!resource.startsWith(`${pkg.location}/`)) {
      return false;
    }
    const relativePath = resource.slice(pkg.location.length + 1);
    return /(^|\/)extensions(\/|\.)/i.test(relativePath);
  });
}

/**
 * Returns a webpack splitChunks `chunks` function that only includes
 * async chunks originating from dynamic imports in extension files.
 *
 * This prevents route-level or other code-splitting chunks within a plugin
 * from being merged into the single plugin chunk — only extension code
 * references are grouped together.
 *
 * @param {Array<{ shortName: string, location: string }>} pluginPackageDetails
 * @returns {function} A chunks filter function for use in splitChunks.cacheGroups
 */
function getExtensionChunksFilter(pluginPackageDetails) {
  return (chunk) => {
    if (chunk.canBeInitial()) {
      return false;
    }
    for (const group of chunk.groupsIterable) {
      for (const origin of group.origins) {
        if (
          origin.module?.resource &&
          isExtensionFile(origin.module.resource, pluginPackageDetails)
        ) {
          return true;
        }
      }
    }
    return false;
  };
}

/**
 * Returns a webpack splitChunks `name` function that groups plugin modules
 * into a single chunk per plugin package.
 *
 * - If all async chunks containing the module have the same explicit
 *   webpackChunkName, that name is preserved.
 * - If chunks have mixed or no names, the module falls into the default
 *   plugin chunk (`plugin-<shortName>`), avoiding shared-module
 *   mis-attribution across differently named chunks.
 *
 * @param {Array<{ shortName: string, location: string }>} pluginPackageDetails
 * @returns {function} A name function for use in splitChunks.cacheGroups
 */
function getPluginChunkName(pluginPackageDetails) {
  return (module, chunks) => {
    const asyncChunks = chunks.filter((c) => !c.canBeInitial());
    const namedChunks = asyncChunks.filter((c) => c.name);

    if (namedChunks.length > 0 && namedChunks.length === asyncChunks.length) {
      const names = new Set(namedChunks.map((c) => c.name));
      if (names.size === 1) {
        return namedChunks[0].name;
      }
    }

    const plugin = pluginPackageDetails.find((pkg) =>
      module.resource?.startsWith(`${pkg.location}/`),
    );
    return plugin ? `plugin-${plugin.shortName}` : undefined;
  };
}

module.exports = { isExtensionFile, getExtensionChunksFilter, getPluginChunkName };
