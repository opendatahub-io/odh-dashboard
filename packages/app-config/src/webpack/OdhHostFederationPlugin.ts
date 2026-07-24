import type { Compiler, WebpackPluginInstance } from 'webpack';
import { sharedPluginModules, getSharedModuleMetadata } from './shared-modules-meta';
import { getRuntimeOdhPackages } from './getRuntimeOdhPackages';

export type SharedModuleConfig = Record<string, unknown>;

export type OdhHostFederationPluginOptions = {
  packageJson: { dependencies?: Record<string, string> };
  remotes?: Record<string, string>;
  dts?: boolean;
  additionalShared?: Record<string, SharedModuleConfig>;
};

/**
 * Host webpack plugin that registers ModuleFederationPlugin with the canonical
 * shared-module policy. The host never bundles PF CSS via remotes — it owns CSS.
 *
 * Usage:
 *   new OdhHostFederationPlugin({ packageJson: require('../package.json') })
 */
export class OdhHostFederationPlugin implements WebpackPluginInstance {
  private options: OdhHostFederationPluginOptions;

  constructor(options: OdhHostFederationPluginOptions) {
    this.options = options;
  }

  apply(compiler: Compiler): void {
    const { packageJson, remotes, dts, additionalShared } = this.options;
    const deps = packageJson.dependencies ?? {};

    const shared: Record<string, SharedModuleConfig> = {};

    for (const moduleName of Object.keys(sharedPluginModules)) {
      if (!(moduleName in deps)) continue;
      const meta = getSharedModuleMetadata(moduleName);
      shared[moduleName] = {
        singleton: meta.singleton,
        requiredVersion: deps[moduleName],
        ...(meta.eager && { eager: true }),
      };
    }

    const odhPackages = getRuntimeOdhPackages();
    for (const name of odhPackages) {
      shared[name] = { singleton: true, requiredVersion: '*' };
    }

    if (additionalShared) {
      for (const [key, config] of Object.entries(additionalShared)) {
        if (!(key in shared)) {
          shared[key] = config;
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');
    new ModuleFederationPlugin({
      name: 'host',
      filename: 'remoteEntry.js',
      remotes,
      shared,
      exposes: {},
      ...(dts !== undefined && { dts }),
    }).apply(compiler);
  }
}
