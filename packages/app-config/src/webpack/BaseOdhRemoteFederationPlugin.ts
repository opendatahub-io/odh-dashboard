import type {
  HostModuleFederationConfig,
  ModuleFederationPluginClass,
  SharedModuleConfig,
} from './BaseOdhHostFederationPlugin.ts';

const { sharedPluginModules, getSharedModuleMetadata } = require('./shared-modules-meta.ts');
const { getRuntimeOdhPackages } = require('./getRuntimeOdhPackages.ts');

export type { SharedModuleConfig };

export type OdhRemoteFederationPluginOptions = {
  name: string;
  packageJson: { dependencies?: Record<string, string> };
  exposes: Record<string, string>;
  filename?: string;
  shared?: Record<string, SharedModuleConfig>;
  dts?: boolean;
};

/**
 * Shared remote Module Federation logic. Bundler-specific subclasses return their
 * ModuleFederationPlugin class (webpack or rspack) via {@link getModuleFederationPlugin}.
 *
 * - Forced shared modules (import: false — consumed from host when host-provided)
 * - runtime: false
 */
abstract class BaseOdhRemoteFederationPlugin<TCompiler> {
  private options: OdhRemoteFederationPluginOptions;

  constructor(options: OdhRemoteFederationPluginOptions) {
    this.options = options;
  }

  protected abstract getModuleFederationPlugin(): ModuleFederationPluginClass<TCompiler>;

  apply(compiler: TCompiler): void {
    const { name, packageJson, exposes, filename, shared: additionalShared, dts } = this.options;
    const deps = packageJson.dependencies ?? {};
    // Track standalone to allow for imports due to modules not being in the monorepo
    const isStandalone = process.env.DEPLOYMENT_MODE === 'standalone';

    const shared: Record<string, SharedModuleConfig> = {};

    for (const moduleName of Object.keys(sharedPluginModules)) {
      const inDeps = moduleName in deps;
      if (!inDeps) continue;
      const meta = getSharedModuleMetadata(moduleName);

      const requiredVersion = deps[moduleName] ?? '*';
      let version: string | undefined;
      try {
        const installed = require(`${moduleName}/package.json`).version;
        version = typeof installed === 'string' ? installed : undefined;
      } catch {
        version = requiredVersion === '*' ? undefined : requiredVersion.replace(/^[\^~]/, '');
      }
      shared[moduleName] = {
        singleton: meta.singleton,
        requiredVersion,
        ...(version && { version }),
        ...(!isStandalone && !meta.allowFallback && { import: false }),
      };
    }

    // Host-provided ODH packages: import: false. Federated-only packages stay
    // singletons but allow import/fallback — the host does not own them.
    // Standalone builds skip monorepo discovery (may run outside a checkout).
    if (!isStandalone) {
      const { all: odhPackages, hostProvided } = getRuntimeOdhPackages();
      for (const pkgName of odhPackages) {
        shared[pkgName] = {
          singleton: true,
          requiredVersion: '*',
          ...(hostProvided.has(pkgName) && { import: false }),
        };
      }
    }

    // Plugin-defined shared modules take precedence over additionalShared entries
    if (additionalShared) {
      for (const [key, config] of Object.entries(additionalShared)) {
        if (!(key in shared)) {
          shared[key] = config;
        }
      }
    }

    const ModuleFederationPlugin = this.getModuleFederationPlugin();
    const config: HostModuleFederationConfig = {
      name,
      filename: filename ?? 'remoteEntry.js',
      exposes,
      shared,
      runtime: false,
      ...(dts !== undefined && { dts }),
    };
    new ModuleFederationPlugin(config).apply(compiler);
  }
}

module.exports = {
  BaseOdhRemoteFederationPlugin,
};
