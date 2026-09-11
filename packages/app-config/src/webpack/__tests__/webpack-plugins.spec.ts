import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { SharedModuleMetadata } from '../shared-modules-meta.ts';
import type { RuntimeOdhPackages, WorkspacePackageInfo } from '../getRuntimeOdhPackages.ts';

const { sharedPluginModules, getSharedModuleMetadata } = require('../shared-modules-meta.ts') as {
  sharedPluginModules: Record<string, Partial<SharedModuleMetadata>>;
  getSharedModuleMetadata: (moduleName: string) => SharedModuleMetadata;
};
const { collectDependenciesFromContext, getRuntimeOdhPackages } =
  require('../getRuntimeOdhPackages.ts') as {
    collectDependenciesFromContext: (startDir: string) => Record<string, string>;
    getRuntimeOdhPackages: (packages?: WorkspacePackageInfo[]) => RuntimeOdhPackages;
  };

jest.mock('child_process', () => ({
  execFileSync: jest.fn(() =>
    JSON.stringify([
      {
        name: 'odh-dashboard-frontend',
        dependencies: {
          '@odh-dashboard/internal': '*',
          '@odh-dashboard/plugin-core': '*',
          '@odh-dashboard/ui-core': '*',
        },
      },
      {
        name: '@odh-dashboard/internal',
        dependencies: { '@odh-dashboard/k8s-core': '*' },
        exports: { './extensions': './extensions.ts' },
      },
      {
        name: '@odh-dashboard/plugin-core',
        dependencies: { '@odh-dashboard/internal': '*' },
      },
      {
        name: '@odh-dashboard/ui-core',
        dependencies: {},
      },
      {
        name: '@odh-dashboard/k8s-core',
        dependencies: {},
      },
      {
        name: '@odh-dashboard/maas',
        'module-federation': { name: 'maas' },
        dependencies: { '@odh-dashboard/gen-ai': '*', '@odh-dashboard/llmd-serving': '*' },
      },
      {
        name: '@odh-dashboard/gen-ai',
        'module-federation': { name: 'genAi' },
        dependencies: {},
      },
      {
        // Built into the host via virtual plugin-extensions, not a host dep / not federated.
        name: '@odh-dashboard/kserve',
        exports: { './extensions': './extensions.ts' },
        dependencies: { '@odh-dashboard/plugin-core': '*' },
      },
      {
        // Host-provided via ./extensions; also a dep of a federated remote.
        name: '@odh-dashboard/llmd-serving',
        exports: { './extensions': './extensions.ts' },
        dependencies: {},
      },
      {
        name: '@odh-dashboard/eslint-config',
        devDependencies: {},
      },
    ]),
  ),
}));

describe('getSharedModuleMetadata', () => {
  it('returns complete defaults for a module not in the map', () => {
    const meta = getSharedModuleMetadata('not-in-the-map');
    expect(meta).toEqual({ singleton: true, allowFallback: true, eager: false });
  });

  it('applies overrides without losing unoverridden defaults', () => {
    // Deterministic known entry: overrides eager + allowFallback; singleton stays default.
    const name = 'react';
    const overrides = sharedPluginModules[name];
    expect(overrides).toEqual({ eager: true, allowFallback: false });

    const meta = getSharedModuleMetadata(name);
    expect(meta.eager).toBe(true);
    expect(meta.allowFallback).toBe(false);
    expect(meta.singleton).toBe(true);
  });
});

describe('getRuntimeOdhPackages', () => {
  it('returns empty host deps when the host package is missing from the workspace', () => {
    const { all, hostProvided } = getRuntimeOdhPackages([
      { name: '@odh-dashboard/internal', dependencies: {} },
    ]);

    expect(hostProvided.size).toBe(0);
    expect(all.size).toBe(0);
  });

  it('marks host transitive deps as host-provided', () => {
    const { all, hostProvided } = getRuntimeOdhPackages();

    for (const name of [
      '@odh-dashboard/internal',
      '@odh-dashboard/plugin-core',
      '@odh-dashboard/ui-core',
      '@odh-dashboard/k8s-core',
    ]) {
      expect(all.has(name)).toBe(true);
      expect(hostProvided.has(name)).toBe(true);
    }
  });

  it('marks ./extensions packages as host-provided even when not a host dep', () => {
    const { all, hostProvided } = getRuntimeOdhPackages();

    expect(all.has('@odh-dashboard/kserve')).toBe(true);
    expect(hostProvided.has('@odh-dashboard/kserve')).toBe(true);
    expect(all.has('@odh-dashboard/llmd-serving')).toBe(true);
    expect(hostProvided.has('@odh-dashboard/llmd-serving')).toBe(true);
  });

  it('includes federated modules in all but not hostProvided when host cannot own them', () => {
    const { all, hostProvided } = getRuntimeOdhPackages();

    expect(all.has('@odh-dashboard/maas')).toBe(true);
    expect(all.has('@odh-dashboard/gen-ai')).toBe(true);
    expect(hostProvided.has('@odh-dashboard/maas')).toBe(false);
    expect(hostProvided.has('@odh-dashboard/gen-ai')).toBe(false);
  });

  it('excludes non-odh packages and dev-only packages', () => {
    const { all } = getRuntimeOdhPackages();

    expect(all.has('@odh-dashboard/eslint-config')).toBe(false);
  });
});

