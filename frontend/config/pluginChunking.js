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

module.exports = { getPluginChunkName };
