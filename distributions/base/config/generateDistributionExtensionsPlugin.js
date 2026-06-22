const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const VirtualModulesPlugin = require('webpack-virtual-modules');

/**
 * Webpack plugin that reads a distribution.yaml config file and generates
 * a virtual module with extension imports for all declared packages.
 *
 * Follows the same pattern as frontend/config/generateExtensionsPlugin.js.
 *
 * @example
 * new GenerateDistributionExtensionsPlugin({
 *   configPath: path.resolve(__dirname, '../distribution.yaml'),
 *   targetFile: 'src/distribution-extensions.ts',
 *   envOverrides: {
 *     ENABLE_MODEL_SERVING: {
 *       package: '@odh-dashboard/model-serving',
 *       extensionsPath: './extensions/odh',
 *       featureFlags: { 'model-serving-shell': true },
 *     },
 *   },
 * })
 */
class GenerateDistributionExtensionsPlugin {
  constructor(options) {
    this.targetFile = options.targetFile;

    const config = this.readConfig(options.configPath);
    const packages = this.resolvePackages(config, options.envOverrides || {});

    console.log(
      'Distribution extensions:',
      packages.length > 0 ? packages.map((p) => `${p.name}${p.local ? ' (local)' : ''}`) : '(none)',
    );

    const content = this.generateFileContent(packages, config.featureFlags || {});
    this.virtualModules = new VirtualModulesPlugin({
      [this.targetFile]: content,
    });
  }

  apply(compiler) {
    this.virtualModules.apply(compiler);
  }

  readConfig(configPath) {
    const raw = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(raw);
    if (!config || typeof config !== 'object') {
      throw new Error(`distribution.yaml at ${configPath} is empty or not a valid YAML object`);
    }
    return config;
  }

  validatePackageRef(entry) {
    const PKG_NAME = /^@?[\w-]+(\/[\w.-]+)*$/;
    if (!entry.name) {
      throw new Error('Entry in distribution.yaml is missing required "name" field');
    }
    if (!PKG_NAME.test(entry.name)) {
      throw new Error(`Invalid name in distribution config: "${entry.name}"`);
    }
    if (entry.local) {
      const normalized = path.normalize(entry.extensionsPath || '');
      if (normalized.startsWith('..')) {
        throw new Error(
          `Local extensionsPath for "${entry.name}" must resolve within the distribution directory — got "${entry.extensionsPath}"`,
        );
      }
    } else {
      const path = entry.extensionsPath.replace(/^\.\//, '');
      if (!PKG_NAME.test(path)) {
        throw new Error(
          `Invalid extensionsPath in distribution config for "${entry.name}": "${entry.extensionsPath}"`,
        );
      }
    }
  }

  resolvePackages(config, envOverrides) {
    const entries = [];

    // Add local extensions from distribution.yaml
    const local = config.packages?.local || [];
    for (const entry of local) {
      if (entry && typeof entry === 'object') {
        const resolved = {
          name: entry.name,
          extensionsPath: entry.extensionsPath,
          featureFlags: entry.featureFlags,
          local: true,
        };
        this.validatePackageRef(resolved);
        entries.push(resolved);
      }
    }

    // Add bundled packages from distribution.yaml
    const bundled = config.packages?.bundled || [];
    for (const entry of bundled) {
      let resolved;
      if (typeof entry === 'string') {
        resolved = { name: entry, extensionsPath: './extensions', local: false };
      } else if (entry && typeof entry === 'object') {
        resolved = {
          name: entry.package,
          extensionsPath: entry.extensionsPath || './extensions',
          featureFlags: entry.featureFlags,
          local: false,
        };
      }
      if (resolved) {
        this.validatePackageRef(resolved);
        entries.push(resolved);
      }
    }

    // Check env var overrides
    for (const [envVar, pkgConfig] of Object.entries(envOverrides)) {
      if (process.env[envVar] === 'true') {
        const resolved = {
          name: pkgConfig.package,
          extensionsPath: pkgConfig.extensionsPath || './extensions',
          featureFlags: pkgConfig.featureFlags,
          local: false,
        };
        this.validatePackageRef(resolved);
        entries.push(resolved);
      }
    }

    // Deduplicate by name — last occurrence wins (env overrides take precedence)
    const seen = new Map();
    for (const entry of entries) {
      seen.set(entry.name, entry);
    }
    return [...seen.values()];
  }

  generateFileContent(packages, configFeatureFlags) {
    // Merge feature flags from config + packages
    const allFlags = { ...configFeatureFlags };
    for (const pkg of packages) {
      if (pkg.featureFlags) {
        Object.assign(allFlags, pkg.featureFlags);
      }
    }

    if (packages.length === 0) {
      return `import type { Extension } from '@openshift/dynamic-plugin-sdk';

const pluginExtensions: Record<string, Extension[]> = {};

export const featureFlags: Record<string, boolean> = ${JSON.stringify(allFlags)};

export default pluginExtensions;
`;
    }

    const imports = packages
      .map((pkg, i) => {
        const from = pkg.local
          ? pkg.extensionsPath
          : `${pkg.name}/${pkg.extensionsPath.replace(/^\.\//, '')}`;
        return `import extensions${i} from '${from}';`;
      })
      .join('\n');

    const entries = packages.map((pkg, i) => `  '${pkg.name}': extensions${i}`).join(',\n');

    return `import type { Extension } from '@openshift/dynamic-plugin-sdk';
${imports}

const pluginExtensions: Record<string, Extension[]> = {
${entries},
};

export const featureFlags: Record<string, boolean> = ${JSON.stringify(allFlags)};

export default pluginExtensions;
`;
  }
}

module.exports = GenerateDistributionExtensionsPlugin;
