const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { rspack } = require('@rspack/core');

/**
 * Rspack plugin that reads a distribution.yaml config file and generates
 * a virtual module with extension imports for all declared packages.
 *
 * Follows the same pattern as frontend/config/generateExtensionsPlugin.js.
 * Uses rspack's built-in VirtualModulesPlugin so nothing is written to disk.
 *
 * @example
 * new GenerateDistributionExtensionsPlugin({
 *   configPath: path.resolve(__dirname, '../distribution.yaml'),
 *   targetFile: path.join(SRC_DIR, 'distribution-extensions.ts'),
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
    this.packages = this.resolvePackages(config, options.envOverrides || {});
    this.configFeatureFlags = config.featureFlags || {};

    console.log(
      'Distribution extensions:',
      this.packages.length > 0
        ? this.packages.map((p) => `${p.name}${p.local ? ' (local)' : ''}`)
        : '(none)',
    );
  }

  apply(compiler) {
    const relativePath = path.relative(compiler.context, this.targetFile);
    const content = this.generateFileContent(this.packages, this.configFeatureFlags);

    new rspack.experiments.VirtualModulesPlugin({
      [relativePath]: content,
    }).apply(compiler);
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
      if (typeof entry.extensionsPath !== 'string' || entry.extensionsPath.length === 0) {
        throw new Error(
          `Local entry for "${entry.name}" is missing required "extensionsPath" field`,
        );
      }
      const normalized = path.normalize(entry.extensionsPath);
      if (
        path.isAbsolute(normalized) ||
        normalized === '..' ||
        normalized.startsWith(`..${path.sep}`)
      ) {
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

    // Bundled packages first (lowest precedence)
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

    // Local extensions second (distribution overrides)
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

    // Env-injected packages last (highest precedence)
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

    // Deduplicate by name — last occurrence wins for both content and list position
    // (so env-injected packages stay after uniquely named local packages).
    const lastIndexByName = new Map();
    entries.forEach((entry, index) => {
      lastIndexByName.set(entry.name, index);
    });
    return entries.filter((entry, index) => lastIndexByName.get(entry.name) === index);
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
        return `import extensions${i} from ${JSON.stringify(from)};`;
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
