const { sharedPluginModules, getSharedModuleMetadata } = require('./shared-modules-meta.ts');
const {
  collectDependenciesFromContext,
  getRuntimeOdhPackages,
} = require('./getRuntimeOdhPackages.ts');

export type SharedModuleConfig = Record<string, unknown>;

export type FederationCompiler = {
  options: {
    context?: string;
  };
};

export type OdhFederationPluginOptions = {
  name: string;
  isHost: boolean;
  remotes?: Record<string, string>;
  exposes?: Record<string, string>;
  filename?: string;
  shared?: Record<string, SharedModuleConfig>;
  dts?: boolean;
};

export type ModuleFederationConfig = {
  name: string;
  filename: string;
  remotes?: Record<string, string>;
  shared: Record<string, SharedModuleConfig>;
  exposes: Record<string, string>;
  dts?: boolean;
  runtime?: false | string;
};

export type ModuleFederationPluginClass<TCompiler> = new (config: ModuleFederationConfig) => {
  // eslint-disable-next-line @typescript-eslint/method-signature-style
  apply(compiler: TCompiler): void;
};

/**
 * Shared Module Federation logic for host and remote builds. Bundler-specific
 * subclasses return their ModuleFederationPlugin class (webpack or rspack) via
 * {@link getModuleFederationPlugin}.
 *
 * - **Host** (`isHost: true`): eager must-share modules, `import: true` (bundled).
 * - **Remote** (`isHost: false`): `import: false` for must-share / host-provided
 *   modules.
 *
 * React / PatternFly / SDK versions come from `package.json` in webpack
 * `compiler.options.context`.
 */
abstract class BaseOdhFederationPlugin<TCompiler extends FederationCompiler> {
  private options: OdhFederationPluginOptions;

  constructor(options: OdhFederationPluginOptions) {
    this.options = options;
  }

  protected abstract getModuleFederationPlugin(): ModuleFederationPluginClass<TCompiler>;

  apply(compiler: TCompiler): void {
    const {
      name,
      isHost,
      remotes,
      exposes,
      filename,
      shared: additionalShared,
      dts,
    } = this.options;
    const deps = collectDependenciesFromContext(compiler.options.context ?? process.cwd());

    const shared: Record<string, SharedModuleConfig> = {};

    for (const moduleName of Object.keys(sharedPluginModules)) {
      if (!(moduleName in deps)) continue;
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
        ...(isHost && meta.eager && { eager: true }),
        ...(!isHost && !meta.allowFallback && { import: false }),
      };
    }

    const { all: odhPackages, hostProvided } = getRuntimeOdhPackages();
    for (const pkgName of odhPackages) {
      shared[pkgName] = {
        singleton: true,
        requiredVersion: '*',
        ...(!isHost && hostProvided.has(pkgName) && { import: false }),
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
    const config: ModuleFederationConfig = {
      name,
      filename: filename ?? 'remoteEntry.js',
      ...(remotes && { remotes }),
      shared,
      exposes: exposes ?? {},
      runtime: false,
      ...(dts !== undefined && { dts }),
    };
    new ModuleFederationPlugin(config).apply(compiler);
  }
}

module.exports = {
  BaseOdhFederationPlugin,
};
