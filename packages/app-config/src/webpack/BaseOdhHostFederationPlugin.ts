const { sharedPluginModules, getSharedModuleMetadata } = require('./shared-modules-meta.ts');
const { getRuntimeOdhPackages } = require('./getRuntimeOdhPackages.ts');

export type SharedModuleConfig = Record<string, unknown>;

export type OdhHostFederationPluginOptions = {
  packageJson: { dependencies?: Record<string, string> };
  remotes?: Record<string, string>;
  dts?: boolean;
  shared?: Record<string, SharedModuleConfig>;
};

export type HostModuleFederationConfig = {
  name: string;
  filename: string;
  remotes?: Record<string, string>;
  shared: Record<string, SharedModuleConfig>;
  exposes: Record<string, string>;
  dts?: boolean;
  runtime?: false | string;
};

export type ModuleFederationPluginClass<TCompiler> = new (config: HostModuleFederationConfig) => {
  // eslint-disable-next-line @typescript-eslint/method-signature-style
  apply(compiler: TCompiler): void;
};

/**
 * Shared host Module Federation logic. Bundler-specific subclasses return their
 * ModuleFederationPlugin class (webpack or rspack) via {@link getModuleFederationPlugin}.
 */
abstract class BaseOdhHostFederationPlugin<TCompiler> {
  private options: OdhHostFederationPluginOptions;

  constructor(options: OdhHostFederationPluginOptions) {
    this.options = options;
  }

  protected abstract getModuleFederationPlugin(): ModuleFederationPluginClass<TCompiler>;

  apply(compiler: TCompiler): void {
    const { packageJson, remotes, dts, shared: additionalShared } = this.options;
    const deps = packageJson.dependencies ?? {};

    const shared: Record<string, SharedModuleConfig> = {};

    for (const moduleName of Object.keys(sharedPluginModules)) {
      if (!(moduleName in deps)) continue;
      const meta = getSharedModuleMetadata(moduleName);
      const requiredVersion = deps[moduleName];
      // Nested package.json files (e.g. dist/esm) often omit `version`, so MF cannot
      // auto-detect it. Read the installed version from the package root.
      let version: string | undefined;
      try {
        const installed = require(`${moduleName}/package.json`).version;
        version = typeof installed === 'string' ? installed : undefined;
      } catch {
        version = requiredVersion.replace(/^[\^~]/, '');
      }
      shared[moduleName] = {
        singleton: meta.singleton,
        requiredVersion,
        ...(version && { version }),
        ...(meta.eager && { eager: true }),
      };
    }

    // Packages that carry React context or stateful singletons across Module Federation
    // boundaries must be eager so rspack registers them in its shared scope before any
    // webpack remote (which uses import:false) loads and requests them.
    const EAGER_ODH_SINGLETONS = new Set([
      '@odh-dashboard/plugin-core',
      '@odh-dashboard/ui-core',
      '@odh-dashboard/internal',
      '@odh-dashboard/k8s-core',
    ]);

    const { all: odhPackages } = getRuntimeOdhPackages();
    for (const pkgName of odhPackages) {
      shared[pkgName] = {
        singleton: true,
        requiredVersion: '*',
        ...(EAGER_ODH_SINGLETONS.has(pkgName) && { eager: true }),
      };
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

module.exports = {
  BaseOdhHostFederationPlugin,
};
