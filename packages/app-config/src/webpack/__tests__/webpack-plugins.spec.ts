import type { SharedModuleMetadata } from '../shared-modules-meta.ts';
import type { RuntimeOdhPackages, WorkspacePackageInfo } from '../getRuntimeOdhPackages.ts';

const {
  sharedPluginModules,
  getSharedModuleMetadata,
  PF_REACT_ICONS_CREATE_ICON_MODULE,
  getPfReactIconsCreateIconSharedConfig,
} = require('../shared-modules-meta.ts') as {
  sharedPluginModules: Record<string, Partial<SharedModuleMetadata>>;
  getSharedModuleMetadata: (moduleName: string) => SharedModuleMetadata;
  PF_REACT_ICONS_CREATE_ICON_MODULE: string;
  getPfReactIconsCreateIconSharedConfig: (requiredVersion: string) => Record<string, unknown>;
};
const { getRuntimeOdhPackages } = require('../getRuntimeOdhPackages.ts') as {
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

describe('getPfReactIconsCreateIconSharedConfig', () => {
  const concreteSemver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

  it('returns singleton sharing metadata for the createIcon deep import', () => {
    const config = getPfReactIconsCreateIconSharedConfig('^6.4.0');
    expect(PF_REACT_ICONS_CREATE_ICON_MODULE).toBe('@patternfly/react-icons/dist/esm/createIcon');
    expect(config.singleton).toBe(true);
    expect(config.requiredVersion).toBe('^6.4.0');
    if (config.version !== undefined) {
      expect(config.version).toEqual(expect.stringMatching(concreteSemver));
    }
  });

  it('omits version when package metadata cannot be loaded', () => {
    jest.isolateModules(() => {
      jest.doMock('@patternfly/react-icons/package.json', () => {
        throw new Error('Cannot find module');
      });
      const { getPfReactIconsCreateIconSharedConfig: getConfig } =
        require('../shared-modules-meta.ts') as {
          getPfReactIconsCreateIconSharedConfig: (
            requiredVersion: string,
          ) => Record<string, unknown>;
        };
      const config = getConfig('^6.4.0');
      expect(config).toEqual({
        singleton: true,
        requiredVersion: '^6.4.0',
      });
    });
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
