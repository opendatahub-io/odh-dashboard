const VirtualModulesPlugin = require('webpack-virtual-modules');
const { discoverPluginPackages } = require('./discoverPluginPackages');

/**
 * Webpack plugin to generate a virtual module with imports for all discovered plugin extensions.
 */
class GenerateExtensionsPlugin {
  constructor(options) {
    this.targetFile = options.targetFile;

    // Discover packages and generate the virtual module content synchronously.
    const discoveredPackages = discoverPluginPackages();
    console.log('Extension packages:', discoveredPackages);
    const content = this.generateFileContent(discoveredPackages);

    // This plugin instance will be used by the apply method.
    this.virtualModules = new VirtualModulesPlugin({
      [this.targetFile]: content,
    });
  }

  apply(compiler) {
    // Apply the virtual modules plugin to the compiler.
    this.virtualModules.apply(compiler);
  }

  generateFileContent(pluginPackages) {
    if (!pluginPackages || pluginPackages.length === 0) {
      return `import type { Extension } from '@openshift/dynamic-plugin-sdk';

const pluginExtensions: Record<string, Extension[]> = {};

export default pluginExtensions;
`;
    }

    // Generate import statements for each discovered package
    const imports = pluginPackages
      .map((pkgName, index) => `import extensions${index} from '${pkgName}/extensions';`)
      .join('\n');

    // Generate the entries
    const recordEntries = pluginPackages
      .map((pkgName, index) => `  '${pkgName}': extensions${index}`)
      .join(',\n');

    // Return the final content of the virtual module
    return `import type { Extension } from '@openshift/dynamic-plugin-sdk';
${imports}

const pluginExtensions: Record<string, Extension[]> = {
${recordEntries},
};

export default pluginExtensions;
`;
  }
}

module.exports = GenerateExtensionsPlugin;