describe('collectDependenciesFromContext', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'odh-mf-deps-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('should return dependencies from the package.json in the given directory', () => {
    fs.writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({
        dependencies: { react: '^18.3.1', '@patternfly/react-core': '~6.5.1' },
      }),
    );

    expect(collectDependenciesFromContext(root)).toEqual({
      react: '^18.3.1',
      '@patternfly/react-core': '~6.5.1',
    });
  });

  it('should not include parent package.json dependencies', () => {
    fs.writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({ dependencies: { '@odh-dashboard/internal': '*' } }),
    );
    const frontendDir = path.join(root, 'frontend');
    fs.mkdirSync(frontendDir);
    fs.writeFileSync(
      path.join(frontendDir, 'package.json'),
      JSON.stringify({ dependencies: { react: '^18.3.1' } }),
    );

    expect(collectDependenciesFromContext(frontendDir)).toEqual({ react: '^18.3.1' });
  });

  it('should return an empty object when package.json has no dependencies key', () => {
    fs.writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({ name: 'test', devDependencies: { foo: '1.0.0' } }),
    );

    expect(collectDependenciesFromContext(root)).toEqual({});
  });

  it('should return an empty object when no package.json exists', () => {
    const empty = path.join(root, 'empty');
    fs.mkdirSync(empty);

    expect(collectDependenciesFromContext(empty)).toEqual({});
  });
});

describe('OdhFederationPlugin share policy', () => {
  const { BaseOdhFederationPlugin } = require('../BaseOdhFederationPlugin.ts') as {
    BaseOdhFederationPlugin: new (options: {
      name: string;
      isHost: boolean;
      remotes?: Record<string, string>;
      exposes?: Record<string, string>;
      filename?: string;
      shared?: Record<string, Record<string, unknown>>;
    }) => {
      apply: (compiler: { options: { context?: string } }) => void;
    };
  };

  type MfConfig = {
    name: string;
    filename: string;
    remotes?: Record<string, string>;
    shared: Record<string, Record<string, unknown>>;
    exposes: Record<string, string>;
    runtime?: false | string;
  };

  let lastConfig: MfConfig | undefined;
  let root: string;

  class CapturePlugin extends BaseOdhFederationPlugin {
    protected getModuleFederationPlugin() {
      return class {
        constructor(config: MfConfig) {
          lastConfig = config;
        }

        apply(): void {
          /* capture only */
        }
      };
    }
  }

  beforeEach(() => {
    lastConfig = undefined;
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'odh-mf-plugin-'));
    fs.writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({
        dependencies: {
          react: '^18.3.1',
          '@patternfly/react-table': '~6.5.1',
        },
      }),
    );
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('eager-shares must-share modules and omits import: false when isHost', () => {
    new CapturePlugin({
      name: 'host',
      isHost: true,
      remotes: { maas: 'maas@http://localhost/remoteEntry.js' },
    }).apply({
      options: { context: root },
    });

    expect(lastConfig).toBeDefined();
    expect(lastConfig?.name).toBe('host');
    expect(lastConfig?.runtime).toBe(false);
    expect(lastConfig?.exposes).toEqual({});
    expect(lastConfig?.remotes).toEqual({ maas: 'maas@http://localhost/remoteEntry.js' });
    expect(lastConfig?.shared.react).toEqual(
      expect.objectContaining({ singleton: true, eager: true, requiredVersion: '^18.3.1' }),
    );
    expect(lastConfig?.shared.react.import).toBeUndefined();
    expect(lastConfig?.shared['react-dom']).toBeUndefined();
    expect(lastConfig?.shared['@odh-dashboard/internal'].import).toBeUndefined();
    expect(lastConfig?.shared['@patternfly/react-table'].eager).toBeUndefined();
  });

  it('sets import: false and runtime: false when not isHost', () => {
    new CapturePlugin({
      name: 'maas',
      isHost: false,
      exposes: { './extensions': './src/odh/extensions' },
    }).apply({ options: { context: root } });

    expect(lastConfig).toBeDefined();
    expect(lastConfig?.name).toBe('maas');
    expect(lastConfig?.filename).toBe('remoteEntry.js');
    expect(lastConfig?.runtime).toBe(false);
    expect(lastConfig?.exposes).toEqual({ './extensions': './src/odh/extensions' });
    expect(lastConfig?.remotes).toBeUndefined();
    expect(lastConfig?.shared.react).toEqual(
      expect.objectContaining({ singleton: true, import: false, requiredVersion: '^18.3.1' }),
    );
    expect(lastConfig?.shared.react.eager).toBeUndefined();
    expect(lastConfig?.shared['react-dom']).toBeUndefined();
    expect(lastConfig?.shared['@odh-dashboard/internal']).toEqual(
      expect.objectContaining({ singleton: true, requiredVersion: '*', import: false }),
    );
    expect(lastConfig?.shared['@odh-dashboard/maas'].import).toBeUndefined();
    expect(lastConfig?.shared['@patternfly/react-table'].import).toBeUndefined();
  });

  it('plugin-computed shared entries take precedence over additionalShared', () => {
    new CapturePlugin({
      name: 'maas',
      isHost: false,
      exposes: { './extensions': './src/odh/extensions' },
      shared: {
        react: { singleton: false },
        'custom-lib': { singleton: true, requiredVersion: '^1.0.0' },
      },
    }).apply({ options: { context: root } });

    expect(lastConfig).toBeDefined();
    expect(lastConfig?.shared.react.singleton).toBe(true);
    expect(lastConfig?.shared['custom-lib']).toEqual({
      singleton: true,
      requiredVersion: '^1.0.0',
    });
  });
});
