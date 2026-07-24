import * as fs from 'fs';
import * as path from 'path';
import type { Compiler, WebpackPluginInstance } from 'webpack';
import {
  sharedPluginModules,
  getSharedModuleMetadata,
  patternFlyCssPackages,
} from './shared-modules-meta';
import { getRuntimeOdhPackages } from './getRuntimeOdhPackages';

export type SharedModuleConfig = Record<string, unknown>;

export type OdhRemoteFederationPluginOptions = {
  name: string;
  packageJson: { dependencies?: Record<string, string> };
  exposes: Record<string, string>;
  filename?: string;
  additionalShared?: Record<string, SharedModuleConfig>;
  dts?: boolean;
};

/**
 * Remote webpack plugin that registers ModuleFederationPlugin with:
 * - Forced shared modules (import: false — consumed from host)
 * - PatternFly CSS resolve aliases (→ false, host owns CSS)
 * - runtime: false
 *
 * Usage:
 *   new OdhRemoteFederationPlugin({ name: 'maas', packageJson, exposes })
 */
export class OdhRemoteFederationPlugin implements WebpackPluginInstance {
  private options: OdhRemoteFederationPluginOptions;

  constructor(options: OdhRemoteFederationPluginOptions) {
    this.options = options;
  }

  apply(compiler: Compiler): void {
    const { name, packageJson, exposes, filename, additionalShared, dts } = this.options;
    const deps = packageJson.dependencies ?? {};
    // Track standalone to allow for imports due to modules not being in the monorepo
    const isStandalone = process.env.DEPLOYMENT_MODE === 'standalone';

    const shared: Record<string, SharedModuleConfig> = {};

    for (const moduleName of Object.keys(sharedPluginModules)) {
      const inDeps = moduleName in deps;
      if (!inDeps) continue;
      const meta = getSharedModuleMetadata(moduleName);

      shared[moduleName] = {
        singleton: meta.singleton,
        requiredVersion: deps[moduleName] ?? '*',
        ...(!isStandalone && !meta.allowFallback && { import: false }),
      };
    }

    const odhPackages = getRuntimeOdhPackages();
    for (const pkgName of odhPackages) {
      shared[pkgName] = {
        singleton: true,
        requiredVersion: '*',
        ...(!isStandalone && { import: false }),
      };
    }

    if (additionalShared) {
      for (const [key, config] of Object.entries(additionalShared)) {
        if (!(key in shared)) {
          shared[key] = config;
        }
      }
    }

    // PF CSS exclusion — alias individual .css files to false so remotes never
    // bundle PF styles, while keeping JS class-name-map modules resolvable.
    // Mirrors the approach used by the OpenShift Console's ConsoleRemotePlugin.
    // Skipped in standalone mode where no host provides styles.
    if (!isStandalone) {
      const aliases: Record<string, false> = {};
      for (const cssPkg of patternFlyCssPackages) {
        try {
          const pkgJsonPath = require.resolve(`${cssPkg}/package.json`);
          const pkgDir = path.dirname(pkgJsonPath);
          const entries: string[] = fs.readdirSync(pkgDir, { recursive: true }).map(String);
          for (const entry of entries) {
            if (entry.endsWith('.css')) {
              aliases[path.join(pkgDir, entry)] = false;
            }
          }
        } catch (e: unknown) {
          if (e && typeof e === 'object' && 'code' in e && e.code === 'MODULE_NOT_FOUND') {
            continue;
          }
          throw e;
        }
      }

      if (Object.keys(aliases).length > 0) {
        const existing = compiler.options.resolve.alias;
        const merged = Object.assign({}, ...(Array.isArray(existing) ? [] : [existing]), aliases);
        // eslint-disable-next-line no-param-reassign
        compiler.options.resolve.alias = merged;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');
    new ModuleFederationPlugin({
      name,
      filename: filename ?? 'remoteEntry.js',
      exposes,
      shared,
      runtime: false,
      ...(dts !== undefined && { dts }),
    }).apply(compiler);
  }
}
